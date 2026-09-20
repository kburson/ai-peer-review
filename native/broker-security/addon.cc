#include <node_api.h>

#include <cstdint>
#include <string>
#include <vector>

namespace broker_security {
std::string CanonicalPath(const std::string&, std::string*, std::string*);
std::string UserId(std::string*, std::string*);
void* OpenPrivateDirectory(const std::string&, std::string*, std::string*);
bool VerifyDirectory(void*);
bool DirectoryRead(void*, const std::string&, std::vector<unsigned char>*, bool*, std::string*, std::string*);
bool DirectoryCreate(void*, const std::string&, const std::vector<unsigned char>&, std::string*, std::string*);
bool DirectoryRemove(void*, const std::string&, const std::vector<unsigned char>&, std::string*, std::string*);
void CloseDirectory(void*);
void* AcquireExclusive(const std::string&, const std::vector<unsigned char>&, std::string*, std::string*);
bool VerifyExclusive(void*);
bool ReleaseExclusive(void*);
void AbandonExclusive(void*);
void* ListenPrivate(const std::string&, std::string*, std::string*);
bool VerifyEndpoint(void*);
bool CloseEndpoint(void*);
void AbandonEndpoint(void*);
void* AcceptPrivate(void*, std::string*, std::string*);
void* ConnectPrivate(const std::string&, std::string*, std::string*);
bool ConnectionRead(void*, size_t, std::vector<unsigned char>*, std::string*, std::string*);
bool ConnectionWrite(void*, const std::vector<unsigned char>&, std::string*, std::string*);
void CloseConnection(void*);
std::string PeerUser(void*, std::string*, std::string*);
}  // namespace broker_security

namespace {
enum class Kind { directory, lock, endpoint, connection };

struct Holder {
  Kind kind;
  void* value;
  bool closed;
};

void Finalize(napi_env, void* data, void*) {
  auto* holder = static_cast<Holder*>(data);
  if (!holder->closed) {
    if (holder->kind == Kind::directory) broker_security::CloseDirectory(holder->value);
    if (holder->kind == Kind::lock) broker_security::AbandonExclusive(holder->value);
    if (holder->kind == Kind::endpoint) broker_security::AbandonEndpoint(holder->value);
    if (holder->kind == Kind::connection) broker_security::CloseConnection(holder->value);
  }
  delete holder;
}

napi_value Undefined(napi_env env) {
  napi_value value;
  napi_get_undefined(env, &value);
  return value;
}

napi_value Throw(napi_env env, const std::string& code, const std::string& message) {
  napi_throw_error(env, code.empty() ? "APR_BROKER_STALE" : code.c_str(), message.c_str());
  return nullptr;
}

bool Args(napi_env env, napi_callback_info info, size_t count, napi_value* values) {
  size_t actual = count;
  napi_get_cb_info(env, info, &actual, values, nullptr, nullptr);
  if (actual == count) return true;
  napi_throw_type_error(env, "APR_BROKER_PROTOCOL", "Invalid native broker argument count.");
  return false;
}

bool String(napi_env env, napi_value value, std::string* output) {
  size_t size = 0;
  if (napi_get_value_string_utf8(env, value, nullptr, 0, &size) != napi_ok) return false;
  std::vector<char> bytes(size + 1);
  if (napi_get_value_string_utf8(env, value, bytes.data(), bytes.size(), &size) != napi_ok) return false;
  output->assign(bytes.data(), size);
  return true;
}

bool Bytes(napi_env env, napi_value value, std::vector<unsigned char>* output) {
  bool is_buffer = false;
  if (napi_is_buffer(env, value, &is_buffer) != napi_ok || !is_buffer) return false;
  void* data = nullptr;
  size_t size = 0;
  if (napi_get_buffer_info(env, value, &data, &size) != napi_ok) return false;
  auto* start = static_cast<unsigned char*>(data);
  output->assign(start, start + size);
  return true;
}

napi_value Text(napi_env env, const std::string& value) {
  napi_value result;
  napi_create_string_utf8(env, value.data(), value.size(), &result);
  return result;
}

napi_value Boolean(napi_env env, bool value) {
  napi_value result;
  napi_get_boolean(env, value, &result);
  return result;
}

napi_value External(napi_env env, Kind kind, void* value) {
  auto* holder = new Holder{kind, value, false};
  napi_value result;
  napi_create_external(env, holder, Finalize, nullptr, &result);
  return result;
}

Holder* Handle(napi_env env, napi_value value, Kind kind) {
  void* data = nullptr;
  if (napi_get_value_external(env, value, &data) != napi_ok || data == nullptr) {
    napi_throw_type_error(env, "APR_BROKER_PROTOCOL", "Invalid native broker handle.");
    return nullptr;
  }
  auto* holder = static_cast<Holder*>(data);
  if (holder->kind != kind || holder->closed) {
    napi_throw_error(env, "APR_BROKER_STALE", "Native broker handle is closed or has the wrong type.");
    return nullptr;
  }
  return holder;
}

napi_value CanonicalPath(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  std::string input, code, message;
  if (!String(env, values[0], &input)) return Throw(env, "APR_BROKER_PATH_INVALID", "Path must be a string.");
  const auto result = broker_security::CanonicalPath(input, &code, &message);
  return code.empty() ? Text(env, result) : Throw(env, code, message);
}

napi_value UserId(napi_env env, napi_callback_info) {
  std::string code, message;
  const auto result = broker_security::UserId(&code, &message);
  return code.empty() ? Text(env, result) : Throw(env, code, message);
}

napi_value OpenPrivateDirectory(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  std::string input, code, message;
  if (!String(env, values[0], &input)) return Throw(env, "APR_BROKER_PATH_INVALID", "Directory path must be a string.");
  void* value = broker_security::OpenPrivateDirectory(input, &code, &message);
  return value ? External(env, Kind::directory, value) : Throw(env, code, message);
}

napi_value VerifyDirectory(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::directory);
  return holder ? Boolean(env, broker_security::VerifyDirectory(holder->value)) : nullptr;
}

napi_value DirectoryRead(napi_env env, napi_callback_info info) {
  napi_value values[2];
  if (!Args(env, info, 2, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::directory);
  std::string name, code, message;
  if (!holder) return nullptr;
  if (!String(env, values[1], &name)) return Throw(env, "APR_BROKER_PROTOCOL", "Resource name must be a string.");
  std::vector<unsigned char> bytes;
  bool found = false;
  if (!broker_security::DirectoryRead(holder->value, name, &bytes, &found, &code, &message)) return Throw(env, code, message);
  if (!found) {
    napi_value result;
    napi_get_null(env, &result);
    return result;
  }
  napi_value result;
  void* copied = nullptr;
  napi_create_buffer_copy(env, bytes.size(), bytes.data(), &copied, &result);
  return result;
}

napi_value DirectoryCreate(napi_env env, napi_callback_info info) {
  napi_value values[3];
  if (!Args(env, info, 3, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::directory);
  std::string name, code, message;
  std::vector<unsigned char> bytes;
  if (!holder) return nullptr;
  if (!String(env, values[1], &name) || !Bytes(env, values[2], &bytes)) return Throw(env, "APR_BROKER_PROTOCOL", "Invalid resource create arguments.");
  return broker_security::DirectoryCreate(holder->value, name, bytes, &code, &message)
    ? Undefined(env)
    : Throw(env, code, message);
}

napi_value DirectoryRemove(napi_env env, napi_callback_info info) {
  napi_value values[3];
  if (!Args(env, info, 3, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::directory);
  std::string name, code, message;
  std::vector<unsigned char> bytes;
  if (!holder) return nullptr;
  if (!String(env, values[1], &name) || !Bytes(env, values[2], &bytes)) return Throw(env, "APR_BROKER_PROTOCOL", "Invalid resource removal arguments.");
  const bool removed = broker_security::DirectoryRemove(holder->value, name, bytes, &code, &message);
  return code.empty() ? Boolean(env, removed) : Throw(env, code, message);
}

napi_value CloseDirectory(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::directory);
  if (!holder) return nullptr;
  broker_security::CloseDirectory(holder->value);
  holder->closed = true;
  return Undefined(env);
}

napi_value AcquireExclusive(napi_env env, napi_callback_info info) {
  napi_value values[2];
  if (!Args(env, info, 2, values)) return nullptr;
  std::string input, code, message;
  std::vector<unsigned char> bytes;
  if (!String(env, values[0], &input) || !Bytes(env, values[1], &bytes)) return Throw(env, "APR_BROKER_PROTOCOL", "Invalid lock arguments.");
  void* value = broker_security::AcquireExclusive(input, bytes, &code, &message);
  return value ? External(env, Kind::lock, value) : Throw(env, code, message);
}

napi_value VerifyExclusive(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::lock);
  return holder ? Boolean(env, broker_security::VerifyExclusive(holder->value)) : nullptr;
}

napi_value ReleaseExclusive(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::lock);
  if (!holder) return nullptr;
  const bool result = broker_security::ReleaseExclusive(holder->value);
  holder->closed = true;
  return Boolean(env, result);
}

napi_value AbandonExclusive(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::lock);
  if (!holder) return nullptr;
  broker_security::AbandonExclusive(holder->value);
  holder->closed = true;
  return Undefined(env);
}

napi_value ListenPrivate(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  std::string input, code, message;
  if (!String(env, values[0], &input)) return Throw(env, "APR_BROKER_PATH_INVALID", "Endpoint must be a string.");
  void* value = broker_security::ListenPrivate(input, &code, &message);
  return value ? External(env, Kind::endpoint, value) : Throw(env, code, message);
}

napi_value VerifyEndpoint(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::endpoint);
  return holder ? Boolean(env, broker_security::VerifyEndpoint(holder->value)) : nullptr;
}

napi_value CloseEndpoint(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::endpoint);
  if (!holder) return nullptr;
  const bool result = broker_security::CloseEndpoint(holder->value);
  holder->closed = true;
  return Boolean(env, result);
}

napi_value AcceptPrivate(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::endpoint);
  std::string code, message;
  if (!holder) return nullptr;
  void* value = broker_security::AcceptPrivate(holder->value, &code, &message);
  return value ? External(env, Kind::connection, value) : Throw(env, code, message);
}

napi_value ConnectPrivate(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  std::string input, code, message;
  if (!String(env, values[0], &input)) {
    return Throw(env, "APR_BROKER_PATH_INVALID", "Endpoint must be a string.");
  }
  void* value = broker_security::ConnectPrivate(input, &code, &message);
  return value ? External(env, Kind::connection, value) : Throw(env, code, message);
}

napi_value ConnectionRead(napi_env env, napi_callback_info info) {
  napi_value values[2];
  if (!Args(env, info, 2, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::connection);
  std::int64_t maximum = 0;
  if (!holder || napi_get_value_int64(env, values[1], &maximum) != napi_ok || maximum < 5 ||
      maximum > 65540) {
    return Throw(env, "APR_BROKER_PROTOCOL", "Invalid broker frame read bound.");
  }
  std::vector<unsigned char> bytes;
  std::string code, message;
  if (!broker_security::ConnectionRead(
        holder->value,
        static_cast<size_t>(maximum),
        &bytes,
        &code,
        &message)) {
    return Throw(env, code, message);
  }
  napi_value result;
  void* copied = nullptr;
  napi_create_buffer_copy(env, bytes.size(), bytes.data(), &copied, &result);
  return result;
}

napi_value ConnectionWrite(napi_env env, napi_callback_info info) {
  napi_value values[2];
  if (!Args(env, info, 2, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::connection);
  std::vector<unsigned char> bytes;
  std::string code, message;
  if (!holder || !Bytes(env, values[1], &bytes) || bytes.empty() || bytes.size() > 65540) {
    return Throw(env, "APR_BROKER_PROTOCOL", "Invalid broker frame write.");
  }
  return broker_security::ConnectionWrite(holder->value, bytes, &code, &message)
    ? Undefined(env)
    : Throw(env, code, message);
}

napi_value CloseConnection(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::connection);
  if (!holder) return nullptr;
  broker_security::CloseConnection(holder->value);
  holder->closed = true;
  return Undefined(env);
}

napi_value PeerUser(napi_env env, napi_callback_info info) {
  napi_value values[1];
  if (!Args(env, info, 1, values)) return nullptr;
  auto* holder = Handle(env, values[0], Kind::connection);
  std::string code, message;
  if (!holder) return nullptr;
  const auto result = broker_security::PeerUser(holder->value, &code, &message);
  return code.empty() ? Text(env, result) : Throw(env, code, message);
}

napi_value Init(napi_env env, napi_value exports) {
  const napi_property_descriptor values[] = {
    {"canonicalPath", nullptr, CanonicalPath},
    {"userId", nullptr, UserId},
    {"openPrivateDirectory", nullptr, OpenPrivateDirectory},
    {"verifyDirectory", nullptr, VerifyDirectory},
    {"directoryRead", nullptr, DirectoryRead},
    {"directoryCreate", nullptr, DirectoryCreate},
    {"directoryRemove", nullptr, DirectoryRemove},
    {"closeDirectory", nullptr, CloseDirectory},
    {"acquireExclusive", nullptr, AcquireExclusive},
    {"verifyExclusive", nullptr, VerifyExclusive},
    {"releaseExclusive", nullptr, ReleaseExclusive},
    {"abandonExclusive", nullptr, AbandonExclusive},
    {"listenPrivate", nullptr, ListenPrivate},
    {"verifyEndpoint", nullptr, VerifyEndpoint},
    {"closeEndpoint", nullptr, CloseEndpoint},
    {"acceptPrivate", nullptr, AcceptPrivate},
    {"connectPrivate", nullptr, ConnectPrivate},
    {"connectionRead", nullptr, ConnectionRead},
    {"connectionWrite", nullptr, ConnectionWrite},
    {"closeConnection", nullptr, CloseConnection},
    {"peerUser", nullptr, PeerUser},
  };
  napi_define_properties(env, exports, sizeof(values) / sizeof(values[0]), values);
  return exports;
}
}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
