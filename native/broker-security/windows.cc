#include <windows.h>
#include <aclapi.h>
#include <sddl.h>

#include <cstdint>
#include <string>
#include <vector>

namespace broker_security {
namespace {
struct Directory { HANDLE handle; std::wstring path; BY_HANDLE_FILE_INFORMATION identity; };
struct Lock { HANDLE handle; std::wstring path; BY_HANDLE_FILE_INFORMATION identity; };
struct Endpoint { HANDLE handle; std::wstring path; };

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

std::string CurrentSid(std::string* code, std::string* message) {
  HANDLE token = nullptr;
  if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token)) {
    Fail(code, message, "APR_BROKER_AUTH_FAILED", "Current process token is unavailable.");
    return {};
  }
  DWORD size = 0;
  GetTokenInformation(token, TokenUser, nullptr, 0, &size);
  std::vector<unsigned char> bytes(size);
  if (!GetTokenInformation(token, TokenUser, bytes.data(), size, &size)) {
    CloseHandle(token);
    Fail(code, message, "APR_BROKER_AUTH_FAILED", "Current user SID is unavailable.");
    return {};
  }
  CloseHandle(token);
  LPSTR sid = nullptr;
  if (!ConvertSidToStringSidA(reinterpret_cast<TOKEN_USER*>(bytes.data())->User.Sid, &sid)) {
    Fail(code, message, "APR_BROKER_AUTH_FAILED", "Current user SID cannot be encoded.");
    return {};
  }
  std::string result(sid);
  LocalFree(sid);
  return result;
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
  if (!CreateDirectoryW(path.c_str(), nullptr) && GetLastError() != ERROR_ALREADY_EXISTS) {
    Fail(code, message, "APR_BROKER_STALE", "Private broker directory cannot be created.");
    return nullptr;
  }
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  BY_HANDLE_FILE_INFORMATION info {};
  if (handle == INVALID_HANDLE_VALUE || !Info(handle, &info) || (info.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0 || (info.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) == 0) {
    if (handle != INVALID_HANDLE_VALUE) CloseHandle(handle);
    Fail(code, message, "APR_BROKER_STALE", "Private broker directory is unsafe.");
    return nullptr;
  }
  return new Directory{handle, path, info};
}

bool VerifyDirectory(void* value) {
  auto* directory = static_cast<Directory*>(value);
  BY_HANDLE_FILE_INFORMATION held {}, named {};
  HANDLE current = CreateFileW(directory->path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  const bool valid = Info(directory->handle, &held) && Info(current, &named) && Same(directory->identity, held) && Same(directory->identity, named) && (named.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) == 0;
  if (current != INVALID_HANDLE_VALUE) CloseHandle(current);
  return valid;
}

bool DirectoryRead(void* value, const std::string& name, std::vector<unsigned char>* bytes, bool* found, std::string* code, std::string* message) {
  auto* directory = static_cast<Directory*>(value);
  const auto path = Join(directory->path, name);
  if (path.empty() || !VerifyDirectory(value)) return Fail(code, message, "APR_BROKER_STALE", "Broker resource path or directory identity is unsafe.");
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  if (handle == INVALID_HANDLE_VALUE && GetLastError() == ERROR_FILE_NOT_FOUND) { *found = false; return true; }
  BY_HANDLE_FILE_INFORMATION info {};
  if (handle == INVALID_HANDLE_VALUE || !Info(handle, &info) || (info.dwFileAttributes & (FILE_ATTRIBUTE_REPARSE_POINT | FILE_ATTRIBUTE_DIRECTORY)) != 0 || !ReadAll(handle, bytes)) {
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
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_NEW, FILE_ATTRIBUTE_NORMAL | FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  if (handle == INVALID_HANDLE_VALUE || !WriteAll(handle, bytes)) {
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
  if (!DeleteFileW(path.c_str())) return Fail(code, message, "APR_BROKER_STALE", "Verified broker resource could not be removed.");
  return true;
}

void CloseDirectory(void* value) { auto* directory = static_cast<Directory*>(value); CloseHandle(directory->handle); delete directory; }

void* AcquireExclusive(const std::string& input, const std::vector<unsigned char>& bytes, std::string* code, std::string* message) {
  const auto path = Wide(input);
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_READ | GENERIC_WRITE, 0, nullptr, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL | FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  if (handle == INVALID_HANDLE_VALUE) { Fail(code, message, "APR_BROKER_OWNED", "Broker lock is already owned or unsafe."); return nullptr; }
  OVERLAPPED overlap {};
  if (!LockFileEx(handle, LOCKFILE_EXCLUSIVE_LOCK | LOCKFILE_FAIL_IMMEDIATELY, 0, MAXDWORD, MAXDWORD, &overlap)) {
    CloseHandle(handle);
    Fail(code, message, "APR_BROKER_OWNED", "Broker ownership is already held.");
    return nullptr;
  }
  SetFilePointer(handle, 0, nullptr, FILE_BEGIN);
  SetEndOfFile(handle);
  BY_HANDLE_FILE_INFORMATION info {};
  if (!WriteAll(handle, bytes) || !Info(handle, &info)) {
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
  HANDLE current = CreateFileW(lock->path.c_str(), 0, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr, OPEN_EXISTING, FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  const bool valid = Info(lock->handle, &held) && Info(current, &named) && Same(lock->identity, held) && Same(lock->identity, named) && (named.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) == 0;
  if (current != INVALID_HANDLE_VALUE) CloseHandle(current);
  return valid;
}

bool ReleaseExclusive(void* value) {
  auto* lock = static_cast<Lock*>(value);
  const bool valid = VerifyExclusive(value);
  OVERLAPPED overlap {};
  UnlockFileEx(lock->handle, 0, MAXDWORD, MAXDWORD, &overlap);
  CloseHandle(lock->handle);
  if (valid) DeleteFileW(lock->path.c_str());
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

void* ListenPrivate(const std::string& input, std::string* code, std::string* message) {
  std::string sid = CurrentSid(code, message);
  if (!code->empty()) return nullptr;
  const std::string sddl = "D:P(A;;GA;;;" + sid + ")";
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  if (!ConvertStringSecurityDescriptorToSecurityDescriptorA(sddl.c_str(), SDDL_REVISION_1, &descriptor, nullptr)) {
    Fail(code, message, "APR_BROKER_START_FAILED", "Owner-only named-pipe security cannot be constructed.");
    return nullptr;
  }
  SECURITY_ATTRIBUTES attributes {sizeof(SECURITY_ATTRIBUTES), descriptor, FALSE};
  const auto path = Wide(input);
  HANDLE handle = CreateNamedPipeW(path.c_str(), PIPE_ACCESS_DUPLEX | FILE_FLAG_FIRST_PIPE_INSTANCE, PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS, 16, 65536, 65536, 0, &attributes);
  LocalFree(descriptor);
  if (handle == INVALID_HANDLE_VALUE) {
    Fail(code, message, GetLastError() == ERROR_ACCESS_DENIED ? "APR_BROKER_OWNED" : "APR_BROKER_START_FAILED", "Private named pipe cannot be created.");
    return nullptr;
  }
  return new Endpoint{handle, path};
}

bool VerifyEndpoint(void* value) { return static_cast<Endpoint*>(value)->handle != INVALID_HANDLE_VALUE; }
bool CloseEndpoint(void* value) { auto* endpoint = static_cast<Endpoint*>(value); const bool valid = VerifyEndpoint(value); CloseHandle(endpoint->handle); delete endpoint; return valid; }
void AbandonEndpoint(void* value) { auto* endpoint = static_cast<Endpoint*>(value); CloseHandle(endpoint->handle); delete endpoint; }

std::string PeerUser(std::intptr_t raw, std::string* code, std::string* message) {
  HANDLE pipe = reinterpret_cast<HANDLE>(raw);
  if (!ImpersonateNamedPipeClient(pipe)) { Fail(code, message, "APR_BROKER_AUTH_FAILED", "Named-pipe client cannot be authenticated."); return {}; }
  HANDLE token = nullptr;
  if (!OpenThreadToken(GetCurrentThread(), TOKEN_QUERY, TRUE, &token)) {
    RevertToSelf();
    Fail(code, message, "APR_BROKER_AUTH_FAILED", "Named-pipe client token is unavailable.");
    return {};
  }
  DWORD size = 0;
  GetTokenInformation(token, TokenUser, nullptr, 0, &size);
  std::vector<unsigned char> bytes(size);
  const bool read = GetTokenInformation(token, TokenUser, bytes.data(), size, &size) != 0;
  CloseHandle(token);
  RevertToSelf();
  if (!read) { Fail(code, message, "APR_BROKER_AUTH_FAILED", "Named-pipe client SID is unavailable."); return {}; }
  LPSTR sid = nullptr;
  if (!ConvertSidToStringSidA(reinterpret_cast<TOKEN_USER*>(bytes.data())->User.Sid, &sid)) { Fail(code, message, "APR_BROKER_AUTH_FAILED", "Named-pipe client SID cannot be encoded."); return {}; }
  std::string result(sid);
  LocalFree(sid);
  return result;
}
}  // namespace broker_security
