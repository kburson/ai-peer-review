#include <windows.h>
#include <aclapi.h>
#include <process.h>
#include <sddl.h>

#include <cstring>
#include <cstdint>
#include <string>
#include <vector>

namespace broker_security {
namespace {
struct Directory { HANDLE handle; std::wstring path; BY_HANDLE_FILE_INFORMATION identity; };
struct Lock { HANDLE handle; std::wstring path; BY_HANDLE_FILE_INFORMATION identity; };
struct Endpoint { HANDLE handle; std::wstring path; };
struct Connection { HANDLE handle; bool server_side; bool fenced; unsigned client_writes = 0; };
struct PipeReadRequest { HANDLE handle; std::vector<unsigned char> bytes; LONG references; };
struct PipeWriteRequest { HANDLE handle; std::vector<unsigned char> bytes; HANDLE written; bool flush; };
constexpr DWORD kIpcTimeoutMilliseconds = 5000;
constexpr DWORD kCommandReplyTimeoutMilliseconds = 30000;

bool Fail(std::string* code, std::string* message, const char* stable, const char* text) {
  *code = stable;
  *message = text;
  return false;
}

std::wstring Wide(const std::string& input) {
  const int size = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, input.data(), static_cast<int>(input.size()), nullptr, 0);
  if (size <= 0) return {};
  std::wstring output(size, L'\0');
  MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, input.data(), static_cast<int>(input.size()), output.data(), size);
  return output;
}

std::string Utf8(const std::wstring& input) {
  const int size = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, input.data(), static_cast<int>(input.size()), nullptr, 0, nullptr, nullptr);
  if (size <= 0) return {};
  std::string output(size, '\0');
  WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, input.data(), static_cast<int>(input.size()), output.data(), size, nullptr, nullptr);
  return output;
}

bool Same(const BY_HANDLE_FILE_INFORMATION& left, const BY_HANDLE_FILE_INFORMATION& right) {
  return left.dwVolumeSerialNumber == right.dwVolumeSerialNumber &&
         left.nFileIndexHigh == right.nFileIndexHigh && left.nFileIndexLow == right.nFileIndexLow;
}

bool Info(HANDLE handle, BY_HANDLE_FILE_INFORMATION* value) {
  return handle != INVALID_HANDLE_VALUE && GetFileInformationByHandle(handle, value) != 0;
}

std::wstring Join(const std::wstring& parent, const std::string& child) {
  if (child.empty() || child == "." || child == ".." || child.find('/') != std::string::npos || child.find('\\') != std::string::npos) return {};
  return parent + L"\\" + Wide(child);
}

bool CurrentSidBytes(std::vector<unsigned char>* bytes, std::string* code, std::string* message) {
  HANDLE token = nullptr;
  if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token)) {
    return Fail(code, message, "APR_BROKER_AUTH_FAILED", "Current process token is unavailable.");
  }
  DWORD size = 0;
  GetTokenInformation(token, TokenUser, nullptr, 0, &size);
  bytes->resize(size);
  if (!GetTokenInformation(token, TokenUser, bytes->data(), size, &size)) {
    CloseHandle(token);
    return Fail(code, message, "APR_BROKER_AUTH_FAILED", "Current user SID is unavailable.");
  }
  CloseHandle(token);
  return true;
}

std::string CurrentSid(std::string* code, std::string* message) {
  std::vector<unsigned char> bytes;
  if (!CurrentSidBytes(&bytes, code, message)) return {};
  LPSTR sid = nullptr;
  if (!ConvertSidToStringSidA(reinterpret_cast<TOKEN_USER*>(bytes.data())->User.Sid, &sid)) {
    Fail(code, message, "APR_BROKER_AUTH_FAILED", "Current user SID cannot be encoded.");
    return {};
  }
  std::string result(sid);
  LocalFree(sid);
  return result;
}

bool OwnerAttributes(SECURITY_ATTRIBUTES* attributes, PSECURITY_DESCRIPTOR* descriptor,
                     std::string* code, std::string* message) {
  const std::string sid = CurrentSid(code, message);
  if (!code->empty()) return false;
  const std::string sddl = "O:" + sid + "D:P(A;;GA;;;" + sid + ")";
  if (!ConvertStringSecurityDescriptorToSecurityDescriptorA(
        sddl.c_str(), SDDL_REVISION_1, descriptor, nullptr)) {
    return Fail(code, message, "APR_BROKER_STALE", "Owner-only security cannot be constructed.");
  }
  *attributes = {sizeof(SECURITY_ATTRIBUTES), *descriptor, FALSE};
  return true;
}

bool OwnerOnly(HANDLE handle) {
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  PSID owner = nullptr;
  PACL dacl = nullptr;
  const DWORD observed = GetSecurityInfo(
    handle, SE_FILE_OBJECT, OWNER_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION,
    &owner, nullptr, &dacl, nullptr, &descriptor);
  if (observed != ERROR_SUCCESS || descriptor == nullptr || owner == nullptr || dacl == nullptr) {
    if (descriptor != nullptr) LocalFree(descriptor);
    return false;
  }
  std::vector<unsigned char> current;
  std::string code, message;
  bool valid = CurrentSidBytes(&current, &code, &message) &&
               EqualSid(owner, reinterpret_cast<TOKEN_USER*>(current.data())->User.Sid);
  SECURITY_DESCRIPTOR_CONTROL control = 0;
  DWORD revision = 0;
  valid = valid && GetSecurityDescriptorControl(descriptor, &control, &revision) &&
          (control & SE_DACL_PROTECTED) != 0;
  ACL_SIZE_INFORMATION information {};
  valid = valid && GetAclInformation(
    dacl, &information, sizeof(information), AclSizeInformation) &&
    information.AceCount == 1;
  void* raw = nullptr;
  valid = valid && GetAce(dacl, 0, &raw) != 0;
  if (valid) {
    auto* header = static_cast<ACE_HEADER*>(raw);
    auto* ace = reinterpret_cast<ACCESS_ALLOWED_ACE*>(raw);
    valid = header->AceType == ACCESS_ALLOWED_ACE_TYPE &&
            EqualSid(&ace->SidStart, reinterpret_cast<TOKEN_USER*>(current.data())->User.Sid) &&
            ((ace->Mask & GENERIC_ALL) != 0 || (ace->Mask & FILE_ALL_ACCESS) == FILE_ALL_ACCESS);
  }
  LocalFree(descriptor);
  return valid;
}

bool WriteAll(HANDLE handle, const std::vector<unsigned char>& bytes) {
  DWORD offset = 0;
  while (offset < bytes.size()) {
    DWORD count = 0;
    if (!WriteFile(handle, bytes.data() + offset, static_cast<DWORD>(bytes.size() - offset), &count, nullptr) || count == 0) return false;
    offset += count;
  }
  return FlushFileBuffers(handle) != 0;
}

bool ReadAll(HANDLE handle, std::vector<unsigned char>* bytes) {
  LARGE_INTEGER size {};
  if (!GetFileSizeEx(handle, &size) || size.QuadPart < 0 || size.QuadPart > 1024 * 1024) return false;
  bytes->resize(static_cast<size_t>(size.QuadPart));
  DWORD offset = 0;
  while (offset < bytes->size()) {
    DWORD count = 0;
    if (!ReadFile(handle, bytes->data() + offset, static_cast<DWORD>(bytes->size() - offset), &count, nullptr) || count == 0) return false;
    offset += count;
  }
  return true;
}

void ReleasePipeRead(PipeReadRequest* request) {
  if (InterlockedDecrement(&request->references) == 0) delete request;
}

unsigned __stdcall ReadPipeThread(void* value) {
  auto* request = static_cast<PipeReadRequest*>(value);
  size_t offset = 0;
  bool complete = true;
  while (offset < request->bytes.size()) {
    DWORD count = 0;
    if (!ReadFile(
          request->handle,
          request->bytes.data() + offset,
          static_cast<DWORD>(request->bytes.size() - offset),
          &count,
          nullptr) || count == 0) {
      complete = false;
      break;
    }
    offset += count;
  }
  CloseHandle(request->handle);
  ReleasePipeRead(request);
  return complete ? ERROR_SUCCESS : ERROR_READ_FAULT;
}

bool ReadExact(HANDLE handle, unsigned char* bytes, size_t size, DWORD timeout,
               bool* timed_out) {
  *timed_out = false;
  HANDLE duplicate = INVALID_HANDLE_VALUE;
  if (!DuplicateHandle(
        GetCurrentProcess(), handle, GetCurrentProcess(), &duplicate,
        0, FALSE, DUPLICATE_SAME_ACCESS)) return false;
  auto* request = new PipeReadRequest{duplicate, std::vector<unsigned char>(size), 2};
  HANDLE thread = reinterpret_cast<HANDLE>(
    _beginthreadex(nullptr, 0, ReadPipeThread, request, 0, nullptr));
  if (thread == nullptr) {
    CloseHandle(duplicate);
    delete request;
    return false;
  }
  DWORD wait = WaitForSingleObject(thread, timeout);
  if (wait == WAIT_TIMEOUT) {
    *timed_out = true;
    CancelSynchronousIo(thread);
    wait = WaitForSingleObject(thread, 1000);
  }
  DWORD result = ERROR_READ_FAULT;
  const bool complete = wait == WAIT_OBJECT_0 &&
                        GetExitCodeThread(thread, &result) != 0 &&
                        result == ERROR_SUCCESS;
  if (complete && size > 0) std::memcpy(bytes, request->bytes.data(), size);
  CloseHandle(thread);
  ReleasePipeRead(request);
  return complete;
}

unsigned __stdcall WritePipeThread(void* value) {
  auto* request = static_cast<PipeWriteRequest*>(value);
  size_t offset = 0;
  bool complete = true;
  while (offset < request->bytes.size()) {
    DWORD count = 0;
    if (!WriteFile(
          request->handle,
          request->bytes.data() + offset,
          static_cast<DWORD>(request->bytes.size() - offset),
          &count,
          nullptr) || count == 0) {
      complete = false;
      break;
    }
    offset += count;
  }
  if (complete && request->written != nullptr) SetEvent(request->written);
  if (request->written != nullptr) CloseHandle(request->written);
  if (complete && request->flush && !FlushFileBuffers(request->handle)) complete = false;
  CloseHandle(request->handle);
  delete request;
  return complete ? ERROR_SUCCESS : ERROR_WRITE_FAULT;
}

bool WritePipeBounded(HANDLE handle, const std::vector<unsigned char>& bytes, bool flush) {
  HANDLE duplicate = INVALID_HANDLE_VALUE;
  if (!DuplicateHandle(
        GetCurrentProcess(), handle, GetCurrentProcess(), &duplicate,
        0, FALSE, DUPLICATE_SAME_ACCESS)) return false;
  auto* request = new PipeWriteRequest{duplicate, bytes, nullptr, flush};
  HANDLE thread = reinterpret_cast<HANDLE>(
    _beginthreadex(nullptr, 0, WritePipeThread, request, 0, nullptr));
  if (thread == nullptr) {
    CloseHandle(duplicate);
    delete request;
    return false;
  }
  DWORD wait = WaitForSingleObject(thread, kIpcTimeoutMilliseconds);
  if (wait == WAIT_TIMEOUT) {
    CancelSynchronousIo(thread);
    wait = WaitForSingleObject(thread, 1000);
  }
  DWORD result = ERROR_WRITE_FAULT;
  const bool complete = wait == WAIT_OBJECT_0 &&
                        GetExitCodeThread(thread, &result) != 0 &&
                        result == ERROR_SUCCESS;
  CloseHandle(thread);
  return complete;
}

unsigned __stdcall SupervisePipeWrite(void* value) {
  HANDLE thread = static_cast<HANDLE>(value);
  DWORD wait = WaitForSingleObject(thread, kIpcTimeoutMilliseconds);
  if (wait == WAIT_TIMEOUT) {
    CancelSynchronousIo(thread);
    WaitForSingleObject(thread, 1000);
  }
  CloseHandle(thread);
  return ERROR_SUCCESS;
}

bool WriteServerReply(HANDLE handle, const std::vector<unsigned char>& bytes) {
  // A server flush waits for the client to consume the reply. Signal once the
  // write is complete, then retain the duplicate until bounded draining ends.
  HANDLE duplicate = INVALID_HANDLE_VALUE;
  HANDLE written = CreateEventW(nullptr, TRUE, FALSE, nullptr);
  HANDLE worker_event = nullptr;
  if (written == nullptr ||
      !DuplicateHandle(
        GetCurrentProcess(), handle, GetCurrentProcess(), &duplicate,
        0, FALSE, DUPLICATE_SAME_ACCESS) ||
      !DuplicateHandle(
        GetCurrentProcess(), written, GetCurrentProcess(), &worker_event,
        0, FALSE, DUPLICATE_SAME_ACCESS)) {
    if (written != nullptr) CloseHandle(written);
    if (duplicate != INVALID_HANDLE_VALUE) CloseHandle(duplicate);
    return false;
  }
  auto* request = new PipeWriteRequest{duplicate, bytes, worker_event, true};
  HANDLE thread = reinterpret_cast<HANDLE>(
    _beginthreadex(nullptr, 0, WritePipeThread, request, 0, nullptr));
  if (thread == nullptr) {
    CloseHandle(worker_event);
    CloseHandle(duplicate);
    CloseHandle(written);
    delete request;
    return false;
  }
  HANDLE supervised = nullptr;
  if (!DuplicateHandle(
        GetCurrentProcess(), thread, GetCurrentProcess(), &supervised,
        0, FALSE, DUPLICATE_SAME_ACCESS)) {
    CancelSynchronousIo(thread);
    WaitForSingleObject(thread, 1000);
    CloseHandle(thread);
    CloseHandle(written);
    return false;
  }
  HANDLE supervisor = reinterpret_cast<HANDLE>(
    _beginthreadex(nullptr, 0, SupervisePipeWrite, supervised, 0, nullptr));
  if (supervisor == nullptr) {
    CloseHandle(supervised);
    CancelSynchronousIo(thread);
    WaitForSingleObject(thread, 1000);
    CloseHandle(thread);
    CloseHandle(written);
    return false;
  }
  CloseHandle(supervisor);
  HANDLE observed[] = {written, thread};
  const DWORD wait = WaitForMultipleObjects(
    2, observed, FALSE, kIpcTimeoutMilliseconds);
  CloseHandle(thread);
  CloseHandle(written);
  return wait == WAIT_OBJECT_0;
}

void FenceConnection(Connection* connection) {
  connection->fenced = true;
  CancelIoEx(connection->handle, nullptr);
  if (connection->server_side) DisconnectNamedPipe(connection->handle);
}

HANDLE CreateOwnerPipe(const std::wstring& path, bool first,
                       std::string* code, std::string* message) {
  SECURITY_ATTRIBUTES attributes {};
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  if (!OwnerAttributes(&attributes, &descriptor, code, message)) return INVALID_HANDLE_VALUE;
  const DWORD mode = PIPE_ACCESS_DUPLEX | (first ? FILE_FLAG_FIRST_PIPE_INSTANCE : 0);
  HANDLE handle = CreateNamedPipeW(
    path.c_str(), mode,
    PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
    16, 65540, 65540, kIpcTimeoutMilliseconds, &attributes);
  const DWORD createError = handle == INVALID_HANDLE_VALUE ? GetLastError() : ERROR_SUCCESS;
  LocalFree(descriptor);
  if (handle == INVALID_HANDLE_VALUE) {
    Fail(
      code,
      message,
      createError == ERROR_ACCESS_DENIED ? "APR_BROKER_OWNED" : "APR_BROKER_START_FAILED",
      "Private named pipe cannot be created.");
  }
  return handle;
}

std::string TokenSid(HANDLE token, std::string* code, std::string* message) {
  DWORD size = 0;
  GetTokenInformation(token, TokenUser, nullptr, 0, &size);
  std::vector<unsigned char> bytes(size);
  if (!GetTokenInformation(token, TokenUser, bytes.data(), size, &size)) {
    Fail(code, message, "APR_BROKER_AUTH_FAILED", "Peer token SID is unavailable.");
    return {};
  }
  LPSTR sid = nullptr;
  if (!ConvertSidToStringSidA(reinterpret_cast<TOKEN_USER*>(bytes.data())->User.Sid, &sid)) {
    Fail(code, message, "APR_BROKER_AUTH_FAILED", "Peer SID cannot be encoded.");
    return {};
  }
  std::string result(sid);
  LocalFree(sid);
  return result;
}
}  // namespace

std::string CanonicalPath(const std::string& input, std::string* code, std::string* message) {
  const auto wide = Wide(input);
  HANDLE handle = CreateFileW(wide.c_str(), 0, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  if (handle == INVALID_HANDLE_VALUE) {
    Fail(code, message, "APR_BROKER_PATH_INVALID", "Path cannot be opened canonically.");
    return {};
  }
  std::vector<wchar_t> buffer(32768);
  const DWORD count = GetFinalPathNameByHandleW(handle, buffer.data(), static_cast<DWORD>(buffer.size()), FILE_NAME_NORMALIZED | VOLUME_NAME_DOS);
  CloseHandle(handle);
  if (count == 0 || count >= buffer.size()) {
    Fail(code, message, "APR_BROKER_PATH_INVALID", "Path cannot be resolved canonically.");
    return {};
  }
  std::wstring result(buffer.data(), count);
  if (result.rfind(L"\\\\?\\", 0) == 0) result.erase(0, 4);
  return Utf8(result);
}

std::string UserId(std::string* code, std::string* message) { return CurrentSid(code, message); }

void* OpenPrivateDirectory(const std::string& input, std::string* code, std::string* message) {
  const auto path = Wide(input);
  SECURITY_ATTRIBUTES attributes {};
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  if (!OwnerAttributes(&attributes, &descriptor, code, message)) return nullptr;
  const bool created = CreateDirectoryW(path.c_str(), &attributes) != 0;
  const DWORD createError = created ? ERROR_SUCCESS : GetLastError();
  LocalFree(descriptor);
  if (!created && createError != ERROR_ALREADY_EXISTS) {
    Fail(code, message, "APR_BROKER_STALE", "Private broker directory cannot be created.");
    return nullptr;
  }
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_READ | READ_CONTROL,
                              FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                              nullptr, OPEN_EXISTING,
                              FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
                              nullptr);
  BY_HANDLE_FILE_INFORMATION info {};
  if (handle == INVALID_HANDLE_VALUE || !Info(handle, &info) || !OwnerOnly(handle) ||
      (info.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0 ||
      (info.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) == 0) {
    if (handle != INVALID_HANDLE_VALUE) CloseHandle(handle);
    Fail(code, message, "APR_BROKER_STALE", "Private broker directory is unsafe.");
    return nullptr;
  }
  return new Directory{handle, path, info};
}

bool VerifyDirectory(void* value) {
  auto* directory = static_cast<Directory*>(value);
  BY_HANDLE_FILE_INFORMATION held {}, named {};
  HANDLE current = CreateFileW(directory->path.c_str(), GENERIC_READ | READ_CONTROL,
                               FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                               nullptr, OPEN_EXISTING,
                               FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
                               nullptr);
  const bool valid = Info(directory->handle, &held) && Info(current, &named) &&
                     OwnerOnly(directory->handle) && OwnerOnly(current) &&
                     Same(directory->identity, held) && Same(directory->identity, named) &&
                     (named.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) == 0 &&
                     (named.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0;
  if (current != INVALID_HANDLE_VALUE) CloseHandle(current);
  return valid;
}

bool DirectoryRead(void* value, const std::string& name, std::vector<unsigned char>* bytes, bool* found, std::string* code, std::string* message) {
  auto* directory = static_cast<Directory*>(value);
  const auto path = Join(directory->path, name);
  if (path.empty() || !VerifyDirectory(value)) return Fail(code, message, "APR_BROKER_STALE", "Broker resource path or directory identity is unsafe.");
  // Discovery readers must not block the verified dead-owner takeover from
  // removing metadata while a client polls for the replacement broker.
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_READ | READ_CONTROL,
                              FILE_SHARE_READ | FILE_SHARE_DELETE,
                              nullptr, OPEN_EXISTING, FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  if (handle == INVALID_HANDLE_VALUE) {
    const DWORD error = GetLastError();
    if (error == ERROR_FILE_NOT_FOUND) { *found = false; return true; }
    // DirectoryCreate publishes through an exclusive handle. A sharing
    // conflict is temporary, not evidence that the file passed ACL checks.
    if (error == ERROR_SHARING_VIOLATION)
      return Fail(code, message, "EBUSY", "Broker resource is being published (Win32 32).");
    return Fail(code, message, "APR_BROKER_STALE",
                ("Broker resource cannot be opened safely (Win32 " + std::to_string(error) + ").").c_str());
  }
  BY_HANDLE_FILE_INFORMATION info {};
  if (handle == INVALID_HANDLE_VALUE || !Info(handle, &info) || !OwnerOnly(handle) ||
      (info.dwFileAttributes & (FILE_ATTRIBUTE_REPARSE_POINT | FILE_ATTRIBUTE_DIRECTORY)) != 0 ||
      !ReadAll(handle, bytes)) {
    if (handle != INVALID_HANDLE_VALUE) CloseHandle(handle);
    return Fail(code, message, "APR_BROKER_STALE", "Broker resource cannot be read safely.");
  }
  CloseHandle(handle);
  *found = true;
  return true;
}

bool DirectoryCreate(void* value, const std::string& name, const std::vector<unsigned char>& bytes, std::string* code, std::string* message) {
  auto* directory = static_cast<Directory*>(value);
  const auto path = Join(directory->path, name);
  if (path.empty() || !VerifyDirectory(value)) return Fail(code, message, "APR_BROKER_STALE", "Broker directory changed before resource creation.");
  SECURITY_ATTRIBUTES attributes {};
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  if (!OwnerAttributes(&attributes, &descriptor, code, message)) return false;
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_WRITE | READ_CONTROL, 0, &attributes,
                              CREATE_NEW, FILE_ATTRIBUTE_NORMAL | FILE_FLAG_OPEN_REPARSE_POINT,
                              nullptr);
  LocalFree(descriptor);
  if (handle == INVALID_HANDLE_VALUE || !OwnerOnly(handle) || !WriteAll(handle, bytes)) {
    if (handle != INVALID_HANDLE_VALUE) CloseHandle(handle);
    return Fail(code, message, "APR_BROKER_STALE", "Broker resource cannot be created exclusively.");
  }
  CloseHandle(handle);
  return true;
}

bool DirectoryRemove(void* value, const std::string& name, const std::vector<unsigned char>& expected, std::string* code, std::string* message) {
  auto* directory = static_cast<Directory*>(value);
  std::vector<unsigned char> observed;
  bool found = false;
  if (!DirectoryRead(value, name, &observed, &found, code, message)) return false;
  const auto path = Join(directory->path, name);
  if (!found || observed != expected || !VerifyDirectory(value)) return false;
  if (!DeleteFileW(path.c_str())) {
    const DWORD error = GetLastError();
    return Fail(code, message, "APR_BROKER_STALE",
                ("Verified broker resource could not be removed (Win32 " +
                 std::to_string(error) + ").").c_str());
  }
  return true;
}

void CloseDirectory(void* value) { auto* directory = static_cast<Directory*>(value); CloseHandle(directory->handle); delete directory; }

void* AcquireExclusive(const std::string& input, const std::vector<unsigned char>& bytes, std::string* code, std::string* message) {
  const auto path = Wide(input);
  SECURITY_ATTRIBUTES attributes {};
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  if (!OwnerAttributes(&attributes, &descriptor, code, message)) return nullptr;
  HANDLE handle = CreateFileW(
    path.c_str(), GENERIC_READ | GENERIC_WRITE | READ_CONTROL,
    FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
    &attributes, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL | FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  LocalFree(descriptor);
  if (handle == INVALID_HANDLE_VALUE) { Fail(code, message, "APR_BROKER_OWNED", "Broker lock is already owned or unsafe."); return nullptr; }
  BY_HANDLE_FILE_INFORMATION info {};
  if (!Info(handle, &info) || !OwnerOnly(handle) ||
      (info.dwFileAttributes & (FILE_ATTRIBUTE_REPARSE_POINT | FILE_ATTRIBUTE_DIRECTORY)) != 0) {
    CloseHandle(handle);
    Fail(code, message, "APR_BROKER_STALE", "Broker lock has unsafe ownership, access, or type.");
    return nullptr;
  }
  OVERLAPPED overlap {};
  if (!LockFileEx(handle, LOCKFILE_EXCLUSIVE_LOCK | LOCKFILE_FAIL_IMMEDIATELY, 0, MAXDWORD, MAXDWORD, &overlap)) {
    CloseHandle(handle);
    Fail(code, message, "APR_BROKER_OWNED", "Broker ownership is already held.");
    return nullptr;
  }
  LARGE_INTEGER start {};
  if (!SetFilePointerEx(handle, start, nullptr, FILE_BEGIN) || !SetEndOfFile(handle) ||
      !WriteAll(handle, bytes) || !Info(handle, &info) || !OwnerOnly(handle)) {
    UnlockFileEx(handle, 0, MAXDWORD, MAXDWORD, &overlap);
    CloseHandle(handle);
    Fail(code, message, "APR_BROKER_STALE", "Broker lock evidence cannot be published.");
    return nullptr;
  }
  return new Lock{handle, path, info};
}

bool VerifyExclusive(void* value) {
  auto* lock = static_cast<Lock*>(value);
  BY_HANDLE_FILE_INFORMATION held {}, named {};
  HANDLE current = CreateFileW(lock->path.c_str(), READ_CONTROL,
                               FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                               nullptr, OPEN_EXISTING, FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  const bool valid = Info(lock->handle, &held) && Info(current, &named) &&
                     OwnerOnly(lock->handle) && OwnerOnly(current) &&
                     Same(lock->identity, held) && Same(lock->identity, named) &&
                     (named.dwFileAttributes & (FILE_ATTRIBUTE_REPARSE_POINT | FILE_ATTRIBUTE_DIRECTORY)) == 0;
  if (current != INVALID_HANDLE_VALUE) CloseHandle(current);
  return valid;
}

bool ReleaseExclusive(void* value) {
  auto* lock = static_cast<Lock*>(value);
  const bool valid = VerifyExclusive(value);
  OVERLAPPED overlap {};
  UnlockFileEx(lock->handle, 0, MAXDWORD, MAXDWORD, &overlap);
  CloseHandle(lock->handle);
  delete lock;
  return valid;
}

void AbandonExclusive(void* value) {
  auto* lock = static_cast<Lock*>(value);
  OVERLAPPED overlap {};
  UnlockFileEx(lock->handle, 0, MAXDWORD, MAXDWORD, &overlap);
  CloseHandle(lock->handle);
  delete lock;
}

bool ReclaimStaleEndpoint(void* lock, const std::string&, std::string* code, std::string* message) {
  // Named pipes leave no filesystem socket after the owner exits. The next
  // first-instance creation below remains the live-owner exclusion proof.
  if (VerifyExclusive(lock)) return true;
  *code = "APR_BROKER_STALE";
  *message = "Broker lock changed before endpoint reconciliation.";
  return false;
}

void* ListenPrivate(const std::string& input, std::string* code, std::string* message) {
  const auto path = Wide(input);
  HANDLE handle = CreateOwnerPipe(path, true, code, message);
  if (handle == INVALID_HANDLE_VALUE) return nullptr;
  return new Endpoint{handle, path};
}

bool VerifyEndpoint(void* value) { return static_cast<Endpoint*>(value)->handle != INVALID_HANDLE_VALUE; }
bool CloseEndpoint(void* value) { auto* endpoint = static_cast<Endpoint*>(value); const bool valid = VerifyEndpoint(value); CloseHandle(endpoint->handle); delete endpoint; return valid; }
void AbandonEndpoint(void* value) { auto* endpoint = static_cast<Endpoint*>(value); CloseHandle(endpoint->handle); delete endpoint; }

// Idle accept must yield promptly so provider streams and coordinator timers run.
// Keep the full IPC timeout for reads/writes on an established connection.
void* AcceptPrivate(void* value, std::string* code, std::string* message) {
  auto* endpoint = static_cast<Endpoint*>(value);
  if (!VerifyEndpoint(value)) {
    Fail(code, message, "APR_BROKER_STALE", "Broker endpoint is unavailable before accept.");
    return nullptr;
  }
  DWORD mode = PIPE_READMODE_BYTE | PIPE_NOWAIT;
  if (!SetNamedPipeHandleState(endpoint->handle, &mode, nullptr, nullptr)) {
    Fail(code, message, "APR_BROKER_START_FAILED", "Named-pipe accept cannot be bounded.");
    return nullptr;
  }
  const ULONGLONG deadline = GetTickCount64() + 25;
  bool connected = false;
  while (!connected) {
    connected = ConnectNamedPipe(endpoint->handle, nullptr) != 0;
    const DWORD error = connected ? ERROR_SUCCESS : GetLastError();
    if (error == ERROR_PIPE_CONNECTED) {
      connected = true;
    } else if (!connected && error == ERROR_PIPE_LISTENING && GetTickCount64() < deadline) {
      Sleep(1);
    } else if (!connected) {
      break;
    }
  }
  mode = PIPE_READMODE_BYTE | PIPE_WAIT;
  if (!connected || !SetNamedPipeHandleState(endpoint->handle, &mode, nullptr, nullptr)) {
    Fail(code, message, "APR_BROKER_START_FAILED", "Named-pipe connection cannot be accepted.");
    return nullptr;
  }
  HANDLE accepted = endpoint->handle;
  endpoint->handle = CreateOwnerPipe(endpoint->path, false, code, message);
  if (endpoint->handle == INVALID_HANDLE_VALUE) {
    DisconnectNamedPipe(accepted);
    CloseHandle(accepted);
    return nullptr;
  }
  return new Connection{accepted, true, false};
}

void* ConnectPrivate(const std::string& input, std::string* code, std::string* message) {
  const auto path = Wide(input);
  if (!WaitNamedPipeW(path.c_str(), 5000)) {
    const DWORD error = GetLastError();
    if (error != ERROR_SEM_TIMEOUT) {
      Fail(code, message, error == ERROR_FILE_NOT_FOUND ? "ENOENT" : "APR_BROKER_START_FAILED",
           "Private named pipe is unavailable.");
      return nullptr;
    }
  }
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_READ | GENERIC_WRITE, 0, nullptr,
                              OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (handle == INVALID_HANDLE_VALUE) {
    const DWORD error = GetLastError();
    Fail(code, message, error == ERROR_FILE_NOT_FOUND ? "ENOENT" : "APR_BROKER_START_FAILED",
         "Private named pipe cannot be connected.");
    return nullptr;
  }
  DWORD mode = PIPE_READMODE_BYTE;
  if (!SetNamedPipeHandleState(handle, &mode, nullptr, nullptr)) {
    CloseHandle(handle);
    Fail(code, message, "APR_BROKER_START_FAILED", "Private named-pipe mode cannot be fixed.");
    return nullptr;
  }
  return new Connection{handle, false, false};
}

bool ConnectionRead(void* value, size_t maximum, std::vector<unsigned char>* bytes,
                    std::string* code, std::string* message) {
  auto* connection = static_cast<Connection*>(value);
  if (connection->fenced) {
    return Fail(code, message, "APR_BROKER_STALE", "Broker connection is fenced.");
  }
  // Keep handshake and incomplete-client deadlines short. Only an authenticated
  // client's second write can wait for bounded worker/stop reconciliation.
  const DWORD timeout = !connection->server_side && connection->client_writes >= 2
    ? kCommandReplyTimeoutMilliseconds : kIpcTimeoutMilliseconds;
  bool timed_out = false;
  unsigned char prefix[4];
  if (!ReadExact(connection->handle, prefix, sizeof(prefix), timeout, &timed_out)) {
    FenceConnection(connection);
    return Fail(code, message, "APR_BROKER_PROTOCOL",
                timed_out ? "Broker frame prefix timed out." : "Broker frame prefix is truncated.");
  }
  const size_t length = (static_cast<size_t>(prefix[0]) << 24) |
                        (static_cast<size_t>(prefix[1]) << 16) |
                        (static_cast<size_t>(prefix[2]) << 8) |
                        static_cast<size_t>(prefix[3]);
  if (length == 0 || length + sizeof(prefix) > maximum) {
    FenceConnection(connection);
    return Fail(code, message, "APR_BROKER_PROTOCOL", "Broker frame exceeds the bounded native read.");
  }
  bytes->assign(prefix, prefix + sizeof(prefix));
  bytes->resize(sizeof(prefix) + length);
  if (!ReadExact(connection->handle, bytes->data() + sizeof(prefix), length, timeout,
                 &timed_out)) {
    FenceConnection(connection);
    return Fail(code, message, "APR_BROKER_PROTOCOL",
                timed_out ? "Broker frame body timed out." : "Broker frame body is truncated.");
  }
  return true;
}

bool ConnectionWrite(void* value, const std::vector<unsigned char>& bytes, bool drain,
                     std::string* code, std::string* message) {
  auto* connection = static_cast<Connection*>(value);
  if (connection->fenced) {
    return Fail(code, message, "APR_BROKER_STALE", "Broker connection is fenced.");
  }
  // Stop must retain this process until the client consumes its final reply.
  // Other server replies keep the non-blocking supervised flush path.
  const bool complete = connection->server_side
    ? (drain ? WritePipeBounded(connection->handle, bytes, true)
             : WriteServerReply(connection->handle, bytes))
    : WritePipeBounded(connection->handle, bytes, false);
  if (!complete) {
    FenceConnection(connection);
    return Fail(
      code,
      message,
      "APR_BROKER_PROTOCOL",
      connection->server_side
        ? "Broker frame delivery timed out."
        : "Broker frame cannot be written completely.");
  }
  if (!connection->server_side) connection->client_writes++;
  return true;
}

void CloseConnection(void* value) {
  auto* connection = static_cast<Connection*>(value);
  // A server reply worker retains its duplicate until bounded draining ends.
  CloseHandle(connection->handle);
  delete connection;
}

std::string PeerUser(void* value, std::string* code, std::string* message) {
  auto* connection = static_cast<Connection*>(value);
  HANDLE token = nullptr;
  if (connection->server_side) {
    if (!ImpersonateNamedPipeClient(connection->handle)) {
      Fail(code, message, "APR_BROKER_AUTH_FAILED", "Named-pipe client cannot be authenticated.");
      return {};
    }
    if (!OpenThreadToken(GetCurrentThread(), TOKEN_QUERY, TRUE, &token)) {
      RevertToSelf();
      Fail(code, message, "APR_BROKER_AUTH_FAILED", "Named-pipe client token is unavailable.");
      return {};
    }
    const std::string result = TokenSid(token, code, message);
    CloseHandle(token);
    RevertToSelf();
    return result;
  }
  ULONG processId = 0;
  if (!GetNamedPipeServerProcessId(connection->handle, &processId)) {
    Fail(code, message, "APR_BROKER_AUTH_FAILED", "Named-pipe server process is unavailable.");
    return {};
  }
  HANDLE process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, processId);
  if (process == nullptr || !OpenProcessToken(process, TOKEN_QUERY, &token)) {
    if (process != nullptr) CloseHandle(process);
    Fail(code, message, "APR_BROKER_AUTH_FAILED", "Named-pipe server token is unavailable.");
    return {};
  }
  CloseHandle(process);
  const std::string result = TokenSid(token, code, message);
  CloseHandle(token);
  return result;
}
}  // namespace broker_security
