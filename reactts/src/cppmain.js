export var Module = typeof Module != "undefined" ? Module : {};
var moduleOverrides = Object.assign({}, Module);
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = (status, toThrow) => {
  throw toThrow;
};
var ENVIRONMENT_IS_WEB = typeof window == "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
var ENVIRONMENT_IS_NODE =
  typeof process == "object" &&
  typeof process.versions == "object" &&
  typeof process.versions.node == "string";
var ENVIRONMENT_IS_SHELL =
  !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (Module["ENVIRONMENT"]) {
  throw new Error(
    "Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)",
  );
}
var scriptDirectory = "";
function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory);
  }
  return scriptDirectory + path;
}
var read_, readAsync, readBinary;
if (ENVIRONMENT_IS_NODE) {
  if (
    typeof process == "undefined" ||
    !process.release ||
    process.release.name !== "node"
  )
    throw new Error(
      "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)",
    );
  var nodeVersion = process.versions.node;
  var numericVersion = nodeVersion.split(".").slice(0, 3);
  numericVersion =
    numericVersion[0] * 1e4 +
    numericVersion[1] * 100 +
    numericVersion[2].split("-")[0] * 1;
  if (numericVersion < 16e4) {
    throw new Error(
      "This emscripten-generated code requires node v16.0.0 (detected v" +
        nodeVersion +
        ")",
    );
  }
  var fs = require("fs");
  var nodePath = require("path");
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = nodePath.dirname(scriptDirectory) + "/";
  } else {
    scriptDirectory = __dirname + "/";
  }
  read_ = (filename, binary) => {
    filename = isFileURI(filename)
      ? new URL(filename)
      : nodePath.normalize(filename);
    return fs.readFileSync(filename, binary ? undefined : "utf8");
  };
  readBinary = (filename) => {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };
  readAsync = (filename, onload, onerror, binary = true) => {
    filename = isFileURI(filename)
      ? new URL(filename)
      : nodePath.normalize(filename);
    fs.readFile(filename, binary ? undefined : "utf8", (err, data) => {
      if (err) onerror(err);
      else onload(binary ? data.buffer : data);
    });
  };
  if (!Module["thisProgram"] && process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, "/");
  }
  arguments_ = process.argv.slice(2);
  if (typeof module != "undefined") {
    module["exports"] = Module;
  }
  process.on("uncaughtException", (ex) => {
    if (
      ex !== "unwind" &&
      !(ex instanceof ExitStatus) &&
      !(ex.context instanceof ExitStatus)
    ) {
      throw ex;
    }
  });
  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };
} else if (ENVIRONMENT_IS_SHELL) {
  if (
    (typeof process == "object" && typeof require === "function") ||
    typeof window == "object" ||
    typeof importScripts == "function"
  )
    throw new Error(
      "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)",
    );
  if (typeof read != "undefined") {
    read_ = read;
  }
  readBinary = (f) => {
    if (typeof readbuffer == "function") {
      return new Uint8Array(readbuffer(f));
    }
    let data = read(f, "binary");
    assert(typeof data == "object");
    return data;
  };
  readAsync = (f, onload, onerror) => {
    setTimeout(() => onload(readBinary(f)));
  };
  if (typeof clearTimeout == "undefined") {
    globalThis.clearTimeout = (id) => {};
  }
  if (typeof setTimeout == "undefined") {
    globalThis.setTimeout = (f) => (typeof f == "function" ? f() : abort());
  }
  if (typeof scriptArgs != "undefined") {
    arguments_ = scriptArgs;
  } else if (typeof arguments != "undefined") {
    arguments_ = arguments;
  }
  if (typeof quit == "function") {
    quit_ = (status, toThrow) => {
      setTimeout(() => {
        if (!(toThrow instanceof ExitStatus)) {
          let toLog = toThrow;
          if (toThrow && typeof toThrow == "object" && toThrow.stack) {
            toLog = [toThrow, toThrow.stack];
          }
          err(`exiting due to exception: ${toLog}`);
        }
        quit(status);
      });
      throw toThrow;
    };
  }
  if (typeof print != "undefined") {
    if (typeof console == "undefined") console = {};
    console.log = print;
    console.warn = console.error =
      typeof printErr != "undefined" ? printErr : print;
  }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href;
  } else if (typeof document != "undefined" && document.currentScript) {
    scriptDirectory = document.currentScript.src;
  }
  if (scriptDirectory.indexOf("blob:") !== 0) {
    scriptDirectory = scriptDirectory.substr(
      0,
      scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1,
    );
  } else {
    scriptDirectory = "";
  }
  if (!(typeof window == "object" || typeof importScripts == "function"))
    throw new Error(
      "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)",
    );
  {
    read_ = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = (url) => {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(xhr.response);
      };
    }
    readAsync = (url, onload, onerror) => {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = () => {
        if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
          onload(xhr.response);
          return;
        }
        onerror();
      };
      xhr.onerror = onerror;
      xhr.send(null);
    };
  }
} else {
  throw new Error("environment detection error");
}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.error.bind(console);
Object.assign(Module, moduleOverrides);
moduleOverrides = null;
checkIncomingModuleAPI();
if (Module["arguments"]) arguments_ = Module["arguments"];
legacyModuleProp("arguments", "arguments_");
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
legacyModuleProp("thisProgram", "thisProgram");
if (Module["quit"]) quit_ = Module["quit"];
legacyModuleProp("quit", "quit_");
assert(
  typeof Module["memoryInitializerPrefixURL"] == "undefined",
  "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead",
);
assert(
  typeof Module["pthreadMainPrefixURL"] == "undefined",
  "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead",
);
assert(
  typeof Module["cdInitializerPrefixURL"] == "undefined",
  "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead",
);
assert(
  typeof Module["filePackagePrefixURL"] == "undefined",
  "Module.filePackagePrefixURL option was removed, use Module.locateFile instead",
);
assert(
  typeof Module["read"] == "undefined",
  "Module.read option was removed (modify read_ in JS)",
);
assert(
  typeof Module["readAsync"] == "undefined",
  "Module.readAsync option was removed (modify readAsync in JS)",
);
assert(
  typeof Module["readBinary"] == "undefined",
  "Module.readBinary option was removed (modify readBinary in JS)",
);
assert(
  typeof Module["setWindowTitle"] == "undefined",
  "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)",
);
assert(
  typeof Module["TOTAL_MEMORY"] == "undefined",
  "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY",
);
legacyModuleProp("asm", "wasmExports");
legacyModuleProp("read", "read_");
legacyModuleProp("readAsync", "readAsync");
legacyModuleProp("readBinary", "readBinary");
legacyModuleProp("setWindowTitle", "setWindowTitle");
assert(
  !ENVIRONMENT_IS_SHELL,
  "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.",
);
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
legacyModuleProp("wasmBinary", "wasmBinary");
if (typeof WebAssembly != "object") {
  abort("no native wasm support detected");
}
var wasmMemory;
var ABORT = false;
var EXITSTATUS;
function assert(condition, text) {
  if (!condition) {
    abort("Assertion failed" + (text ? ": " + text : ""));
  }
}
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module["HEAP8"] = HEAP8 = new Int8Array(b);
  Module["HEAP16"] = HEAP16 = new Int16Array(b);
  Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
  Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
  Module["HEAP32"] = HEAP32 = new Int32Array(b);
  Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
  Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
  Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
}
assert(
  !Module["STACK_SIZE"],
  "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time",
);
assert(
  typeof Int32Array != "undefined" &&
    typeof Float64Array !== "undefined" &&
    Int32Array.prototype.subarray != undefined &&
    Int32Array.prototype.set != undefined,
  "JS engine does not provide full typed array support",
);
assert(
  !Module["wasmMemory"],
  "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally",
);
assert(
  !Module["INITIAL_MEMORY"],
  "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically",
);
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  if (max == 0) {
    max += 4;
  }
  HEAPU32[max >> 2] = 34821223;
  HEAPU32[(max + 4) >> 2] = 2310721022;
  HEAPU32[0 >> 2] = 1668509029;
}
function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  if (max == 0) {
    max += 4;
  }
  var cookie1 = HEAPU32[max >> 2];
  var cookie2 = HEAPU32[(max + 4) >> 2];
  if (cookie1 != 34821223 || cookie2 != 2310721022) {
    abort(
      `Stack overflow! Stack cookie has been overwritten at ${ptrToString(
        max,
      )}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(
        cookie2,
      )} ${ptrToString(cookie1)}`,
    );
  }
  if (HEAPU32[0 >> 2] != 1668509029) {
    abort(
      "Runtime error: The application has corrupted its heap memory area (address zero)!",
    );
  }
}
(function () {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 25459;
  if (h8[0] !== 115 || h8[1] !== 99)
    throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
})();
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
function preRun() {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function")
      Module["preRun"] = [Module["preRun"]];
    while (Module["preRun"].length) {
      addOnPreRun(Module["preRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;
  checkStackCookie();
  callRuntimeCallbacks(__ATINIT__);
}
function postRun() {
  checkStackCookie();
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function")
      Module["postRun"] = [Module["postRun"]];
    while (Module["postRun"].length) {
      addOnPostRun(Module["postRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
assert(
  Math.imul,
  "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill",
);
assert(
  Math.fround,
  "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill",
);
assert(
  Math.clz32,
  "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill",
);
assert(
  Math.trunc,
  "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill",
);
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
var runDependencyTracking = {};
function addRunDependency(id) {
  runDependencies++;
  Module["monitorRunDependencies"]?.(runDependencies);
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval != "undefined") {
      runDependencyWatcher = setInterval(() => {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err("still waiting on run dependencies:");
          }
          err(`dependency: ${dep}`);
        }
        if (shown) {
          err("(end of list)");
        }
      }, 1e4);
    }
  } else {
    err("warning: run dependency added without ID");
  }
}
function removeRunDependency(id) {
  runDependencies--;
  Module["monitorRunDependencies"]?.(runDependencies);
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err("warning: run dependency removed without ID");
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
}
function abort(what) {
  Module["onAbort"]?.(what);
  what = "Aborted(" + what + ")";
  err(what);
  ABORT = true;
  EXITSTATUS = 1;
  var e = new WebAssembly.RuntimeError(what);
  throw e;
}
var FS = {
  error() {
    abort(
      "Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM",
    );
  },
  init() {
    FS.error();
  },
  createDataFile() {
    FS.error();
  },
  createPreloadedFile() {
    FS.error();
  },
  createLazyFile() {
    FS.error();
  },
  open() {
    FS.error();
  },
  mkdev() {
    FS.error();
  },
  registerDevice() {
    FS.error();
  },
  analyzePath() {
    FS.error();
  },
  ErrnoError() {
    FS.error();
  },
};
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
var dataURIPrefix = "data:application/octet-stream;base64,";
var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
var isFileURI = (filename) => filename.startsWith("file://");
function createExportWrapper(name) {
  return function () {
    assert(
      runtimeInitialized,
      `native function \`${name}\` called before runtime initialization`,
    );
    var f = wasmExports[name];
    assert(f, `exported native function \`${name}\` not found`);
    return f.apply(null, arguments);
  };
}
class EmscriptenEH extends Error {}
class EmscriptenSjLj extends EmscriptenEH {}
class CppException extends EmscriptenEH {
  constructor(excPtr) {
    super(excPtr);
    this.excPtr = excPtr;
    const excInfo = getExceptionMessage(excPtr);
    this.name = excInfo[0];
    this.message = excInfo[1];
  }
}
var wasmBinaryFile;
wasmBinaryFile = "wasm/cppmain.wasm";
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
}
function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw "both async and sync fetching of the wasm failed";
}
function getBinaryPromise(binaryFile) {
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
    if (typeof fetch == "function" && !isFileURI(binaryFile)) {
      return fetch(binaryFile, { credentials: "same-origin" })
        .then((response) => {
          if (!response["ok"]) {
            throw "failed to load wasm binary file at '" + binaryFile + "'";
          }
          return response["arrayBuffer"]();
        })
        .catch(() => getBinarySync(binaryFile));
    } else if (readAsync) {
      return new Promise((resolve, reject) => {
        readAsync(
          binaryFile,
          (response) => resolve(new Uint8Array(response)),
          reject,
        );
      });
    }
  }
  return Promise.resolve().then(() => getBinarySync(binaryFile));
}
function instantiateArrayBuffer(binaryFile, imports, receiver) {
  return getBinaryPromise(binaryFile)
    .then((binary) => WebAssembly.instantiate(binary, imports))
    .then((instance) => instance)
    .then(receiver, (reason) => {
      err(`failed to asynchronously prepare wasm: ${reason}`);
      if (isFileURI(wasmBinaryFile)) {
        err(
          `warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`,
        );
      }
      abort(reason);
    });
}
function instantiateAsync(binary, binaryFile, imports, callback) {
  if (
    !binary &&
    typeof WebAssembly.instantiateStreaming == "function" &&
    !isDataURI(binaryFile) &&
    !isFileURI(binaryFile) &&
    !ENVIRONMENT_IS_NODE &&
    typeof fetch == "function"
  ) {
    return fetch(binaryFile, { credentials: "same-origin" }).then(
      (response) => {
        var result = WebAssembly.instantiateStreaming(response, imports);
        return result.then(callback, function (reason) {
          err(`wasm streaming compile failed: ${reason}`);
          err("falling back to ArrayBuffer instantiation");
          return instantiateArrayBuffer(binaryFile, imports, callback);
        });
      },
    );
  }
  return instantiateArrayBuffer(binaryFile, imports, callback);
}
function createWasm() {
  var info = { env: wasmImports, wasi_snapshot_preview1: wasmImports };
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;
    wasmMemory = wasmExports["memory"];
    assert(wasmMemory, "memory not found in wasm exports");
    updateMemoryViews();
    wasmTable = wasmExports["__indirect_function_table"];
    assert(wasmTable, "table not found in wasm exports");
    addOnInit(wasmExports["__wasm_call_ctors"]);
    removeRunDependency("wasm-instantiate");
    return wasmExports;
  }
  addRunDependency("wasm-instantiate");
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    assert(
      Module === trueModule,
      "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?",
    );
    trueModule = null;
    receiveInstance(result["instance"]);
  }
  if (Module["instantiateWasm"]) {
    try {
      return Module["instantiateWasm"](info, receiveInstance);
    } catch (e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`);
      return false;
    }
  }
  instantiateAsync(
    wasmBinary,
    wasmBinaryFile,
    info,
    receiveInstantiationResult,
  );
  return {};
}
function legacyModuleProp(prop, newName, incomming = true) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      get() {
        let extra = incomming
          ? " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)"
          : "";
        abort(`\`Module.${prop}\` has been replaced by \`${newName}\`` + extra);
      },
    });
  }
}
function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(
      `\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`,
    );
  }
}
function isExportedByForceFilesystem(name) {
  return (
    name === "FS_createPath" ||
    name === "FS_createDataFile" ||
    name === "FS_createPreloadedFile" ||
    name === "FS_unlink" ||
    name === "addRunDependency" ||
    name === "FS_createLazyFile" ||
    name === "FS_createDevice" ||
    name === "removeRunDependency"
  );
}
function missingGlobal(sym, msg) {
  if (typeof globalThis !== "undefined") {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
        return undefined;
      },
    });
  }
}
missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");
missingGlobal("asm", "Please use wasmExports instead");
function missingLibrarySymbol(sym) {
  if (
    typeof globalThis !== "undefined" &&
    !Object.getOwnPropertyDescriptor(globalThis, sym)
  ) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
        var librarySymbol = sym;
        if (!librarySymbol.startsWith("_")) {
          librarySymbol = "$" + sym;
        }
        msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
        if (isExportedByForceFilesystem(sym)) {
          msg +=
            ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
        }
        warnOnce(msg);
        return undefined;
      },
    });
  }
  unexportedRuntimeSymbol(sym);
}
function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg +=
            ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
        }
        abort(msg);
      },
    });
  }
}
function console_log(logstr) {
  console.log("aaaaa " + UTF8ToString(logstr));
  return 0;
}
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = `Program terminated with exit(${status})`;
  this.status = status;
}
var callRuntimeCallbacks = (callbacks) => {
  while (callbacks.length > 0) {
    callbacks.shift()(Module);
  }
};
var withStackSave = (f) => {
  var stack = stackSave();
  var ret = f();
  stackRestore(stack);
  return ret;
};
var lengthBytesUTF8 = (str) => {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var c = str.charCodeAt(i);
    if (c <= 127) {
      len++;
    } else if (c <= 2047) {
      len += 2;
    } else if (c >= 55296 && c <= 57343) {
      len += 4;
      ++i;
    } else {
      len += 3;
    }
  }
  return len;
};
var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
  assert(
    typeof str === "string",
    `stringToUTF8Array expects a string (got ${typeof str})`,
  );
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = (65536 + ((u & 1023) << 10)) | (u1 & 1023);
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | (u >> 6);
      heap[outIdx++] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | (u >> 12);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      if (u > 1114111)
        warnOnce(
          "Invalid Unicode code point " +
            ptrToString(u) +
            " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).",
        );
      heap[outIdx++] = 240 | (u >> 18);
      heap[outIdx++] = 128 | ((u >> 12) & 63);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    }
  }
  heap[outIdx] = 0;
  return outIdx - startIdx;
};
var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
  assert(
    typeof maxBytesToWrite == "number",
    "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!",
  );
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
};
var stringToUTF8OnStack = (str) => {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8(str, ret, size);
  return ret;
};
var UTF8Decoder =
  typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;
var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
  }
  var str = "";
  while (idx < endPtr) {
    var u0 = heapOrArray[idx++];
    if (!(u0 & 128)) {
      str += String.fromCharCode(u0);
      continue;
    }
    var u1 = heapOrArray[idx++] & 63;
    if ((u0 & 224) == 192) {
      str += String.fromCharCode(((u0 & 31) << 6) | u1);
      continue;
    }
    var u2 = heapOrArray[idx++] & 63;
    if ((u0 & 240) == 224) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      if ((u0 & 248) != 240)
        warnOnce(
          "Invalid UTF-8 leading byte " +
            ptrToString(u0) +
            " encountered when deserializing a UTF-8 string in wasm memory to a JS string!",
        );
      u0 =
        ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
    }
    if (u0 < 65536) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 65536;
      str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
    }
  }
  return str;
};
var UTF8ToString = (ptr, maxBytesToRead) => {
  assert(
    typeof ptr == "number",
    `UTF8ToString expects a number (got ${typeof ptr})`,
  );
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
};
var demangle = (func) => {
  demangle.recursionGuard = (demangle.recursionGuard | 0) + 1;
  if (demangle.recursionGuard > 1) return func;
  return withStackSave(() => {
    try {
      var s = func;
      if (s.startsWith("__Z")) s = s.substr(1);
      var buf = stringToUTF8OnStack(s);
      var status = stackAlloc(4);
      var ret = ___cxa_demangle(buf, 0, 0, status);
      if (HEAP32[status >> 2] === 0 && ret) {
        return UTF8ToString(ret);
      }
    } catch (e) {
    } finally {
      _free(ret);
      if (demangle.recursionGuard < 2) --demangle.recursionGuard;
    }
    return func;
  });
};
var getExceptionMessageCommon = (ptr) =>
  withStackSave(() => {
    var type_addr_addr = stackAlloc(4);
    var message_addr_addr = stackAlloc(4);
    ___get_exception_message(ptr, type_addr_addr, message_addr_addr);
    var type_addr = HEAPU32[type_addr_addr >> 2];
    var message_addr = HEAPU32[message_addr_addr >> 2];
    var type = UTF8ToString(type_addr);
    _free(type_addr);
    var message;
    if (message_addr) {
      message = UTF8ToString(message_addr);
      _free(message_addr);
    }
    return [type, message];
  });
var getExceptionMessage = (ptr) => getExceptionMessageCommon(ptr);
Module["getExceptionMessage"] = getExceptionMessage;
var noExitRuntime = Module["noExitRuntime"] || true;
var ptrToString = (ptr) => {
  assert(typeof ptr === "number");
  ptr >>>= 0;
  return "0x" + ptr.toString(16).padStart(8, "0");
};
function jsStackTrace() {
  var error = new Error();
  if (!error.stack) {
    try {
      throw new Error();
    } catch (e) {
      error = e;
    }
    if (!error.stack) {
      return "(no stack trace available)";
    }
  }
  return error.stack.toString();
}
var demangleAll = (text) => {
  var regex = /\b_Z[\w\d_]+/g;
  return text.replace(regex, function (x) {
    var y = demangle(x);
    return x === y ? x : y + " [" + x + "]";
  });
};
var warnOnce = (text) => {
  warnOnce.shown ||= {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
    err(text);
  }
};
var ___assert_fail = (condition, filename, line, func) => {
  abort(
    `Assertion failed: ${UTF8ToString(condition)}, at: ` +
      [
        filename ? UTF8ToString(filename) : "unknown filename",
        line,
        func ? UTF8ToString(func) : "unknown function",
      ],
  );
};
var exceptionCaught = [];
var uncaughtExceptionCount = 0;
var ___cxa_begin_catch = (ptr) => {
  var info = new ExceptionInfo(ptr);
  if (!info.get_caught()) {
    info.set_caught(true);
    uncaughtExceptionCount--;
  }
  info.set_rethrown(false);
  exceptionCaught.push(info);
  ___cxa_increment_exception_refcount(info.excPtr);
  return info.get_exception_ptr();
};
var exceptionLast = 0;
class ExceptionInfo {
  constructor(excPtr) {
    this.excPtr = excPtr;
    this.ptr = excPtr - 24;
  }
  set_type(type) {
    HEAPU32[(this.ptr + 4) >> 2] = type;
  }
  get_type() {
    return HEAPU32[(this.ptr + 4) >> 2];
  }
  set_destructor(destructor) {
    HEAPU32[(this.ptr + 8) >> 2] = destructor;
  }
  get_destructor() {
    return HEAPU32[(this.ptr + 8) >> 2];
  }
  set_caught(caught) {
    caught = caught ? 1 : 0;
    HEAP8[(this.ptr + 12) >> 0] = caught;
  }
  get_caught() {
    return HEAP8[(this.ptr + 12) >> 0] != 0;
  }
  set_rethrown(rethrown) {
    rethrown = rethrown ? 1 : 0;
    HEAP8[(this.ptr + 13) >> 0] = rethrown;
  }
  get_rethrown() {
    return HEAP8[(this.ptr + 13) >> 0] != 0;
  }
  init(type, destructor) {
    this.set_adjusted_ptr(0);
    this.set_type(type);
    this.set_destructor(destructor);
  }
  set_adjusted_ptr(adjustedPtr) {
    HEAPU32[(this.ptr + 16) >> 2] = adjustedPtr;
  }
  get_adjusted_ptr() {
    return HEAPU32[(this.ptr + 16) >> 2];
  }
  get_exception_ptr() {
    var isPointer = ___cxa_is_pointer_type(this.get_type());
    if (isPointer) {
      return HEAPU32[this.excPtr >> 2];
    }
    var adjusted = this.get_adjusted_ptr();
    if (adjusted !== 0) return adjusted;
    return this.excPtr;
  }
}
var ___resumeException = (ptr) => {
  if (!exceptionLast) {
    exceptionLast = new CppException(ptr);
  }
  throw exceptionLast;
};
var findMatchingCatch = (args) => {
  var thrown = exceptionLast?.excPtr;
  if (!thrown) {
    setTempRet0(0);
    return 0;
  }
  var info = new ExceptionInfo(thrown);
  info.set_adjusted_ptr(thrown);
  var thrownType = info.get_type();
  if (!thrownType) {
    setTempRet0(0);
    return thrown;
  }
  for (var arg in args) {
    var caughtType = args[arg];
    if (caughtType === 0 || caughtType === thrownType) {
      break;
    }
    var adjusted_ptr_addr = info.ptr + 16;
    if (___cxa_can_catch(caughtType, thrownType, adjusted_ptr_addr)) {
      setTempRet0(caughtType);
      return thrown;
    }
  }
  setTempRet0(thrownType);
  return thrown;
};
var ___cxa_find_matching_catch_2 = () => findMatchingCatch([]);
var ___cxa_find_matching_catch_3 = (arg0) => findMatchingCatch([arg0]);
var ___cxa_throw = (ptr, type, destructor) => {
  var info = new ExceptionInfo(ptr);
  info.init(type, destructor);
  exceptionLast = new CppException(ptr);
  uncaughtExceptionCount++;
  throw exceptionLast;
};
var __embind_register_bigint = (
  primitiveType,
  name,
  size,
  minRange,
  maxRange,
) => {};
var embind_init_charCodes = () => {
  var codes = new Array(256);
  for (var i = 0; i < 256; ++i) {
    codes[i] = String.fromCharCode(i);
  }
  embind_charCodes = codes;
};
var embind_charCodes;
var readLatin1String = (ptr) => {
  var ret = "";
  var c = ptr;
  while (HEAPU8[c]) {
    ret += embind_charCodes[HEAPU8[c++]];
  }
  return ret;
};
var awaitingDependencies = {};
var registeredTypes = {};
var typeDependencies = {};
var BindingError;
var throwBindingError = (message) => {
  throw new BindingError(message);
};
var InternalError;
var throwInternalError = (message) => {
  throw new InternalError(message);
};
var whenDependentTypesAreResolved = (
  myTypes,
  dependentTypes,
  getTypeConverters,
) => {
  myTypes.forEach(function (type) {
    typeDependencies[type] = dependentTypes;
  });
  function onComplete(typeConverters) {
    var myTypeConverters = getTypeConverters(typeConverters);
    if (myTypeConverters.length !== myTypes.length) {
      throwInternalError("Mismatched type converter count");
    }
    for (var i = 0; i < myTypes.length; ++i) {
      registerType(myTypes[i], myTypeConverters[i]);
    }
  }
  var typeConverters = new Array(dependentTypes.length);
  var unregisteredTypes = [];
  var registered = 0;
  dependentTypes.forEach((dt, i) => {
    if (registeredTypes.hasOwnProperty(dt)) {
      typeConverters[i] = registeredTypes[dt];
    } else {
      unregisteredTypes.push(dt);
      if (!awaitingDependencies.hasOwnProperty(dt)) {
        awaitingDependencies[dt] = [];
      }
      awaitingDependencies[dt].push(() => {
        typeConverters[i] = registeredTypes[dt];
        ++registered;
        if (registered === unregisteredTypes.length) {
          onComplete(typeConverters);
        }
      });
    }
  });
  if (0 === unregisteredTypes.length) {
    onComplete(typeConverters);
  }
};
function sharedRegisterType(rawType, registeredInstance, options = {}) {
  var name = registeredInstance.name;
  if (!rawType) {
    throwBindingError(
      `type "${name}" must have a positive integer typeid pointer`,
    );
  }
  if (registeredTypes.hasOwnProperty(rawType)) {
    if (options.ignoreDuplicateRegistrations) {
      return;
    } else {
      throwBindingError(`Cannot register type '${name}' twice`);
    }
  }
  registeredTypes[rawType] = registeredInstance;
  delete typeDependencies[rawType];
  if (awaitingDependencies.hasOwnProperty(rawType)) {
    var callbacks = awaitingDependencies[rawType];
    delete awaitingDependencies[rawType];
    callbacks.forEach((cb) => cb());
  }
}
function registerType(rawType, registeredInstance, options = {}) {
  if (!("argPackAdvance" in registeredInstance)) {
    throw new TypeError(
      "registerType registeredInstance requires argPackAdvance",
    );
  }
  return sharedRegisterType(rawType, registeredInstance, options);
}
var GenericWireTypeSize = 8;
var __embind_register_bool = (rawType, name, trueValue, falseValue) => {
  name = readLatin1String(name);
  registerType(rawType, {
    name: name,
    fromWireType: function (wt) {
      return !!wt;
    },
    toWireType: function (destructors, o) {
      return o ? trueValue : falseValue;
    },
    argPackAdvance: GenericWireTypeSize,
    readValueFromPointer: function (pointer) {
      return this["fromWireType"](HEAPU8[pointer]);
    },
    destructorFunction: null,
  });
};
class HandleAllocator {
  constructor() {
    this.allocated = [undefined];
    this.freelist = [];
  }
  get(id) {
    assert(this.allocated[id] !== undefined, `invalid handle: ${id}`);
    return this.allocated[id];
  }
  has(id) {
    return this.allocated[id] !== undefined;
  }
  allocate(handle) {
    var id = this.freelist.pop() || this.allocated.length;
    this.allocated[id] = handle;
    return id;
  }
  free(id) {
    assert(this.allocated[id] !== undefined);
    this.allocated[id] = undefined;
    this.freelist.push(id);
  }
}
var emval_handles = new HandleAllocator();
var __emval_decref = (handle) => {
  if (
    handle >= emval_handles.reserved &&
    0 === --emval_handles.get(handle).refcount
  ) {
    emval_handles.free(handle);
  }
};
var count_emval_handles = () => {
  var count = 0;
  for (
    var i = emval_handles.reserved;
    i < emval_handles.allocated.length;
    ++i
  ) {
    if (emval_handles.allocated[i] !== undefined) {
      ++count;
    }
  }
  return count;
};
var init_emval = () => {
  emval_handles.allocated.push(
    { value: undefined },
    { value: null },
    { value: true },
    { value: false },
  );
  Object.assign(emval_handles, { reserved: emval_handles.allocated.length }),
    (Module["count_emval_handles"] = count_emval_handles);
};
var Emval = {
  toValue: (handle) => {
    if (!handle) {
      throwBindingError("Cannot use deleted val. handle = " + handle);
    }
    return emval_handles.get(handle).value;
  },
  toHandle: (value) => {
    switch (value) {
      case undefined:
        return 1;
      case null:
        return 2;
      case true:
        return 3;
      case false:
        return 4;
      default: {
        return emval_handles.allocate({ refcount: 1, value: value });
      }
    }
  },
};
function simpleReadValueFromPointer(pointer) {
  return this["fromWireType"](HEAP32[pointer >> 2]);
}
var EmValType = {
  name: "emscripten::val",
  fromWireType: (handle) => {
    var rv = Emval.toValue(handle);
    __emval_decref(handle);
    return rv;
  },
  toWireType: (destructors, value) => Emval.toHandle(value),
  argPackAdvance: GenericWireTypeSize,
  readValueFromPointer: simpleReadValueFromPointer,
  destructorFunction: null,
};
var __embind_register_emval = (rawType) => registerType(rawType, EmValType);
var embindRepr = (v) => {
  if (v === null) {
    return "null";
  }
  var t = typeof v;
  if (t === "object" || t === "array" || t === "function") {
    return v.toString();
  } else {
    return "" + v;
  }
};
var floatReadValueFromPointer = (name, width) => {
  switch (width) {
    case 4:
      return function (pointer) {
        return this["fromWireType"](HEAPF32[pointer >> 2]);
      };
    case 8:
      return function (pointer) {
        return this["fromWireType"](HEAPF64[pointer >> 3]);
      };
    default:
      throw new TypeError(`invalid float width (${width}): ${name}`);
  }
};
var __embind_register_float = (rawType, name, size) => {
  name = readLatin1String(name);
  registerType(rawType, {
    name: name,
    fromWireType: (value) => value,
    toWireType: (destructors, value) => {
      if (typeof value != "number" && typeof value != "boolean") {
        throw new TypeError(
          `Cannot convert ${embindRepr(value)} to ${this.name}`,
        );
      }
      return value;
    },
    argPackAdvance: GenericWireTypeSize,
    readValueFromPointer: floatReadValueFromPointer(name, size),
    destructorFunction: null,
  });
};
var createNamedFunction = (name, body) =>
  Object.defineProperty(body, "name", { value: name });
var runDestructors = (destructors) => {
  while (destructors.length) {
    var ptr = destructors.pop();
    var del = destructors.pop();
    del(ptr);
  }
};
function usesDestructorStack(argTypes) {
  for (var i = 1; i < argTypes.length; ++i) {
    if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
      return true;
    }
  }
  return false;
}
function newFunc(constructor, argumentList) {
  if (!(constructor instanceof Function)) {
    throw new TypeError(
      `new_ called with constructor type ${typeof constructor} which is not a function`,
    );
  }
  var dummy = createNamedFunction(
    constructor.name || "unknownFunctionName",
    function () {},
  );
  dummy.prototype = constructor.prototype;
  var obj = new dummy();
  var r = constructor.apply(obj, argumentList);
  return r instanceof Object ? r : obj;
}
function createJsInvoker(
  humanName,
  argTypes,
  isClassMethodFunc,
  returns,
  isAsync,
) {
  var needsDestructorStack = usesDestructorStack(argTypes);
  var argCount = argTypes.length;
  var argsList = "";
  var argsListWired = "";
  for (var i = 0; i < argCount - 2; ++i) {
    argsList += (i !== 0 ? ", " : "") + "arg" + i;
    argsListWired += (i !== 0 ? ", " : "") + "arg" + i + "Wired";
  }
  var invokerFnBody = `\n        return function (${argsList}) {\n        if (arguments.length !== ${
    argCount - 2
  }) {\n          throwBindingError('function ${humanName} called with ' + arguments.length + ' arguments, expected ${
    argCount - 2
  }');\n        }`;
  if (needsDestructorStack) {
    invokerFnBody += "var destructors = [];\n";
  }
  var dtorStack = needsDestructorStack ? "destructors" : "null";
  var args1 = [
    "throwBindingError",
    "invoker",
    "fn",
    "runDestructors",
    "retType",
    "classParam",
  ];
  if (isClassMethodFunc) {
    invokerFnBody +=
      "var thisWired = classParam['toWireType'](" + dtorStack + ", this);\n";
  }
  for (var i = 0; i < argCount - 2; ++i) {
    invokerFnBody +=
      "var arg" +
      i +
      "Wired = argType" +
      i +
      "['toWireType'](" +
      dtorStack +
      ", arg" +
      i +
      "); // " +
      argTypes[i + 2].name +
      "\n";
    args1.push("argType" + i);
  }
  if (isClassMethodFunc) {
    argsListWired =
      "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
  }
  invokerFnBody +=
    (returns || isAsync ? "var rv = " : "") +
    "invoker(fn" +
    (argsListWired.length > 0 ? ", " : "") +
    argsListWired +
    ");\n";
  if (needsDestructorStack) {
    invokerFnBody += "runDestructors(destructors);\n";
  } else {
    for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
      var paramName = i === 1 ? "thisWired" : "arg" + (i - 2) + "Wired";
      if (argTypes[i].destructorFunction !== null) {
        invokerFnBody +=
          paramName + "_dtor(" + paramName + "); // " + argTypes[i].name + "\n";
        args1.push(paramName + "_dtor");
      }
    }
  }
  if (returns) {
    invokerFnBody +=
      "var ret = retType['fromWireType'](rv);\n" + "return ret;\n";
  } else {
  }
  invokerFnBody += "}\n";
  invokerFnBody = `if (arguments.length !== ${args1.length}){ throw new Error("${humanName} Expected ${args1.length} closure arguments " + arguments.length + " given."); }\n${invokerFnBody}`;
  return [args1, invokerFnBody];
}
function craftInvokerFunction(
  humanName,
  argTypes,
  classType,
  cppInvokerFunc,
  cppTargetFunc,
  isAsync,
) {
  var argCount = argTypes.length;
  if (argCount < 2) {
    throwBindingError(
      "argTypes array size mismatch! Must at least get return value and 'this' types!",
    );
  }
  assert(!isAsync, "Async bindings are only supported with JSPI.");
  var isClassMethodFunc = argTypes[1] !== null && classType !== null;
  var needsDestructorStack = usesDestructorStack(argTypes);
  var returns = argTypes[0].name !== "void";
  var closureArgs = [
    throwBindingError,
    cppInvokerFunc,
    cppTargetFunc,
    runDestructors,
    argTypes[0],
    argTypes[1],
  ];
  for (var i = 0; i < argCount - 2; ++i) {
    closureArgs.push(argTypes[i + 2]);
  }
  if (!needsDestructorStack) {
    for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
      if (argTypes[i].destructorFunction !== null) {
        closureArgs.push(argTypes[i].destructorFunction);
      }
    }
  }
  let [args, invokerFnBody] = createJsInvoker(
    humanName,
    argTypes,
    isClassMethodFunc,
    returns,
    isAsync,
  );
  args.push(invokerFnBody);
  var invokerFn = newFunc(Function, args).apply(null, closureArgs);
  return createNamedFunction(humanName, invokerFn);
}
var ensureOverloadTable = (proto, methodName, humanName) => {
  if (undefined === proto[methodName].overloadTable) {
    var prevFunc = proto[methodName];
    proto[methodName] = function () {
      if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
        throwBindingError(
          `Function '${humanName}' called with an invalid number of arguments (${arguments.length}) - expects one of (${proto[methodName].overloadTable})!`,
        );
      }
      return proto[methodName].overloadTable[arguments.length].apply(
        this,
        arguments,
      );
    };
    proto[methodName].overloadTable = [];
    proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
  }
};
var exposePublicSymbol = (name, value, numArguments) => {
  if (Module.hasOwnProperty(name)) {
    if (
      undefined === numArguments ||
      (undefined !== Module[name].overloadTable &&
        undefined !== Module[name].overloadTable[numArguments])
    ) {
      throwBindingError(`Cannot register public name '${name}' twice`);
    }
    ensureOverloadTable(Module, name, name);
    if (Module.hasOwnProperty(numArguments)) {
      throwBindingError(
        `Cannot register multiple overloads of a function with the same number of arguments (${numArguments})!`,
      );
    }
    Module[name].overloadTable[numArguments] = value;
  } else {
    Module[name] = value;
    if (undefined !== numArguments) {
      Module[name].numArguments = numArguments;
    }
  }
};
var heap32VectorToArray = (count, firstElement) => {
  var array = [];
  for (var i = 0; i < count; i++) {
    array.push(HEAPU32[(firstElement + i * 4) >> 2]);
  }
  return array;
};
var replacePublicSymbol = (name, value, numArguments) => {
  if (!Module.hasOwnProperty(name)) {
    throwInternalError("Replacing nonexistant public symbol");
  }
  if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
    Module[name].overloadTable[numArguments] = value;
  } else {
    Module[name] = value;
    Module[name].argCount = numArguments;
  }
};
var dynCallLegacy = (sig, ptr, args) => {
  assert(
    "dynCall_" + sig in Module,
    `bad function pointer type - dynCall function not found for sig '${sig}'`,
  );
  if (args?.length) {
    assert(args.length === sig.substring(1).replace(/j/g, "--").length);
  } else {
    assert(sig.length == 1);
  }
  var f = Module["dynCall_" + sig];
  return args && args.length
    ? f.apply(null, [ptr].concat(args))
    : f.call(null, ptr);
};
var wasmTableMirror = [];
var wasmTable;
var getWasmTableEntry = (funcPtr) => {
  var func = wasmTableMirror[funcPtr];
  if (!func) {
    if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
    wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
  }
  assert(
    wasmTable.get(funcPtr) == func,
    "JavaScript-side Wasm function table mirror is out of date!",
  );
  return func;
};
var dynCall = (sig, ptr, args) => {
  if (sig.includes("j")) {
    return dynCallLegacy(sig, ptr, args);
  }
  assert(getWasmTableEntry(ptr), `missing table entry in dynCall: ${ptr}`);
  var rtn = getWasmTableEntry(ptr).apply(null, args);
  return rtn;
};
var getDynCaller = (sig, ptr) => {
  assert(
    sig.includes("j") || sig.includes("p"),
    "getDynCaller should only be called with i64 sigs",
  );
  var argCache = [];
  return function () {
    argCache.length = 0;
    Object.assign(argCache, arguments);
    return dynCall(sig, ptr, argCache);
  };
};
var embind__requireFunction = (signature, rawFunction) => {
  signature = readLatin1String(signature);
  function makeDynCaller() {
    if (signature.includes("j")) {
      return getDynCaller(signature, rawFunction);
    }
    return getWasmTableEntry(rawFunction);
  }
  var fp = makeDynCaller();
  if (typeof fp != "function") {
    throwBindingError(
      `unknown function pointer with signature ${signature}: ${rawFunction}`,
    );
  }
  return fp;
};
var extendError = (baseErrorType, errorName) => {
  var errorClass = createNamedFunction(errorName, function (message) {
    this.name = errorName;
    this.message = message;
    var stack = new Error(message).stack;
    if (stack !== undefined) {
      this.stack =
        this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
    }
  });
  errorClass.prototype = Object.create(baseErrorType.prototype);
  errorClass.prototype.constructor = errorClass;
  errorClass.prototype.toString = function () {
    if (this.message === undefined) {
      return this.name;
    } else {
      return `${this.name}: ${this.message}`;
    }
  };
  return errorClass;
};
var UnboundTypeError;
var getTypeName = (type) => {
  var ptr = ___getTypeName(type);
  var rv = readLatin1String(ptr);
  _free(ptr);
  return rv;
};
var throwUnboundTypeError = (message, types) => {
  var unboundTypes = [];
  var seen = {};
  function visit(type) {
    if (seen[type]) {
      return;
    }
    if (registeredTypes[type]) {
      return;
    }
    if (typeDependencies[type]) {
      typeDependencies[type].forEach(visit);
      return;
    }
    unboundTypes.push(type);
    seen[type] = true;
  }
  types.forEach(visit);
  throw new UnboundTypeError(
    `${message}: ` + unboundTypes.map(getTypeName).join([", "]),
  );
};
var getFunctionName = (signature) => {
  signature = signature.trim();
  const argsIndex = signature.indexOf("(");
  if (argsIndex !== -1) {
    assert(
      signature[signature.length - 1] == ")",
      "Parentheses for argument names should match.",
    );
    return signature.substr(0, argsIndex);
  } else {
    return signature;
  }
};
var __embind_register_function = (
  name,
  argCount,
  rawArgTypesAddr,
  signature,
  rawInvoker,
  fn,
  isAsync,
) => {
  var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
  name = readLatin1String(name);
  name = getFunctionName(name);
  rawInvoker = embind__requireFunction(signature, rawInvoker);
  exposePublicSymbol(
    name,
    function () {
      throwUnboundTypeError(
        `Cannot call ${name} due to unbound types`,
        argTypes,
      );
    },
    argCount - 1,
  );
  whenDependentTypesAreResolved([], argTypes, function (argTypes) {
    var invokerArgsArray = [argTypes[0], null].concat(argTypes.slice(1));
    replacePublicSymbol(
      name,
      craftInvokerFunction(
        name,
        invokerArgsArray,
        null,
        rawInvoker,
        fn,
        isAsync,
      ),
      argCount - 1,
    );
    return [];
  });
};
var integerReadValueFromPointer = (name, width, signed) => {
  switch (width) {
    case 1:
      return signed
        ? (pointer) => HEAP8[pointer >> 0]
        : (pointer) => HEAPU8[pointer >> 0];
    case 2:
      return signed
        ? (pointer) => HEAP16[pointer >> 1]
        : (pointer) => HEAPU16[pointer >> 1];
    case 4:
      return signed
        ? (pointer) => HEAP32[pointer >> 2]
        : (pointer) => HEAPU32[pointer >> 2];
    default:
      throw new TypeError(`invalid integer width (${width}): ${name}`);
  }
};
var __embind_register_integer = (
  primitiveType,
  name,
  size,
  minRange,
  maxRange,
) => {
  name = readLatin1String(name);
  if (maxRange === -1) {
    maxRange = 4294967295;
  }
  var fromWireType = (value) => value;
  if (minRange === 0) {
    var bitshift = 32 - 8 * size;
    fromWireType = (value) => (value << bitshift) >>> bitshift;
  }
  var isUnsignedType = name.includes("unsigned");
  var checkAssertions = (value, toTypeName) => {
    if (typeof value != "number" && typeof value != "boolean") {
      throw new TypeError(
        `Cannot convert "${embindRepr(value)}" to ${toTypeName}`,
      );
    }
    if (value < minRange || value > maxRange) {
      throw new TypeError(
        `Passing a number "${embindRepr(
          value,
        )}" from JS side to C/C++ side to an argument of type "${name}", which is outside the valid range [${minRange}, ${maxRange}]!`,
      );
    }
  };
  var toWireType;
  if (isUnsignedType) {
    toWireType = function (destructors, value) {
      checkAssertions(value, this.name);
      return value >>> 0;
    };
  } else {
    toWireType = function (destructors, value) {
      checkAssertions(value, this.name);
      return value;
    };
  }
  registerType(primitiveType, {
    name: name,
    fromWireType: fromWireType,
    toWireType: toWireType,
    argPackAdvance: GenericWireTypeSize,
    readValueFromPointer: integerReadValueFromPointer(
      name,
      size,
      minRange !== 0,
    ),
    destructorFunction: null,
  });
};
var __embind_register_memory_view = (rawType, dataTypeIndex, name) => {
  var typeMapping = [
    Int8Array,
    Uint8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
  ];
  var TA = typeMapping[dataTypeIndex];
  function decodeMemoryView(handle) {
    var size = HEAPU32[handle >> 2];
    var data = HEAPU32[(handle + 4) >> 2];
    return new TA(HEAP8.buffer, data, size);
  }
  name = readLatin1String(name);
  registerType(
    rawType,
    {
      name: name,
      fromWireType: decodeMemoryView,
      argPackAdvance: GenericWireTypeSize,
      readValueFromPointer: decodeMemoryView,
    },
    { ignoreDuplicateRegistrations: true },
  );
};
function readPointer(pointer) {
  return this["fromWireType"](HEAPU32[pointer >> 2]);
}
var __embind_register_std_string = (rawType, name) => {
  name = readLatin1String(name);
  var stdStringIsUTF8 = name === "std::string";
  registerType(rawType, {
    name: name,
    fromWireType(value) {
      var length = HEAPU32[value >> 2];
      var payload = value + 4;
      var str;
      if (stdStringIsUTF8) {
        var decodeStartPtr = payload;
        for (var i = 0; i <= length; ++i) {
          var currentBytePtr = payload + i;
          if (i == length || HEAPU8[currentBytePtr] == 0) {
            var maxRead = currentBytePtr - decodeStartPtr;
            var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
            if (str === undefined) {
              str = stringSegment;
            } else {
              str += String.fromCharCode(0);
              str += stringSegment;
            }
            decodeStartPtr = currentBytePtr + 1;
          }
        }
      } else {
        var a = new Array(length);
        for (var i = 0; i < length; ++i) {
          a[i] = String.fromCharCode(HEAPU8[payload + i]);
        }
        str = a.join("");
      }
      _free(value);
      return str;
    },
    toWireType(destructors, value) {
      if (value instanceof ArrayBuffer) {
        value = new Uint8Array(value);
      }
      var length;
      var valueIsOfTypeString = typeof value == "string";
      if (
        !(
          valueIsOfTypeString ||
          value instanceof Uint8Array ||
          value instanceof Uint8ClampedArray ||
          value instanceof Int8Array
        )
      ) {
        throwBindingError("Cannot pass non-string to std::string");
      }
      if (stdStringIsUTF8 && valueIsOfTypeString) {
        length = lengthBytesUTF8(value);
      } else {
        length = value.length;
      }
      var base = _malloc(4 + length + 1);
      var ptr = base + 4;
      HEAPU32[base >> 2] = length;
      if (stdStringIsUTF8 && valueIsOfTypeString) {
        stringToUTF8(value, ptr, length + 1);
      } else {
        if (valueIsOfTypeString) {
          for (var i = 0; i < length; ++i) {
            var charCode = value.charCodeAt(i);
            if (charCode > 255) {
              _free(ptr);
              throwBindingError(
                "String has UTF-16 code units that do not fit in 8 bits",
              );
            }
            HEAPU8[ptr + i] = charCode;
          }
        } else {
          for (var i = 0; i < length; ++i) {
            HEAPU8[ptr + i] = value[i];
          }
        }
      }
      if (destructors !== null) {
        destructors.push(_free, base);
      }
      return base;
    },
    argPackAdvance: GenericWireTypeSize,
    readValueFromPointer: readPointer,
    destructorFunction(ptr) {
      _free(ptr);
    },
  });
};
var UTF16Decoder =
  typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : undefined;
var UTF16ToString = (ptr, maxBytesToRead) => {
  assert(
    ptr % 2 == 0,
    "Pointer passed to UTF16ToString must be aligned to two bytes!",
  );
  var endPtr = ptr;
  var idx = endPtr >> 1;
  var maxIdx = idx + maxBytesToRead / 2;
  while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
  endPtr = idx << 1;
  if (endPtr - ptr > 32 && UTF16Decoder)
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  var str = "";
  for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
    var codeUnit = HEAP16[(ptr + i * 2) >> 1];
    if (codeUnit == 0) break;
    str += String.fromCharCode(codeUnit);
  }
  return str;
};
var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
  assert(
    outPtr % 2 == 0,
    "Pointer passed to stringToUTF16 must be aligned to two bytes!",
  );
  assert(
    typeof maxBytesToWrite == "number",
    "stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!",
  );
  maxBytesToWrite ??= 2147483647;
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2;
  var startPtr = outPtr;
  var numCharsToWrite =
    maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    var codeUnit = str.charCodeAt(i);
    HEAP16[outPtr >> 1] = codeUnit;
    outPtr += 2;
  }
  HEAP16[outPtr >> 1] = 0;
  return outPtr - startPtr;
};
var lengthBytesUTF16 = (str) => str.length * 2;
var UTF32ToString = (ptr, maxBytesToRead) => {
  assert(
    ptr % 4 == 0,
    "Pointer passed to UTF32ToString must be aligned to four bytes!",
  );
  var i = 0;
  var str = "";
  while (!(i >= maxBytesToRead / 4)) {
    var utf32 = HEAP32[(ptr + i * 4) >> 2];
    if (utf32 == 0) break;
    ++i;
    if (utf32 >= 65536) {
      var ch = utf32 - 65536;
      str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
  return str;
};
var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
  assert(
    outPtr % 4 == 0,
    "Pointer passed to stringToUTF32 must be aligned to four bytes!",
  );
  assert(
    typeof maxBytesToWrite == "number",
    "stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!",
  );
  maxBytesToWrite ??= 2147483647;
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 55296 && codeUnit <= 57343) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = (65536 + ((codeUnit & 1023) << 10)) | (trailSurrogate & 1023);
    }
    HEAP32[outPtr >> 2] = codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  HEAP32[outPtr >> 2] = 0;
  return outPtr - startPtr;
};
var lengthBytesUTF32 = (str) => {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
    len += 4;
  }
  return len;
};
var __embind_register_std_wstring = (rawType, charSize, name) => {
  name = readLatin1String(name);
  var decodeString, encodeString, getHeap, lengthBytesUTF, shift;
  if (charSize === 2) {
    decodeString = UTF16ToString;
    encodeString = stringToUTF16;
    lengthBytesUTF = lengthBytesUTF16;
    getHeap = () => HEAPU16;
    shift = 1;
  } else if (charSize === 4) {
    decodeString = UTF32ToString;
    encodeString = stringToUTF32;
    lengthBytesUTF = lengthBytesUTF32;
    getHeap = () => HEAPU32;
    shift = 2;
  }
  registerType(rawType, {
    name: name,
    fromWireType: (value) => {
      var length = HEAPU32[value >> 2];
      var HEAP = getHeap();
      var str;
      var decodeStartPtr = value + 4;
      for (var i = 0; i <= length; ++i) {
        var currentBytePtr = value + 4 + i * charSize;
        if (i == length || HEAP[currentBytePtr >> shift] == 0) {
          var maxReadBytes = currentBytePtr - decodeStartPtr;
          var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
          if (str === undefined) {
            str = stringSegment;
          } else {
            str += String.fromCharCode(0);
            str += stringSegment;
          }
          decodeStartPtr = currentBytePtr + charSize;
        }
      }
      _free(value);
      return str;
    },
    toWireType: (destructors, value) => {
      if (!(typeof value == "string")) {
        throwBindingError(`Cannot pass non-string to C++ string type ${name}`);
      }
      var length = lengthBytesUTF(value);
      var ptr = _malloc(4 + length + charSize);
      HEAPU32[ptr >> 2] = length >> shift;
      encodeString(value, ptr + 4, length + charSize);
      if (destructors !== null) {
        destructors.push(_free, ptr);
      }
      return ptr;
    },
    argPackAdvance: GenericWireTypeSize,
    readValueFromPointer: simpleReadValueFromPointer,
    destructorFunction(ptr) {
      _free(ptr);
    },
  });
};
var __embind_register_void = (rawType, name) => {
  name = readLatin1String(name);
  registerType(rawType, {
    isVoid: true,
    name: name,
    argPackAdvance: 0,
    fromWireType: () => undefined,
    toWireType: (destructors, o) => undefined,
  });
};
var requireRegisteredType = (rawType, humanName) => {
  var impl = registeredTypes[rawType];
  if (undefined === impl) {
    throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
  }
  return impl;
};
var emval_returnValue = (returnType, destructorsRef, handle) => {
  var destructors = [];
  var result = returnType["toWireType"](destructors, handle);
  if (destructors.length) {
    HEAPU32[destructorsRef >> 2] = Emval.toHandle(destructors);
  }
  return result;
};
var __emval_as = (handle, returnType, destructorsRef) => {
  handle = Emval.toValue(handle);
  returnType = requireRegisteredType(returnType, "emval::as");
  return emval_returnValue(returnType, destructorsRef, handle);
};
var emval_methodCallers = [];
var __emval_call = (caller, handle, destructorsRef, args) => {
  caller = emval_methodCallers[caller];
  handle = Emval.toValue(handle);
  return caller(null, handle, destructorsRef, args);
};
var emval_symbols = {};
var getStringOrSymbol = (address) => {
  var symbol = emval_symbols[address];
  if (symbol === undefined) {
    return readLatin1String(address);
  }
  return symbol;
};
var __emval_call_method = (
  caller,
  objHandle,
  methodName,
  destructorsRef,
  args,
) => {
  caller = emval_methodCallers[caller];
  objHandle = Emval.toValue(objHandle);
  methodName = getStringOrSymbol(methodName);
  return caller(objHandle, objHandle[methodName], destructorsRef, args);
};
var emval_get_global = () => {
  if (typeof globalThis == "object") {
    return globalThis;
  }
  return (function () {
    return Function;
  })()("return this")();
};
var __emval_get_global = (name) => {
  if (name === 0) {
    return Emval.toHandle(emval_get_global());
  } else {
    name = getStringOrSymbol(name);
    return Emval.toHandle(emval_get_global()[name]);
  }
};
var emval_addMethodCaller = (caller) => {
  var id = emval_methodCallers.length;
  emval_methodCallers.push(caller);
  return id;
};
var emval_lookupTypes = (argCount, argTypes) => {
  var a = new Array(argCount);
  for (var i = 0; i < argCount; ++i) {
    a[i] = requireRegisteredType(
      HEAPU32[(argTypes + i * 4) >> 2],
      "parameter " + i,
    );
  }
  return a;
};
var reflectConstruct = Reflect.construct;
var __emval_get_method_caller = (argCount, argTypes, kind) => {
  var types = emval_lookupTypes(argCount, argTypes);
  var retType = types.shift();
  argCount--;
  var functionBody = `return function (obj, func, destructorsRef, args) {\n`;
  var offset = 0;
  var argsList = [];
  if (kind === 0) {
    argsList.push("obj");
  }
  var params = ["retType"];
  var args = [retType];
  for (var i = 0; i < argCount; ++i) {
    argsList.push("arg" + i);
    params.push("argType" + i);
    args.push(types[i]);
    functionBody += `  var arg${i} = argType${i}.readValueFromPointer(args${
      offset ? "+" + offset : ""
    });\n`;
    offset += types[i]["argPackAdvance"];
  }
  var invoker = kind === 1 ? "new func" : "func.call";
  functionBody += `  var rv = ${invoker}(${argsList.join(", ")});\n`;
  if (!retType.isVoid) {
    params.push("emval_returnValue");
    args.push(emval_returnValue);
    functionBody +=
      "  return emval_returnValue(retType, destructorsRef, rv);\n";
  }
  functionBody += "};\n";
  params.push(functionBody);
  var invokerFunction = newFunc(Function, params).apply(null, args);
  var functionName = `methodCaller<(${types
    .map((t) => t.name)
    .join(", ")}) => ${retType.name}>`;
  return emval_addMethodCaller(
    createNamedFunction(functionName, invokerFunction),
  );
};
var __emval_get_property = (handle, key) => {
  handle = Emval.toValue(handle);
  key = Emval.toValue(key);
  return Emval.toHandle(handle[key]);
};
var __emval_incref = (handle) => {
  if (handle > 4) {
    emval_handles.get(handle).refcount += 1;
  }
};
var __emval_new_array = () => Emval.toHandle([]);
var __emval_new_cstring = (v) => Emval.toHandle(getStringOrSymbol(v));
var __emval_new_object = () => Emval.toHandle({});
var __emval_run_destructors = (handle) => {
  var destructors = Emval.toValue(handle);
  runDestructors(destructors);
  __emval_decref(handle);
};
var __emval_set_property = (handle, key, value) => {
  handle = Emval.toValue(handle);
  key = Emval.toValue(key);
  value = Emval.toValue(value);
  handle[key] = value;
};
var __emval_take_value = (type, arg) => {
  type = requireRegisteredType(type, "_emval_take_value");
  var v = type["readValueFromPointer"](arg);
  return Emval.toHandle(v);
};
var _abort = () => {
  abort("native code called abort()");
};
var _emscripten_memcpy_js = (dest, src, num) =>
  HEAPU8.copyWithin(dest, src, src + num);
var getHeapMax = () => 2147483648;
var growMemory = (size) => {
  var b = wasmMemory.buffer;
  var pages = (size - b.byteLength + 65535) / 65536;
  try {
    wasmMemory.grow(pages);
    updateMemoryViews();
    return 1;
  } catch (e) {
    err(
      `growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`,
    );
  }
};
var _emscripten_resize_heap = (requestedSize) => {
  var oldSize = HEAPU8.length;
  requestedSize >>>= 0;
  assert(requestedSize > oldSize);
  var maxHeapSize = getHeapMax();
  if (requestedSize > maxHeapSize) {
    err(
      `Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`,
    );
    return false;
  }
  var alignUp = (x, multiple) => x + ((multiple - (x % multiple)) % multiple);
  for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
    var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
    overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
    var newSize = Math.min(
      maxHeapSize,
      alignUp(Math.max(requestedSize, overGrownHeapSize), 65536),
    );
    var replacement = growMemory(newSize);
    if (replacement) {
      return true;
    }
  }
  err(
    `Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`,
  );
  return false;
};
var SYSCALLS = {
  varargs: undefined,
  get() {
    assert(SYSCALLS.varargs != undefined);
    var ret = HEAP32[+SYSCALLS.varargs >> 2];
    SYSCALLS.varargs += 4;
    return ret;
  },
  getp() {
    return SYSCALLS.get();
  },
  getStr(ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  },
};
var _fd_close = (fd) => {
  abort("fd_close called without SYSCALLS_REQUIRE_FILESYSTEM");
};
var convertI32PairToI53Checked = (lo, hi) => {
  assert(lo == lo >>> 0 || lo == (lo | 0));
  assert(hi === (hi | 0));
  return (hi + 2097152) >>> 0 < 4194305 - !!lo
    ? (lo >>> 0) + hi * 4294967296
    : NaN;
};
function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
  var offset = convertI32PairToI53Checked(offset_low, offset_high);
  return 70;
}
var printCharBuffers = [null, [], []];
var printChar = (stream, curr) => {
  var buffer = printCharBuffers[stream];
  assert(buffer);
  if (curr === 0 || curr === 10) {
    (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
    buffer.length = 0;
  } else {
    buffer.push(curr);
  }
};
var flush_NO_FILESYSTEM = () => {
  _fflush(0);
  if (printCharBuffers[1].length) printChar(1, 10);
  if (printCharBuffers[2].length) printChar(2, 10);
};
var _fd_write = (fd, iov, iovcnt, pnum) => {
  var num = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAPU32[iov >> 2];
    var len = HEAPU32[(iov + 4) >> 2];
    iov += 8;
    for (var j = 0; j < len; j++) {
      printChar(fd, HEAPU8[ptr + j]);
    }
    num += len;
  }
  HEAPU32[pnum >> 2] = num;
  return 0;
};
embind_init_charCodes();
BindingError = Module["BindingError"] = class BindingError extends Error {
  constructor(message) {
    super(message);
    this.name = "BindingError";
  }
};
InternalError = Module["InternalError"] = class InternalError extends Error {
  constructor(message) {
    super(message);
    this.name = "InternalError";
  }
};
init_emval();
UnboundTypeError = Module["UnboundTypeError"] = extendError(
  Error,
  "UnboundTypeError",
);
function checkIncomingModuleAPI() {
  ignoredModuleProp("fetchSettings");
}
var wasmImports = {
  __assert_fail: ___assert_fail,
  __cxa_begin_catch: ___cxa_begin_catch,
  __cxa_find_matching_catch_2: ___cxa_find_matching_catch_2,
  __cxa_find_matching_catch_3: ___cxa_find_matching_catch_3,
  __cxa_throw: ___cxa_throw,
  __resumeException: ___resumeException,
  _embind_register_bigint: __embind_register_bigint,
  _embind_register_bool: __embind_register_bool,
  _embind_register_emval: __embind_register_emval,
  _embind_register_float: __embind_register_float,
  _embind_register_function: __embind_register_function,
  _embind_register_integer: __embind_register_integer,
  _embind_register_memory_view: __embind_register_memory_view,
  _embind_register_std_string: __embind_register_std_string,
  _embind_register_std_wstring: __embind_register_std_wstring,
  _embind_register_void: __embind_register_void,
  _emval_as: __emval_as,
  _emval_call: __emval_call,
  _emval_call_method: __emval_call_method,
  _emval_decref: __emval_decref,
  _emval_get_global: __emval_get_global,
  _emval_get_method_caller: __emval_get_method_caller,
  _emval_get_property: __emval_get_property,
  _emval_incref: __emval_incref,
  _emval_new_array: __emval_new_array,
  _emval_new_cstring: __emval_new_cstring,
  _emval_new_object: __emval_new_object,
  _emval_run_destructors: __emval_run_destructors,
  _emval_set_property: __emval_set_property,
  _emval_take_value: __emval_take_value,
  abort: _abort,
  console_log: console_log,
  emscripten_memcpy_js: _emscripten_memcpy_js,
  emscripten_resize_heap: _emscripten_resize_heap,
  fd_close: _fd_close,
  fd_seek: _fd_seek,
  fd_write: _fd_write,
  invoke_diii: invoke_diii,
  invoke_diiii: invoke_diiii,
  invoke_diiiii: invoke_diiiii,
  invoke_i: invoke_i,
  invoke_ii: invoke_ii,
  invoke_iii: invoke_iii,
  invoke_iiii: invoke_iiii,
  invoke_v: invoke_v,
  invoke_vi: invoke_vi,
  invoke_vii: invoke_vii,
  invoke_viii: invoke_viii,
  invoke_viiii: invoke_viiii,
};
var wasmExports = createWasm();
var ___wasm_call_ctors = createExportWrapper("__wasm_call_ctors");
var _malloc = createExportWrapper("malloc");
var ___cxa_free_exception = createExportWrapper("__cxa_free_exception");
var _free = (Module["_free"] = createExportWrapper("free"));
var _fflush = createExportWrapper("fflush");
var ___getTypeName = createExportWrapper("__getTypeName");
var _setThrew = createExportWrapper("setThrew");
var setTempRet0 = createExportWrapper("setTempRet0");
var _emscripten_stack_init = () =>
  (_emscripten_stack_init = wasmExports["emscripten_stack_init"])();
var _emscripten_stack_get_free = () =>
  (_emscripten_stack_get_free = wasmExports["emscripten_stack_get_free"])();
var _emscripten_stack_get_base = () =>
  (_emscripten_stack_get_base = wasmExports["emscripten_stack_get_base"])();
var _emscripten_stack_get_end = () =>
  (_emscripten_stack_get_end = wasmExports["emscripten_stack_get_end"])();
var stackSave = createExportWrapper("stackSave");
var stackRestore = createExportWrapper("stackRestore");
var stackAlloc = createExportWrapper("stackAlloc");
var _emscripten_stack_get_current = () =>
  (_emscripten_stack_get_current =
    wasmExports["emscripten_stack_get_current"])();
var ___cxa_decrement_exception_refcount = createExportWrapper(
  "__cxa_decrement_exception_refcount",
);
var ___cxa_increment_exception_refcount = createExportWrapper(
  "__cxa_increment_exception_refcount",
);
var ___cxa_demangle = createExportWrapper("__cxa_demangle");
var ___get_exception_message = (Module["___get_exception_message"] =
  createExportWrapper("__get_exception_message"));
var ___cxa_can_catch = createExportWrapper("__cxa_can_catch");
var ___cxa_is_pointer_type = createExportWrapper("__cxa_is_pointer_type");
var dynCall_jiji = (Module["dynCall_jiji"] =
  createExportWrapper("dynCall_jiji"));
var ___start_em_js = (Module["___start_em_js"] = 17428);
var ___stop_em_js = (Module["___stop_em_js"] = 17512);
function invoke_iiii(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_vii(index, a1, a2) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1, a2);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_vi(index, a1) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_ii(index, a1) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_iii(index, a1, a2) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1, a2);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_viii(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_diii(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_v(index) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)();
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_diiiii(index, a1, a2, a3, a4, a5) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_viiii(index, a1, a2, a3, a4) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1, a2, a3, a4);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_i(index) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)();
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
function invoke_diiii(index, a1, a2, a3, a4) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1, a2, a3, a4);
  } catch (e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}
var missingLibrarySymbols = [
  "writeI53ToI64",
  "writeI53ToI64Clamped",
  "writeI53ToI64Signaling",
  "writeI53ToU64Clamped",
  "writeI53ToU64Signaling",
  "readI53FromI64",
  "readI53FromU64",
  "convertI32PairToI53",
  "convertU32PairToI53",
  "zeroMemory",
  "exitJS",
  "isLeapYear",
  "ydayFromDate",
  "arraySum",
  "addDays",
  "inetPton4",
  "inetNtop4",
  "inetPton6",
  "inetNtop6",
  "readSockaddr",
  "writeSockaddr",
  "initRandomFill",
  "randomFill",
  "getCallstack",
  "emscriptenLog",
  "convertPCtoSourceLocation",
  "readEmAsmArgs",
  "jstoi_q",
  "getExecutableName",
  "listenOnce",
  "autoResumeAudioContext",
  "handleException",
  "keepRuntimeAlive",
  "runtimeKeepalivePush",
  "runtimeKeepalivePop",
  "callUserCallback",
  "maybeExit",
  "asmjsMangle",
  "asyncLoad",
  "alignMemory",
  "mmapAlloc",
  "getNativeTypeSize",
  "STACK_SIZE",
  "STACK_ALIGN",
  "POINTER_SIZE",
  "ASSERTIONS",
  "getCFunc",
  "ccall",
  "cwrap",
  "uleb128Encode",
  "sigToWasmTypes",
  "generateFuncType",
  "convertJsFunctionToWasm",
  "getEmptyTableSlot",
  "updateTableMap",
  "getFunctionAddress",
  "addFunction",
  "removeFunction",
  "reallyNegative",
  "unSign",
  "strLen",
  "reSign",
  "formatString",
  "intArrayFromString",
  "intArrayToString",
  "AsciiToString",
  "stringToAscii",
  "stringToNewUTF8",
  "writeArrayToMemory",
  "registerKeyEventCallback",
  "maybeCStringToJsString",
  "findEventTarget",
  "getBoundingClientRect",
  "fillMouseEventData",
  "registerMouseEventCallback",
  "registerWheelEventCallback",
  "registerUiEventCallback",
  "registerFocusEventCallback",
  "fillDeviceOrientationEventData",
  "registerDeviceOrientationEventCallback",
  "fillDeviceMotionEventData",
  "registerDeviceMotionEventCallback",
  "screenOrientation",
  "fillOrientationChangeEventData",
  "registerOrientationChangeEventCallback",
  "fillFullscreenChangeEventData",
  "registerFullscreenChangeEventCallback",
  "JSEvents_requestFullscreen",
  "JSEvents_resizeCanvasForFullscreen",
  "registerRestoreOldStyle",
  "hideEverythingExceptGivenElement",
  "restoreHiddenElements",
  "setLetterbox",
  "softFullscreenResizeWebGLRenderTarget",
  "doRequestFullscreen",
  "fillPointerlockChangeEventData",
  "registerPointerlockChangeEventCallback",
  "registerPointerlockErrorEventCallback",
  "requestPointerLock",
  "fillVisibilityChangeEventData",
  "registerVisibilityChangeEventCallback",
  "registerTouchEventCallback",
  "fillGamepadEventData",
  "registerGamepadEventCallback",
  "registerBeforeUnloadEventCallback",
  "fillBatteryEventData",
  "battery",
  "registerBatteryEventCallback",
  "setCanvasElementSize",
  "getCanvasElementSize",
  "getEnvStrings",
  "checkWasiClock",
  "wasiRightsToMuslOFlags",
  "wasiOFlagsToMuslOFlags",
  "createDyncallWrapper",
  "safeSetTimeout",
  "setImmediateWrapped",
  "clearImmediateWrapped",
  "polyfillSetImmediate",
  "getPromise",
  "makePromise",
  "idsToPromises",
  "makePromiseCallback",
  "Browser_asyncPrepareDataCounter",
  "setMainLoop",
  "getSocketFromFD",
  "getSocketAddress",
  "FS_createPreloadedFile",
  "FS_modeStringToFlags",
  "FS_getMode",
  "FS_stdin_getChar",
  "FS_createDataFile",
  "FS_unlink",
  "FS_mkdirTree",
  "_setNetworkCallback",
  "heapObjectForWebGLType",
  "heapAccessShiftForWebGLHeap",
  "webgl_enable_ANGLE_instanced_arrays",
  "webgl_enable_OES_vertex_array_object",
  "webgl_enable_WEBGL_draw_buffers",
  "webgl_enable_WEBGL_multi_draw",
  "emscriptenWebGLGet",
  "computeUnpackAlignedImageSize",
  "colorChannelsInGlTextureFormat",
  "emscriptenWebGLGetTexPixelData",
  "__glGenObject",
  "emscriptenWebGLGetUniform",
  "webglGetUniformLocation",
  "webglPrepareUniformLocationsBeforeFirstUse",
  "webglGetLeftBracePos",
  "emscriptenWebGLGetVertexAttrib",
  "__glGetActiveAttribOrUniform",
  "writeGLArray",
  "registerWebGlEventCallback",
  "runAndAbortIfError",
  "SDL_unicode",
  "SDL_ttfContext",
  "SDL_audio",
  "ALLOC_NORMAL",
  "ALLOC_STACK",
  "allocate",
  "writeStringToMemory",
  "writeAsciiToMemory",
  "setErrNo",
  "getFunctionArgsName",
  "init_embind",
  "getBasestPointer",
  "registerInheritedInstance",
  "unregisterInheritedInstance",
  "getInheritedInstance",
  "getInheritedInstanceCount",
  "getLiveInheritedInstances",
  "enumReadValueFromPointer",
  "genericPointerToWireType",
  "constNoSmartPtrRawPointerToWireType",
  "nonConstNoSmartPtrRawPointerToWireType",
  "init_RegisteredPointer",
  "RegisteredPointer",
  "RegisteredPointer_fromWireType",
  "runDestructor",
  "releaseClassHandle",
  "detachFinalizer",
  "attachFinalizer",
  "makeClassHandle",
  "init_ClassHandle",
  "ClassHandle",
  "throwInstanceAlreadyDeleted",
  "flushPendingDeletes",
  "setDelayFunction",
  "RegisteredClass",
  "shallowCopyInternalPointer",
  "downcastPointer",
  "upcastPointer",
  "validateThis",
  "char_0",
  "char_9",
  "makeLegalFunctionName",
];
missingLibrarySymbols.forEach(missingLibrarySymbol);
var unexportedSymbols = [
  "run",
  "addOnPreRun",
  "addOnInit",
  "addOnPreMain",
  "addOnExit",
  "addOnPostRun",
  "addRunDependency",
  "removeRunDependency",
  "FS_createFolder",
  "FS_createPath",
  "FS_createLazyFile",
  "FS_createLink",
  "FS_createDevice",
  "FS_readFile",
  "out",
  "err",
  "callMain",
  "abort",
  "wasmMemory",
  "wasmExports",
  "stackAlloc",
  "stackSave",
  "stackRestore",
  "getTempRet0",
  "setTempRet0",
  "writeStackCookie",
  "checkStackCookie",
  "convertI32PairToI53Checked",
  "ptrToString",
  "getHeapMax",
  "growMemory",
  "ENV",
  "MONTH_DAYS_REGULAR",
  "MONTH_DAYS_LEAP",
  "MONTH_DAYS_REGULAR_CUMULATIVE",
  "MONTH_DAYS_LEAP_CUMULATIVE",
  "ERRNO_CODES",
  "ERRNO_MESSAGES",
  "DNS",
  "Protocols",
  "Sockets",
  "timers",
  "warnOnce",
  "UNWIND_CACHE",
  "readEmAsmArgsArray",
  "jstoi_s",
  "dynCallLegacy",
  "getDynCaller",
  "dynCall",
  "HandleAllocator",
  "wasmTable",
  "noExitRuntime",
  "freeTableIndexes",
  "functionsInTableMap",
  "setValue",
  "getValue",
  "PATH",
  "PATH_FS",
  "UTF8Decoder",
  "UTF8ArrayToString",
  "UTF8ToString",
  "stringToUTF8Array",
  "stringToUTF8",
  "lengthBytesUTF8",
  "UTF16Decoder",
  "UTF16ToString",
  "stringToUTF16",
  "lengthBytesUTF16",
  "UTF32ToString",
  "stringToUTF32",
  "lengthBytesUTF32",
  "stringToUTF8OnStack",
  "JSEvents",
  "specialHTMLTargets",
  "findCanvasEventTarget",
  "currentFullscreenStrategy",
  "restoreOldWindowedStyle",
  "demangle",
  "demangleAll",
  "jsStackTrace",
  "stackTrace",
  "ExitStatus",
  "flush_NO_FILESYSTEM",
  "promiseMap",
  "uncaughtExceptionCount",
  "exceptionLast",
  "exceptionCaught",
  "ExceptionInfo",
  "findMatchingCatch",
  "getExceptionMessageCommon",
  "incrementExceptionRefcount",
  "decrementExceptionRefcount",
  "getExceptionMessage",
  "Browser",
  "wget",
  "SYSCALLS",
  "preloadPlugins",
  "FS_stdin_getChar_buffer",
  "FS",
  "MEMFS",
  "TTY",
  "PIPEFS",
  "SOCKFS",
  "tempFixedLengthArray",
  "miniTempWebGLFloatBuffers",
  "miniTempWebGLIntBuffers",
  "GL",
  "emscripten_webgl_power_preferences",
  "AL",
  "GLUT",
  "EGL",
  "GLEW",
  "IDBStore",
  "SDL",
  "SDL_gfx",
  "allocateUTF8",
  "allocateUTF8OnStack",
  "InternalError",
  "BindingError",
  "throwInternalError",
  "throwBindingError",
  "registeredTypes",
  "awaitingDependencies",
  "typeDependencies",
  "tupleRegistrations",
  "structRegistrations",
  "sharedRegisterType",
  "whenDependentTypesAreResolved",
  "embind_charCodes",
  "embind_init_charCodes",
  "readLatin1String",
  "getTypeName",
  "getFunctionName",
  "heap32VectorToArray",
  "requireRegisteredType",
  "usesDestructorStack",
  "createJsInvoker",
  "UnboundTypeError",
  "PureVirtualError",
  "GenericWireTypeSize",
  "EmValType",
  "throwUnboundTypeError",
  "ensureOverloadTable",
  "exposePublicSymbol",
  "replacePublicSymbol",
  "extendError",
  "createNamedFunction",
  "embindRepr",
  "registeredInstances",
  "registeredPointers",
  "registerType",
  "integerReadValueFromPointer",
  "floatReadValueFromPointer",
  "simpleReadValueFromPointer",
  "readPointer",
  "runDestructors",
  "newFunc",
  "craftInvokerFunction",
  "embind__requireFunction",
  "finalizationRegistry",
  "detachFinalizer_deps",
  "deletionQueue",
  "delayFunction",
  "emval_handles",
  "emval_symbols",
  "init_emval",
  "count_emval_handles",
  "getStringOrSymbol",
  "Emval",
  "emval_get_global",
  "emval_returnValue",
  "emval_lookupTypes",
  "emval_methodCallers",
  "emval_addMethodCaller",
  "reflectConstruct",
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);
var calledRun;
dependenciesFulfilled = function runCaller() {
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller;
};
function stackCheckInit() {
  _emscripten_stack_init();
  writeStackCookie();
}
function run() {
  if (runDependencies > 0) {
    return;
  }
  stackCheckInit();
  preRun();
  if (runDependencies > 0) {
    return;
  }
  function doRun() {
    if (calledRun) return;
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
    assert(
      !Module["_main"],
      'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]',
    );
    postRun();
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(function () {
      setTimeout(function () {
        Module["setStatus"]("");
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
  checkStackCookie();
}
if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function")
    Module["preInit"] = [Module["preInit"]];
  while (Module["preInit"].length > 0) {
    Module["preInit"].pop()();
  }
}
run();
