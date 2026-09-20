#include <sys/file.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/un.h>

#include <cerrno>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <limits.h>
#include <string>
#include <unistd.h>
#include <vector>

namespace broker_security {
namespace {
struct FileIdentity {
  dev_t device;
  ino_t inode;
};
struct Directory {
  int descriptor;
  std::string path;
  FileIdentity identity;
};
struct Lock {
  int descriptor;
  std::string path;
  FileIdentity identity;
};
struct Endpoint {
  int descriptor;
  std::string path;
  FileIdentity identity;
};

bool Fail(std::string* code, std::string* message, const char* stable, const std::string& text) {
  *code = stable;
  *message = text;
  return false;
}

bool Name(const std::string& name) {
  return !name.empty() && name != "." && name != ".." && name.find('/') == std::string::npos;
}

bool Private(const struct stat& value, bool directory) {
  return value.st_uid == geteuid() &&
         (directory ? S_ISDIR(value.st_mode) : S_ISREG(value.st_mode)) &&
         (value.st_mode & 0777) == (directory ? 0700 : 0600);
}

FileIdentity Identity(const struct stat& value) { return {value.st_dev, value.st_ino}; }
bool Same(const FileIdentity& left, const struct stat& right) {
  return left.device == right.st_dev && left.inode == right.st_ino;
}

bool WriteAll(int descriptor, const std::vector<unsigned char>& bytes) {
  size_t offset = 0;
  while (offset < bytes.size()) {
    const auto count = write(descriptor, bytes.data() + offset, bytes.size() - offset);
    if (count < 0 && errno == EINTR) continue;
    if (count <= 0) return false;
    offset += static_cast<size_t>(count);
  }
  return true;
}

bool ReadAll(int descriptor, std::vector<unsigned char>* bytes) {
  struct stat observed {};
  if (fstat(descriptor, &observed) != 0 || observed.st_size < 0 || observed.st_size > 1024 * 1024) return false;
  bytes->resize(static_cast<size_t>(observed.st_size));
  size_t offset = 0;
  while (offset < bytes->size()) {
    const auto count = read(descriptor, bytes->data() + offset, bytes->size() - offset);
    if (count < 0 && errno == EINTR) continue;
    if (count <= 0) return false;
    offset += static_cast<size_t>(count);
  }
  return true;
}

bool VerifyPath(int descriptor, const std::string& path, const FileIdentity& identity, bool directory) {
  struct stat held {}, named {};
  return fstat(descriptor, &held) == 0 && lstat(path.c_str(), &named) == 0 &&
         Same(identity, held) && Same(identity, named) && Private(held, directory) &&
         Private(named, directory) && !S_ISLNK(named.st_mode);
}
}  // namespace

std::string CanonicalPath(const std::string& input, std::string* code, std::string* message) {
  char resolved[PATH_MAX];
  if (realpath(input.c_str(), resolved) == nullptr) {
    Fail(code, message, "APR_BROKER_PATH_INVALID", "Path cannot be resolved canonically.");
    return {};
  }
  return resolved;
}

std::string UserId(std::string*, std::string*) { return std::to_string(geteuid()); }

void* OpenPrivateDirectory(const std::string& path, std::string* code, std::string* message) {
  struct stat named {};
  if (lstat(path.c_str(), &named) != 0) {
    if (errno != ENOENT || mkdir(path.c_str(), 0700) != 0 || lstat(path.c_str(), &named) != 0) {
      Fail(code, message, "APR_BROKER_STALE", "Private broker directory cannot be created safely.");
      return nullptr;
    }
  }
  if (S_ISLNK(named.st_mode) || !Private(named, true)) {
    Fail(code, message, "APR_BROKER_STALE", "Private broker directory has unsafe ownership, permissions, or type.");
    return nullptr;
  }
  const int descriptor = open(path.c_str(), O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
  struct stat held {};
  if (descriptor < 0 || fstat(descriptor, &held) != 0 || !Private(held, true) || !Same(Identity(named), held)) {
    if (descriptor >= 0) close(descriptor);
    Fail(code, message, "APR_BROKER_STALE", "Private broker directory changed while opening.");
    return nullptr;
  }
  return new Directory{descriptor, path, Identity(held)};
}

bool VerifyDirectory(void* value) {
  auto* directory = static_cast<Directory*>(value);
  return VerifyPath(directory->descriptor, directory->path, directory->identity, true);
}

bool DirectoryRead(void* value, const std::string& name, std::vector<unsigned char>* bytes, bool* found, std::string* code, std::string* message) {
  auto* directory = static_cast<Directory*>(value);
  if (!Name(name) || !VerifyDirectory(value)) return Fail(code, message, "APR_BROKER_STALE", "Broker resource path or directory identity is unsafe.");
  const int descriptor = openat(directory->descriptor, name.c_str(), O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (descriptor < 0 && errno == ENOENT) {
    *found = false;
    return true;
  }
  struct stat observed {};
  if (descriptor < 0 || fstat(descriptor, &observed) != 0 || !Private(observed, false) || !ReadAll(descriptor, bytes)) {
    if (descriptor >= 0) close(descriptor);
    return Fail(code, message, "APR_BROKER_STALE", "Broker resource cannot be read as a private regular file.");
  }
  close(descriptor);
  *found = true;
  return true;
}

bool DirectoryCreate(void* value, const std::string& name, const std::vector<unsigned char>& bytes, std::string* code, std::string* message) {
  auto* directory = static_cast<Directory*>(value);
  if (!Name(name) || !VerifyDirectory(value)) return Fail(code, message, "APR_BROKER_STALE", "Broker directory changed before resource creation.");
  const int descriptor = openat(directory->descriptor, name.c_str(), O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, 0600);
  if (descriptor < 0 || !WriteAll(descriptor, bytes) || fsync(descriptor) != 0) {
    if (descriptor >= 0) close(descriptor);
    return Fail(code, message, "APR_BROKER_STALE", "Broker resource cannot be created exclusively.");
  }
  close(descriptor);
  return true;
}

bool DirectoryRemove(void* value, const std::string& name, const std::vector<unsigned char>& expected, std::string* code, std::string* message) {
  auto* directory = static_cast<Directory*>(value);
  std::vector<unsigned char> observed;
  bool found = false;
  if (!DirectoryRead(value, name, &observed, &found, code, message)) return false;
  if (!found || observed != expected || !VerifyDirectory(value)) return false;
  if (unlinkat(directory->descriptor, name.c_str(), 0) != 0) return Fail(code, message, "APR_BROKER_STALE", "Verified broker resource could not be removed.");
  return true;
}

void CloseDirectory(void* value) {
  auto* directory = static_cast<Directory*>(value);
  close(directory->descriptor);
  delete directory;
}

void* AcquireExclusive(const std::string& path, const std::vector<unsigned char>& bytes, std::string* code, std::string* message) {
  struct stat before {};
  const bool existed = lstat(path.c_str(), &before) == 0;
  if ((existed && (S_ISLNK(before.st_mode) || !Private(before, false))) ||
      (!existed && errno != ENOENT)) {
    Fail(code, message, "APR_BROKER_STALE", "Broker lock path has unsafe ownership, permissions, or type.");
    return nullptr;
  }
  const int descriptor = open(path.c_str(), O_RDWR | O_CREAT | O_CLOEXEC | O_NOFOLLOW, 0600);
  if (descriptor < 0) {
    Fail(code, message, "APR_BROKER_STALE", "Broker lock cannot be opened safely.");
    return nullptr;
  }
  if (flock(descriptor, LOCK_EX | LOCK_NB) != 0) {
    close(descriptor);
    Fail(code, message, errno == EWOULDBLOCK ? "APR_BROKER_OWNED" : "APR_BROKER_STALE", "Broker ownership is already held or indeterminate.");
    return nullptr;
  }
  struct stat held {}, named {};
  if (fstat(descriptor, &held) != 0 || lstat(path.c_str(), &named) != 0 ||
      !Same(Identity(held), named) || (existed && !Same(Identity(before), held)) ||
      fchmod(descriptor, 0600) != 0 || fstat(descriptor, &held) != 0 || !Private(held, false) ||
      ftruncate(descriptor, 0) != 0 || lseek(descriptor, 0, SEEK_SET) < 0 || !WriteAll(descriptor, bytes) || fsync(descriptor) != 0) {
    flock(descriptor, LOCK_UN);
    close(descriptor);
    Fail(code, message, "APR_BROKER_STALE", "Broker lock evidence cannot be published safely.");
    return nullptr;
  }
  return new Lock{descriptor, path, Identity(held)};
}

bool VerifyExclusive(void* value) {
  auto* lock = static_cast<Lock*>(value);
  return VerifyPath(lock->descriptor, lock->path, lock->identity, false);
}

bool ReleaseExclusive(void* value) {
  auto* lock = static_cast<Lock*>(value);
  const bool valid = VerifyExclusive(value);
  if (valid) unlink(lock->path.c_str());
  flock(lock->descriptor, LOCK_UN);
  close(lock->descriptor);
  delete lock;
  return valid;
}

void AbandonExclusive(void* value) {
  auto* lock = static_cast<Lock*>(value);
  flock(lock->descriptor, LOCK_UN);
  close(lock->descriptor);
  delete lock;
}

void* ListenPrivate(const std::string& path, std::string* code, std::string* message) {
  sockaddr_un address {};
  if (path.size() >= sizeof(address.sun_path)) {
    Fail(code, message, "APR_BROKER_START_FAILED", "Broker endpoint exceeds the native Unix socket limit.");
    return nullptr;
  }
  struct stat named {};
  if (lstat(path.c_str(), &named) == 0 || errno != ENOENT) {
    Fail(code, message, "APR_BROKER_OWNED", "Broker endpoint already exists or cannot be inspected.");
    return nullptr;
  }
  const int descriptor = socket(AF_UNIX, SOCK_STREAM, 0);
  if (descriptor < 0) {
    Fail(code, message, "APR_BROKER_START_FAILED", "Broker Unix socket cannot be created.");
    return nullptr;
  }
  fcntl(descriptor, F_SETFD, FD_CLOEXEC);
  address.sun_family = AF_UNIX;
  std::memcpy(address.sun_path, path.c_str(), path.size() + 1);
  if (bind(descriptor, reinterpret_cast<sockaddr*>(&address), sizeof(address)) != 0 ||
      chmod(path.c_str(), 0600) != 0 || listen(descriptor, 16) != 0 || lstat(path.c_str(), &named) != 0) {
    close(descriptor);
    unlink(path.c_str());
    Fail(code, message, "APR_BROKER_START_FAILED", "Broker Unix socket cannot be bound privately.");
    return nullptr;
  }
  return new Endpoint{descriptor, path, Identity(named)};
}

bool VerifyEndpoint(void* value) {
  auto* endpoint = static_cast<Endpoint*>(value);
  struct stat named {};
  return lstat(endpoint->path.c_str(), &named) == 0 && S_ISSOCK(named.st_mode) &&
         named.st_uid == geteuid() && (named.st_mode & 0777) == 0600 && Same(endpoint->identity, named);
}

bool CloseEndpoint(void* value) {
  auto* endpoint = static_cast<Endpoint*>(value);
  const bool valid = VerifyEndpoint(value);
  close(endpoint->descriptor);
  if (valid) unlink(endpoint->path.c_str());
  delete endpoint;
  return valid;
}

void AbandonEndpoint(void* value) {
  auto* endpoint = static_cast<Endpoint*>(value);
  close(endpoint->descriptor);
  delete endpoint;
}

std::string PeerUser(std::intptr_t raw, std::string* code, std::string* message) {
  const int descriptor = static_cast<int>(raw);
#if defined(__APPLE__)
  uid_t user = 0;
  gid_t group = 0;
  if (getpeereid(descriptor, &user, &group) == 0) return std::to_string(user);
#elif defined(__linux__)
  struct ucred credentials {};
  socklen_t size = sizeof(credentials);
  if (getsockopt(descriptor, SOL_SOCKET, SO_PEERCRED, &credentials, &size) == 0) return std::to_string(credentials.uid);
#endif
  Fail(code, message, "APR_BROKER_AUTH_FAILED", "Kernel peer credentials are unavailable.");
  return {};
}
}  // namespace broker_security
