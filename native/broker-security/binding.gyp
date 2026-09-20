{
  "targets": [{
    "target_name": "broker_security",
    "sources": ["addon.cc"],
    "cflags_cc": ["-std=c++17", "-fexceptions"],
    "cflags_cc!": ["-fno-exceptions"],
    "xcode_settings": { "GCC_ENABLE_CPP_EXCEPTIONS": "YES", "CLANG_CXX_LANGUAGE_STANDARD": "c++17" },
    "conditions": [
      ["OS=='win'", {
        "sources": ["windows.cc"],
        "libraries": ["advapi32.lib"],
        "msvs_settings": { "VCCLCompilerTool": { "ExceptionHandling": 1, "AdditionalOptions": ["/std:c++17"] } }
      }, {
        "sources": ["posix.cc"]
      }]
    ]
  }]
}
