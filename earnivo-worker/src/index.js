var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// node_modules/jose/dist/browser/runtime/webcrypto.js
var webcrypto_default = crypto;
var isCryptoKey = /* @__PURE__ */ __name((key) => key instanceof CryptoKey, "isCryptoKey");

// node_modules/jose/dist/browser/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
__name(concat, "concat");

// node_modules/jose/dist/browser/runtime/base64url.js
var encodeBase64 = /* @__PURE__ */ __name((input) => {
  let unencoded = input;
  if (typeof unencoded === "string") {
    unencoded = encoder.encode(unencoded);
  }
  const CHUNK_SIZE = 32768;
  const arr = [];
  for (let i = 0; i < unencoded.length; i += CHUNK_SIZE) {
    arr.push(String.fromCharCode.apply(null, unencoded.subarray(i, i + CHUNK_SIZE)));
  }
  return btoa(arr.join(""));
}, "encodeBase64");
var encode = /* @__PURE__ */ __name((input) => {
  return encodeBase64(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}, "encode");
var decodeBase64 = /* @__PURE__ */ __name((encoded) => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}, "decodeBase64");
var decode = /* @__PURE__ */ __name((input) => {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}, "decode");

// node_modules/jose/dist/browser/util/errors.js
var JOSEError = class extends Error {
  constructor(message2, options) {
    super(message2, options);
    this.code = "ERR_JOSE_GENERIC";
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
__name(JOSEError, "JOSEError");
JOSEError.code = "ERR_JOSE_GENERIC";
var JWTClaimValidationFailed = class extends JOSEError {
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
__name(JWTClaimValidationFailed, "JWTClaimValidationFailed");
JWTClaimValidationFailed.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
var JWTExpired = class extends JOSEError {
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.code = "ERR_JWT_EXPIRED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
__name(JWTExpired, "JWTExpired");
JWTExpired.code = "ERR_JWT_EXPIRED";
var JOSEAlgNotAllowed = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
  }
};
__name(JOSEAlgNotAllowed, "JOSEAlgNotAllowed");
JOSEAlgNotAllowed.code = "ERR_JOSE_ALG_NOT_ALLOWED";
var JOSENotSupported = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_NOT_SUPPORTED";
  }
};
__name(JOSENotSupported, "JOSENotSupported");
JOSENotSupported.code = "ERR_JOSE_NOT_SUPPORTED";
var JWEDecryptionFailed = class extends JOSEError {
  constructor(message2 = "decryption operation failed", options) {
    super(message2, options);
    this.code = "ERR_JWE_DECRYPTION_FAILED";
  }
};
__name(JWEDecryptionFailed, "JWEDecryptionFailed");
JWEDecryptionFailed.code = "ERR_JWE_DECRYPTION_FAILED";
var JWEInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWE_INVALID";
  }
};
__name(JWEInvalid, "JWEInvalid");
JWEInvalid.code = "ERR_JWE_INVALID";
var JWSInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWS_INVALID";
  }
};
__name(JWSInvalid, "JWSInvalid");
JWSInvalid.code = "ERR_JWS_INVALID";
var JWTInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWT_INVALID";
  }
};
__name(JWTInvalid, "JWTInvalid");
JWTInvalid.code = "ERR_JWT_INVALID";
var JWKInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWK_INVALID";
  }
};
__name(JWKInvalid, "JWKInvalid");
JWKInvalid.code = "ERR_JWK_INVALID";
var JWKSInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWKS_INVALID";
  }
};
__name(JWKSInvalid, "JWKSInvalid");
JWKSInvalid.code = "ERR_JWKS_INVALID";
var JWKSNoMatchingKey = class extends JOSEError {
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
    this.code = "ERR_JWKS_NO_MATCHING_KEY";
  }
};
__name(JWKSNoMatchingKey, "JWKSNoMatchingKey");
JWKSNoMatchingKey.code = "ERR_JWKS_NO_MATCHING_KEY";
var JWKSMultipleMatchingKeys = class extends JOSEError {
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
    this.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  }
};
__name(JWKSMultipleMatchingKeys, "JWKSMultipleMatchingKeys");
JWKSMultipleMatchingKeys.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
var JWKSTimeout = class extends JOSEError {
  constructor(message2 = "request timed out", options) {
    super(message2, options);
    this.code = "ERR_JWKS_TIMEOUT";
  }
};
__name(JWKSTimeout, "JWKSTimeout");
JWKSTimeout.code = "ERR_JWKS_TIMEOUT";
var JWSSignatureVerificationFailed = class extends JOSEError {
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
    this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  }
};
__name(JWSSignatureVerificationFailed, "JWSSignatureVerificationFailed");
JWSSignatureVerificationFailed.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";

// node_modules/jose/dist/browser/lib/crypto_key.js
function unusable(name, prop = "algorithm.name") {
  return new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
__name(unusable, "unusable");
function isAlgorithm(algorithm, name) {
  return algorithm.name === name;
}
__name(isAlgorithm, "isAlgorithm");
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
__name(getHashLength, "getHashLength");
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
__name(getNamedCurve, "getNamedCurve");
function checkUsage(key, usages) {
  if (usages.length && !usages.some((expected) => key.usages.includes(expected))) {
    let msg = "CryptoKey does not support this operation, its usages must include ";
    if (usages.length > 2) {
      const last = usages.pop();
      msg += `one of ${usages.join(", ")}, or ${last}.`;
    } else if (usages.length === 2) {
      msg += `one of ${usages[0]} or ${usages[1]}.`;
    } else {
      msg += `${usages[0]}.`;
    }
    throw new TypeError(msg);
  }
}
__name(checkUsage, "checkUsage");
function checkSigCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "EdDSA": {
      if (key.algorithm.name !== "Ed25519" && key.algorithm.name !== "Ed448") {
        throw unusable("Ed25519 or Ed448");
      }
      break;
    }
    case "Ed25519": {
      if (!isAlgorithm(key.algorithm, "Ed25519"))
        throw unusable("Ed25519");
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usages);
}
__name(checkSigCryptoKey, "checkSigCryptoKey");

// node_modules/jose/dist/browser/lib/invalid_key_input.js
function message(msg, actual, ...types2) {
  types2 = types2.filter(Boolean);
  if (types2.length > 2) {
    const last = types2.pop();
    msg += `one of type ${types2.join(", ")}, or ${last}.`;
  } else if (types2.length === 2) {
    msg += `one of type ${types2[0]} or ${types2[1]}.`;
  } else {
    msg += `of type ${types2[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
__name(message, "message");
var invalid_key_input_default = /* @__PURE__ */ __name((actual, ...types2) => {
  return message("Key must be ", actual, ...types2);
}, "default");
function withAlg(alg, actual, ...types2) {
  return message(`Key for the ${alg} algorithm must be `, actual, ...types2);
}
__name(withAlg, "withAlg");

// node_modules/jose/dist/browser/runtime/is_key_like.js
var is_key_like_default = /* @__PURE__ */ __name((key) => {
  if (isCryptoKey(key)) {
    return true;
  }
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "default");
var types = ["CryptoKey"];

// node_modules/jose/dist/browser/lib/is_disjoint.js
var isDisjoint = /* @__PURE__ */ __name((...headers) => {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}, "isDisjoint");
var is_disjoint_default = isDisjoint;

// node_modules/jose/dist/browser/lib/is_object.js
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
__name(isObjectLike, "isObjectLike");
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
__name(isObject, "isObject");

// node_modules/jose/dist/browser/runtime/check_key_length.js
var check_key_length_default = /* @__PURE__ */ __name((alg, key) => {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
    }
  }
}, "default");

// node_modules/jose/dist/browser/lib/is_jwk.js
function isJWK(key) {
  return isObject(key) && typeof key.kty === "string";
}
__name(isJWK, "isJWK");
function isPrivateJWK(key) {
  return key.kty !== "oct" && typeof key.d === "string";
}
__name(isPrivateJWK, "isPrivateJWK");
function isPublicJWK(key) {
  return key.kty !== "oct" && typeof key.d === "undefined";
}
__name(isPublicJWK, "isPublicJWK");
function isSecretJWK(key) {
  return isJWK(key) && key.kty === "oct" && typeof key.k === "string";
}
__name(isSecretJWK, "isSecretJWK");

// node_modules/jose/dist/browser/runtime/jwk_to_key.js
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
          algorithm = { name: "ECDSA", namedCurve: "P-256" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES384":
          algorithm = { name: "ECDSA", namedCurve: "P-384" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES512":
          algorithm = { name: "ECDSA", namedCurve: "P-521" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
          algorithm = { name: "Ed25519" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "EdDSA":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm, keyUsages };
}
__name(subtleMapping, "subtleMapping");
var parse = /* @__PURE__ */ __name(async (jwk) => {
  if (!jwk.alg) {
    throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const rest = [
    algorithm,
    jwk.ext ?? false,
    jwk.key_ops ?? keyUsages
  ];
  const keyData = { ...jwk };
  delete keyData.alg;
  delete keyData.use;
  return webcrypto_default.subtle.importKey("jwk", keyData, ...rest);
}, "parse");
var jwk_to_key_default = parse;

// node_modules/jose/dist/browser/runtime/normalize_key.js
var exportKeyValue = /* @__PURE__ */ __name((k) => decode(k), "exportKeyValue");
var privCache;
var pubCache;
var isKeyObject = /* @__PURE__ */ __name((key) => {
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "isKeyObject");
var importAndCache = /* @__PURE__ */ __name(async (cache, key, jwk, alg, freeze = false) => {
  let cached = cache.get(key);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const cryptoKey = await jwk_to_key_default({ ...jwk, alg });
  if (freeze)
    Object.freeze(key);
  if (!cached) {
    cache.set(key, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "importAndCache");
var normalizePublicKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    delete jwk.d;
    delete jwk.dp;
    delete jwk.dq;
    delete jwk.p;
    delete jwk.q;
    delete jwk.qi;
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(pubCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(pubCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePublicKey");
var normalizePrivateKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(privCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(privCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePrivateKey");
var normalize_key_default = { normalizePublicKey, normalizePrivateKey };

// node_modules/jose/dist/browser/runtime/asn1.js
var findOid = /* @__PURE__ */ __name((keyData, oid, from = 0) => {
  if (from === 0) {
    oid.unshift(oid.length);
    oid.unshift(6);
  }
  const i = keyData.indexOf(oid[0], from);
  if (i === -1)
    return false;
  const sub = keyData.subarray(i, i + oid.length);
  if (sub.length !== oid.length)
    return false;
  return sub.every((value, index) => value === oid[index]) || findOid(keyData, oid, i + 1);
}, "findOid");
var getNamedCurve2 = /* @__PURE__ */ __name((keyData) => {
  switch (true) {
    case findOid(keyData, [42, 134, 72, 206, 61, 3, 1, 7]):
      return "P-256";
    case findOid(keyData, [43, 129, 4, 0, 34]):
      return "P-384";
    case findOid(keyData, [43, 129, 4, 0, 35]):
      return "P-521";
    case findOid(keyData, [43, 101, 110]):
      return "X25519";
    case findOid(keyData, [43, 101, 111]):
      return "X448";
    case findOid(keyData, [43, 101, 112]):
      return "Ed25519";
    case findOid(keyData, [43, 101, 113]):
      return "Ed448";
    default:
      throw new JOSENotSupported("Invalid or unsupported EC Key Curve or OKP Key Sub Type");
  }
}, "getNamedCurve");
var genericImport = /* @__PURE__ */ __name(async (replace, keyFormat, pem, alg, options) => {
  let algorithm;
  let keyUsages;
  const keyData = new Uint8Array(atob(pem.replace(replace, "")).split("").map((c) => c.charCodeAt(0)));
  const isPublic = keyFormat === "spki";
  switch (alg) {
    case "PS256":
    case "PS384":
    case "PS512":
      algorithm = { name: "RSA-PSS", hash: `SHA-${alg.slice(-3)}` };
      keyUsages = isPublic ? ["verify"] : ["sign"];
      break;
    case "RS256":
    case "RS384":
    case "RS512":
      algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${alg.slice(-3)}` };
      keyUsages = isPublic ? ["verify"] : ["sign"];
      break;
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512":
      algorithm = {
        name: "RSA-OAEP",
        hash: `SHA-${parseInt(alg.slice(-3), 10) || 1}`
      };
      keyUsages = isPublic ? ["encrypt", "wrapKey"] : ["decrypt", "unwrapKey"];
      break;
    case "ES256":
      algorithm = { name: "ECDSA", namedCurve: "P-256" };
      keyUsages = isPublic ? ["verify"] : ["sign"];
      break;
    case "ES384":
      algorithm = { name: "ECDSA", namedCurve: "P-384" };
      keyUsages = isPublic ? ["verify"] : ["sign"];
      break;
    case "ES512":
      algorithm = { name: "ECDSA", namedCurve: "P-521" };
      keyUsages = isPublic ? ["verify"] : ["sign"];
      break;
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      const namedCurve = getNamedCurve2(keyData);
      algorithm = namedCurve.startsWith("P-") ? { name: "ECDH", namedCurve } : { name: namedCurve };
      keyUsages = isPublic ? [] : ["deriveBits"];
      break;
    }
    case "Ed25519":
      algorithm = { name: "Ed25519" };
      keyUsages = isPublic ? ["verify"] : ["sign"];
      break;
    case "EdDSA":
      algorithm = { name: getNamedCurve2(keyData) };
      keyUsages = isPublic ? ["verify"] : ["sign"];
      break;
    default:
      throw new JOSENotSupported('Invalid or unsupported "alg" (Algorithm) value');
  }
  return webcrypto_default.subtle.importKey(keyFormat, keyData, algorithm, options?.extractable ?? false, keyUsages);
}, "genericImport");
var fromPKCS8 = /* @__PURE__ */ __name((pem, alg, options) => {
  return genericImport(/(?:-----(?:BEGIN|END) PRIVATE KEY-----|\s)/g, "pkcs8", pem, alg, options);
}, "fromPKCS8");

// node_modules/jose/dist/browser/key/import.js
async function importPKCS8(pkcs8, alg, options) {
  if (typeof pkcs8 !== "string" || pkcs8.indexOf("-----BEGIN PRIVATE KEY-----") !== 0) {
    throw new TypeError('"pkcs8" must be PKCS#8 formatted string');
  }
  return fromPKCS8(pkcs8, alg, options);
}
__name(importPKCS8, "importPKCS8");
async function importJWK(jwk, alg) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  alg || (alg = jwk.alg);
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if ("oth" in jwk && jwk.oth !== void 0) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
    case "EC":
    case "OKP":
      return jwk_to_key_default({ ...jwk, alg });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}
__name(importJWK, "importJWK");

// node_modules/jose/dist/browser/lib/check_key_type.js
var tag = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key.use !== void 0 && key.use !== "sig") {
    throw new TypeError("Invalid key for this operation, when present its use must be sig");
  }
  if (key.key_ops !== void 0 && key.key_ops.includes?.(usage) !== true) {
    throw new TypeError(`Invalid key for this operation, when present its key_ops must include ${usage}`);
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, when present its alg must be ${alg}`);
  }
  return true;
}, "jwkMatchesOp");
var symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (key instanceof Uint8Array)
    return;
  if (allowJwk && isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, "Uint8Array", allowJwk ? "JSON Web Key" : null));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
}, "symmetricTypeCheck");
var asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (allowJwk && isJWK(key)) {
    switch (usage) {
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, allowJwk ? "JSON Web Key" : null));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (usage === "sign" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
  }
  if (usage === "decrypt" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
  }
  if (key.algorithm && usage === "verify" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
  }
  if (key.algorithm && usage === "encrypt" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
  }
}, "asymmetricTypeCheck");
function checkKeyType(allowJwk, alg, key, usage) {
  const symmetric = alg.startsWith("HS") || alg === "dir" || alg.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(alg);
  if (symmetric) {
    symmetricTypeCheck(alg, key, usage, allowJwk);
  } else {
    asymmetricTypeCheck(alg, key, usage, allowJwk);
  }
}
__name(checkKeyType, "checkKeyType");
var check_key_type_default = checkKeyType.bind(void 0, false);
var checkKeyTypeWithJwk = checkKeyType.bind(void 0, true);

// node_modules/jose/dist/browser/lib/validate_crit.js
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
__name(validateCrit, "validateCrit");
var validate_crit_default = validateCrit;

// node_modules/jose/dist/browser/lib/validate_algorithms.js
var validateAlgorithms = /* @__PURE__ */ __name((option, algorithms) => {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}, "validateAlgorithms");
var validate_algorithms_default = validateAlgorithms;

// node_modules/jose/dist/browser/runtime/subtle_dsa.js
function subtleDsa(alg, algorithm) {
  const hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash, name: "RSA-PSS", saltLength: alg.slice(-3) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "Ed25519":
      return { name: "Ed25519" };
    case "EdDSA":
      return { name: algorithm.name };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
__name(subtleDsa, "subtleDsa");

// node_modules/jose/dist/browser/runtime/get_sign_verify_key.js
async function getCryptoKey(alg, key, usage) {
  if (usage === "sign") {
    key = await normalize_key_default.normalizePrivateKey(key, alg);
  }
  if (usage === "verify") {
    key = await normalize_key_default.normalizePublicKey(key, alg);
  }
  if (isCryptoKey(key)) {
    checkSigCryptoKey(key, alg, usage);
    return key;
  }
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalid_key_input_default(key, ...types));
    }
    return webcrypto_default.subtle.importKey("raw", key, { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" }, false, [usage]);
  }
  throw new TypeError(invalid_key_input_default(key, ...types, "Uint8Array", "JSON Web Key"));
}
__name(getCryptoKey, "getCryptoKey");

// node_modules/jose/dist/browser/runtime/verify.js
var verify = /* @__PURE__ */ __name(async (alg, key, signature, data) => {
  const cryptoKey = await getCryptoKey(alg, key, "verify");
  check_key_length_default(alg, cryptoKey);
  const algorithm = subtleDsa(alg, cryptoKey.algorithm);
  try {
    return await webcrypto_default.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}, "verify");
var verify_default = verify;

// node_modules/jose/dist/browser/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!is_disjoint_default(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validate_algorithms_default("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
    checkKeyTypeWithJwk(alg, key, "verify");
    if (isJWK(key)) {
      key = await importJWK(key, alg);
    }
  } else {
    checkKeyTypeWithJwk(alg, key, "verify");
  }
  const data = concat(encoder.encode(jws.protected ?? ""), encoder.encode("."), typeof jws.payload === "string" ? encoder.encode(jws.payload) : jws.payload);
  let signature;
  try {
    signature = decode(jws.signature);
  } catch {
    throw new JWSInvalid("Failed to base64url decode the signature");
  }
  const verified = await verify_default(alg, key, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    try {
      payload = decode(jws.payload);
    } catch {
      throw new JWSInvalid("Failed to base64url decode the payload");
    }
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key };
  }
  return result;
}
__name(flattenedVerify, "flattenedVerify");

// node_modules/jose/dist/browser/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(compactVerify, "compactVerify");

// node_modules/jose/dist/browser/lib/epoch.js
var epoch_default = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "default");

// node_modules/jose/dist/browser/lib/secs.js
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var secs_default = /* @__PURE__ */ __name((str) => {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}, "default");

// node_modules/jose/dist/browser/lib/jwt_claims_set.js
var normalizeTyp = /* @__PURE__ */ __name((value) => value.toLowerCase().replace(/^application\//, ""), "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
}, "checkAudiencePresence");
var jwt_claims_set_default = /* @__PURE__ */ __name((protectedHeader, encodedPayload, options = {}) => {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs_default(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch_default(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs_default(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
}, "default");

// node_modules/jose/dist/browser/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = jwt_claims_set_default(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(jwtVerify, "jwtVerify");

// node_modules/jose/dist/browser/runtime/sign.js
var sign = /* @__PURE__ */ __name(async (alg, key, data) => {
  const cryptoKey = await getCryptoKey(alg, key, "sign");
  check_key_length_default(alg, cryptoKey);
  const signature = await webcrypto_default.subtle.sign(subtleDsa(alg, cryptoKey.algorithm), cryptoKey, data);
  return new Uint8Array(signature);
}, "sign");
var sign_default = sign;

// node_modules/jose/dist/browser/jws/flattened/sign.js
var FlattenedSign = class {
  constructor(payload) {
    if (!(payload instanceof Uint8Array)) {
      throw new TypeError("payload must be an instance of Uint8Array");
    }
    this._payload = payload;
  }
  setProtectedHeader(protectedHeader) {
    if (this._protectedHeader) {
      throw new TypeError("setProtectedHeader can only be called once");
    }
    this._protectedHeader = protectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    if (this._unprotectedHeader) {
      throw new TypeError("setUnprotectedHeader can only be called once");
    }
    this._unprotectedHeader = unprotectedHeader;
    return this;
  }
  async sign(key, options) {
    if (!this._protectedHeader && !this._unprotectedHeader) {
      throw new JWSInvalid("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
    }
    if (!is_disjoint_default(this._protectedHeader, this._unprotectedHeader)) {
      throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    }
    const joseHeader = {
      ...this._protectedHeader,
      ...this._unprotectedHeader
    };
    const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, this._protectedHeader, joseHeader);
    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this._protectedHeader.b64;
      if (typeof b64 !== "boolean") {
        throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
      }
    }
    const { alg } = joseHeader;
    if (typeof alg !== "string" || !alg) {
      throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    }
    checkKeyTypeWithJwk(alg, key, "sign");
    let payload = this._payload;
    if (b64) {
      payload = encoder.encode(encode(payload));
    }
    let protectedHeader;
    if (this._protectedHeader) {
      protectedHeader = encoder.encode(encode(JSON.stringify(this._protectedHeader)));
    } else {
      protectedHeader = encoder.encode("");
    }
    const data = concat(protectedHeader, encoder.encode("."), payload);
    const signature = await sign_default(alg, key, data);
    const jws = {
      signature: encode(signature),
      payload: ""
    };
    if (b64) {
      jws.payload = decoder.decode(payload);
    }
    if (this._unprotectedHeader) {
      jws.header = this._unprotectedHeader;
    }
    if (this._protectedHeader) {
      jws.protected = decoder.decode(protectedHeader);
    }
    return jws;
  }
};
__name(FlattenedSign, "FlattenedSign");

// node_modules/jose/dist/browser/jws/compact/sign.js
var CompactSign = class {
  constructor(payload) {
    this._flattened = new FlattenedSign(payload);
  }
  setProtectedHeader(protectedHeader) {
    this._flattened.setProtectedHeader(protectedHeader);
    return this;
  }
  async sign(key, options) {
    const jws = await this._flattened.sign(key, options);
    if (jws.payload === void 0) {
      throw new TypeError("use the flattened module for creating JWS with b64: false");
    }
    return `${jws.protected}.${jws.payload}.${jws.signature}`;
  }
};
__name(CompactSign, "CompactSign");

// node_modules/jose/dist/browser/jwt/produce.js
function validateInput(label, input) {
  if (!Number.isFinite(input)) {
    throw new TypeError(`Invalid ${label} input`);
  }
  return input;
}
__name(validateInput, "validateInput");
var ProduceJWT = class {
  constructor(payload = {}) {
    if (!isObject(payload)) {
      throw new TypeError("JWT Claims Set MUST be an object");
    }
    this._payload = payload;
  }
  setIssuer(issuer) {
    this._payload = { ...this._payload, iss: issuer };
    return this;
  }
  setSubject(subject) {
    this._payload = { ...this._payload, sub: subject };
    return this;
  }
  setAudience(audience) {
    this._payload = { ...this._payload, aud: audience };
    return this;
  }
  setJti(jwtId) {
    this._payload = { ...this._payload, jti: jwtId };
    return this;
  }
  setNotBefore(input) {
    if (typeof input === "number") {
      this._payload = { ...this._payload, nbf: validateInput("setNotBefore", input) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, nbf: validateInput("setNotBefore", epoch_default(input)) };
    } else {
      this._payload = { ...this._payload, nbf: epoch_default(/* @__PURE__ */ new Date()) + secs_default(input) };
    }
    return this;
  }
  setExpirationTime(input) {
    if (typeof input === "number") {
      this._payload = { ...this._payload, exp: validateInput("setExpirationTime", input) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, exp: validateInput("setExpirationTime", epoch_default(input)) };
    } else {
      this._payload = { ...this._payload, exp: epoch_default(/* @__PURE__ */ new Date()) + secs_default(input) };
    }
    return this;
  }
  setIssuedAt(input) {
    if (typeof input === "undefined") {
      this._payload = { ...this._payload, iat: epoch_default(/* @__PURE__ */ new Date()) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, iat: validateInput("setIssuedAt", epoch_default(input)) };
    } else if (typeof input === "string") {
      this._payload = {
        ...this._payload,
        iat: validateInput("setIssuedAt", epoch_default(/* @__PURE__ */ new Date()) + secs_default(input))
      };
    } else {
      this._payload = { ...this._payload, iat: validateInput("setIssuedAt", input) };
    }
    return this;
  }
};
__name(ProduceJWT, "ProduceJWT");

// node_modules/jose/dist/browser/jwt/sign.js
var SignJWT = class extends ProduceJWT {
  setProtectedHeader(protectedHeader) {
    this._protectedHeader = protectedHeader;
    return this;
  }
  async sign(key, options) {
    const sig = new CompactSign(encoder.encode(JSON.stringify(this._payload)));
    sig.setProtectedHeader(this._protectedHeader);
    if (Array.isArray(this._protectedHeader?.crit) && this._protectedHeader.crit.includes("b64") && this._protectedHeader.b64 === false) {
      throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
    }
    return sig.sign(key, options);
  }
};
__name(SignJWT, "SignJWT");

// node_modules/jose/dist/browser/jwks/local.js
function getKtyFromAlg(alg) {
  switch (typeof alg === "string" && alg.slice(0, 2)) {
    case "RS":
    case "PS":
      return "RSA";
    case "ES":
      return "EC";
    case "Ed":
      return "OKP";
    default:
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
  }
}
__name(getKtyFromAlg, "getKtyFromAlg");
function isJWKSLike(jwks) {
  return jwks && typeof jwks === "object" && Array.isArray(jwks.keys) && jwks.keys.every(isJWKLike);
}
__name(isJWKSLike, "isJWKSLike");
function isJWKLike(key) {
  return isObject(key);
}
__name(isJWKLike, "isJWKLike");
function clone(obj) {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}
__name(clone, "clone");
var LocalJWKSet = class {
  constructor(jwks) {
    this._cached = /* @__PURE__ */ new WeakMap();
    if (!isJWKSLike(jwks)) {
      throw new JWKSInvalid("JSON Web Key Set malformed");
    }
    this._jwks = clone(jwks);
  }
  async getKey(protectedHeader, token) {
    const { alg, kid } = { ...protectedHeader, ...token?.header };
    const kty = getKtyFromAlg(alg);
    const candidates = this._jwks.keys.filter((jwk2) => {
      let candidate = kty === jwk2.kty;
      if (candidate && typeof kid === "string") {
        candidate = kid === jwk2.kid;
      }
      if (candidate && typeof jwk2.alg === "string") {
        candidate = alg === jwk2.alg;
      }
      if (candidate && typeof jwk2.use === "string") {
        candidate = jwk2.use === "sig";
      }
      if (candidate && Array.isArray(jwk2.key_ops)) {
        candidate = jwk2.key_ops.includes("verify");
      }
      if (candidate) {
        switch (alg) {
          case "ES256":
            candidate = jwk2.crv === "P-256";
            break;
          case "ES256K":
            candidate = jwk2.crv === "secp256k1";
            break;
          case "ES384":
            candidate = jwk2.crv === "P-384";
            break;
          case "ES512":
            candidate = jwk2.crv === "P-521";
            break;
          case "Ed25519":
            candidate = jwk2.crv === "Ed25519";
            break;
          case "EdDSA":
            candidate = jwk2.crv === "Ed25519" || jwk2.crv === "Ed448";
            break;
        }
      }
      return candidate;
    });
    const { 0: jwk, length } = candidates;
    if (length === 0) {
      throw new JWKSNoMatchingKey();
    }
    if (length !== 1) {
      const error3 = new JWKSMultipleMatchingKeys();
      const { _cached } = this;
      error3[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates) {
          try {
            yield await importWithAlgCache(_cached, jwk2, alg);
          } catch {
          }
        }
      };
      throw error3;
    }
    return importWithAlgCache(this._cached, jwk, alg);
  }
};
__name(LocalJWKSet, "LocalJWKSet");
async function importWithAlgCache(cache, jwk, alg) {
  const cached = cache.get(jwk) || cache.set(jwk, {}).get(jwk);
  if (cached[alg] === void 0) {
    const key = await importJWK({ ...jwk, ext: true }, alg);
    if (key instanceof Uint8Array || key.type !== "public") {
      throw new JWKSInvalid("JSON Web Key Set members must be public keys");
    }
    cached[alg] = key;
  }
  return cached[alg];
}
__name(importWithAlgCache, "importWithAlgCache");
function createLocalJWKSet(jwks) {
  const set = new LocalJWKSet(jwks);
  const localJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "localJWKSet");
  Object.defineProperties(localJWKSet, {
    jwks: {
      value: () => clone(set._jwks),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return localJWKSet;
}
__name(createLocalJWKSet, "createLocalJWKSet");

// node_modules/jose/dist/browser/runtime/fetch_jwks.js
var fetchJwks = /* @__PURE__ */ __name(async (url, timeout, options) => {
  let controller;
  let id;
  let timedOut = false;
  if (typeof AbortController === "function") {
    controller = new AbortController();
    id = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
  }
  const response = await fetch(url.href, {
    signal: controller ? controller.signal : void 0,
    redirect: "manual",
    headers: options.headers
  }).catch((err) => {
    if (timedOut)
      throw new JWKSTimeout();
    throw err;
  });
  if (id !== void 0)
    clearTimeout(id);
  if (response.status !== 200) {
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  }
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}, "fetchJwks");
var fetch_jwks_default = fetchJwks;

// node_modules/jose/dist/browser/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair !== "undefined" || typeof navigator !== "undefined" && true || typeof EdgeRuntime !== "undefined" && EdgeRuntime === "vercel";
}
__name(isCloudflareWorkers, "isCloudflareWorkers");
var USER_AGENT;
if (typeof navigator === "undefined" || !"Cloudflare-Workers"?.startsWith?.("Mozilla/5.0 ")) {
  const NAME = "jose";
  const VERSION = "v5.10.0";
  USER_AGENT = `${NAME}/${VERSION}`;
}
var jwksCache = Symbol();
function isFreshJwksCache(input, cacheMaxAge) {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  if (!("uat" in input) || typeof input.uat !== "number" || Date.now() - input.uat >= cacheMaxAge) {
    return false;
  }
  if (!("jwks" in input) || !isObject(input.jwks) || !Array.isArray(input.jwks.keys) || !Array.prototype.every.call(input.jwks.keys, isObject)) {
    return false;
  }
  return true;
}
__name(isFreshJwksCache, "isFreshJwksCache");
var RemoteJWKSet = class {
  constructor(url, options) {
    if (!(url instanceof URL)) {
      throw new TypeError("url must be an instance of URL");
    }
    this._url = new URL(url.href);
    this._options = { agent: options?.agent, headers: options?.headers };
    this._timeoutDuration = typeof options?.timeoutDuration === "number" ? options?.timeoutDuration : 5e3;
    this._cooldownDuration = typeof options?.cooldownDuration === "number" ? options?.cooldownDuration : 3e4;
    this._cacheMaxAge = typeof options?.cacheMaxAge === "number" ? options?.cacheMaxAge : 6e5;
    if (options?.[jwksCache] !== void 0) {
      this._cache = options?.[jwksCache];
      if (isFreshJwksCache(options?.[jwksCache], this._cacheMaxAge)) {
        this._jwksTimestamp = this._cache.uat;
        this._local = createLocalJWKSet(this._cache.jwks);
      }
    }
  }
  coolingDown() {
    return typeof this._jwksTimestamp === "number" ? Date.now() < this._jwksTimestamp + this._cooldownDuration : false;
  }
  fresh() {
    return typeof this._jwksTimestamp === "number" ? Date.now() < this._jwksTimestamp + this._cacheMaxAge : false;
  }
  async getKey(protectedHeader, token) {
    if (!this._local || !this.fresh()) {
      await this.reload();
    }
    try {
      return await this._local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey) {
        if (this.coolingDown() === false) {
          await this.reload();
          return this._local(protectedHeader, token);
        }
      }
      throw err;
    }
  }
  async reload() {
    if (this._pendingFetch && isCloudflareWorkers()) {
      this._pendingFetch = void 0;
    }
    const headers = new Headers(this._options.headers);
    if (USER_AGENT && !headers.has("User-Agent")) {
      headers.set("User-Agent", USER_AGENT);
      this._options.headers = Object.fromEntries(headers.entries());
    }
    this._pendingFetch || (this._pendingFetch = fetch_jwks_default(this._url, this._timeoutDuration, this._options).then((json2) => {
      this._local = createLocalJWKSet(json2);
      if (this._cache) {
        this._cache.uat = Date.now();
        this._cache.jwks = json2;
      }
      this._jwksTimestamp = Date.now();
      this._pendingFetch = void 0;
    }).catch((err) => {
      this._pendingFetch = void 0;
      throw err;
    }));
    await this._pendingFetch;
  }
};
__name(RemoteJWKSet, "RemoteJWKSet");
function createRemoteJWKSet(url, options) {
  const set = new RemoteJWKSet(url, options);
  const remoteJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "remoteJWKSet");
  Object.defineProperties(remoteJWKSet, {
    coolingDown: {
      get: () => set.coolingDown(),
      enumerable: true,
      configurable: false
    },
    fresh: {
      get: () => set.fresh(),
      enumerable: true,
      configurable: false
    },
    reload: {
      value: () => set.reload(),
      enumerable: true,
      configurable: false,
      writable: false
    },
    reloading: {
      get: () => !!set._pendingFetch,
      enumerable: true,
      configurable: false
    },
    jwks: {
      value: () => set._local?.jwks(),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return remoteJWKSet;
}
__name(createRemoteJWKSet, "createRemoteJWKSet");

// src/firestore.js
var TOKEN_URL = "https://oauth2.googleapis.com/token";
var SCOPE = "https://www.googleapis.com/auth/datastore";
var cachedToken = null;
async function getAccessToken(env2) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 3e4) {
    return cachedToken.accessToken;
  }
  const privateKey = await importPKCS8(env2.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), "RS256");
  const now = Math.floor(Date.now() / 1e3);
  const assertion = await new SignJWT({ scope: SCOPE }).setProtectedHeader({ alg: "RS256" }).setIssuer(env2.FIREBASE_CLIENT_EMAIL).setSubject(env2.FIREBASE_CLIENT_EMAIL).setAudience(TOKEN_URL).setIssuedAt(now).setExpirationTime(now + 3600).sign(privateKey);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  if (!res.ok)
    throw new Error("Failed to obtain Firestore access token");
  const json2 = await res.json();
  cachedToken = { accessToken: json2.access_token, expiresAt: Date.now() + json2.expires_in * 1e3 };
  return cachedToken.accessToken;
}
__name(getAccessToken, "getAccessToken");
function baseUrl(env2) {
  return `https://firestore.googleapis.com/v1/projects/${env2.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}
__name(baseUrl, "baseUrl");
function toFirestoreValue(v, fieldName = "") {
  if (v === null || v === void 0)
    return { nullValue: null };
  if (fieldName === "expiresAt" && typeof v === "string") {
    const parsed = Date.parse(v);
    if (Number.isFinite(parsed))
      return { timestampValue: new Date(parsed).toISOString() };
  }
  if (typeof v === "boolean")
    return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string")
    return { stringValue: v };
  if (Array.isArray(v))
    return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (v instanceof Date)
    return { timestampValue: v.toISOString() };
  if (typeof v === "object")
    return { mapValue: { fields: toFirestoreFields(v) } };
  throw new Error(`Unsupported Firestore value type: ${typeof v}`);
}
__name(toFirestoreValue, "toFirestoreValue");
function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, val] of Object.entries(obj))
    fields[k] = toFirestoreValue(val, k);
  return fields;
}
__name(toFirestoreFields, "toFirestoreFields");
function fromFirestoreValue(v) {
  if (!v)
    return null;
  if ("nullValue" in v)
    return null;
  if ("booleanValue" in v)
    return v.booleanValue;
  if ("integerValue" in v)
    return Number(v.integerValue);
  if ("doubleValue" in v)
    return v.doubleValue;
  if ("stringValue" in v)
    return v.stringValue;
  if ("timestampValue" in v)
    return v.timestampValue;
  if ("arrayValue" in v)
    return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in v)
    return fromFirestoreFields(v.mapValue.fields || {});
  return null;
}
__name(fromFirestoreValue, "fromFirestoreValue");
function fromFirestoreFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {}))
    obj[k] = fromFirestoreValue(v);
  return obj;
}
__name(fromFirestoreFields, "fromFirestoreFields");
function createFirestoreClient(env2) {
  async function authedFetch(path, opts = {}) {
    const token = await getAccessToken(env2);
    return fetch(`${baseUrl(env2)}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts.headers || {} }
    });
  }
  __name(authedFetch, "authedFetch");
  return {
    async getDocMeta(path) {
      const res = await authedFetch(`/${path}`);
      if (res.status === 404)
        return null;
      if (!res.ok)
        throw new Error(`Firestore getDoc failed: ${res.status}`);
      const json2 = await res.json();
      return {
        doc: { id: path.split("/").pop(), ...fromFirestoreFields(json2.fields) },
        updateTime: json2.updateTime || null
      };
    },
    async getDoc(path) {
      const result = await this.getDocMeta(path);
      return result ? result.doc : null;
    },
    async setDoc(path, data, condition) {
      const res = await authedFetch(`/${path}`, {
        method: "PATCH",
        body: JSON.stringify({ fields: toFirestoreFields(data), ...condition ? { currentDocument: condition } : {} })
      });
      if (!res.ok)
        throw new Error(`Firestore setDoc failed: ${res.status} ${await res.text()}`);
      return true;
    },
    async createDoc(collectionPath, docId, data) {
      const res = await authedFetch(`/${collectionPath}?documentId=${encodeURIComponent(docId)}`, {
        method: "POST",
        body: JSON.stringify({ fields: toFirestoreFields(data) })
      });
      if (!res.ok)
        throw new Error(`Firestore createDoc failed: ${res.status} ${await res.text()}`);
      return true;
    },
    async runQuery(collectionId, { where: whereClauses = [], orderBy: order, limit } = {}) {
      const structuredQuery = {
        from: [{ collectionId }],
        ...whereClauses.length && {
          where: {
            compositeFilter: {
              op: "AND",
              filters: whereClauses.map(([field, op, value]) => ({
                fieldFilter: { field: { fieldPath: field }, op, value: toFirestoreValue(value) }
              }))
            }
          }
        },
        ...order && { orderBy: [{ field: { fieldPath: order[0] }, direction: order[1] || "DESCENDING" }] },
        ...limit && { limit }
      };
      const res = await authedFetch(":runQuery", { method: "POST", body: JSON.stringify({ structuredQuery }) });
      if (!res.ok)
        throw new Error(`Firestore runQuery failed: ${res.status} ${await res.text()}`);
      const json2 = await res.json();
      return json2.filter((r) => r.document).map((r) => ({ id: r.document.name.split("/").pop(), ...fromFirestoreFields(r.document.fields) }));
    },
    // Atomic multi-write commit — used for reward crediting so the ledger
    // transaction and the balance update happen together or not at all.
    // Supports an optional per-write `condition` (e.g. { exists: false }) so
    // callers can enforce "create exactly once" semantics atomically via
    // Firestore itself, instead of a separate read-then-write race.
    async commit(writes) {
      const res = await authedFetch(":commit", {
        method: "POST",
        body: JSON.stringify({
          writes: writes.map((w) => ({
            ...w.delete ? { delete: `projects/${env2.FIREBASE_PROJECT_ID}/databases/(default)/documents/${w.path}` } : { update: { name: `projects/${env2.FIREBASE_PROJECT_ID}/databases/(default)/documents/${w.path}`, fields: toFirestoreFields(w.data) } },
            ...w.updateMask && !w.delete ? { updateMask: { fieldPaths: w.updateMask } } : {},
            ...w.condition ? { currentDocument: w.condition } : {}
          }))
        })
      });
      if (!res.ok) {
        const bodyText = await res.text();
        if (res.status === 400 && /FAILED_PRECONDITION|ALREADY_EXISTS/.test(bodyText)) {
          const err = new Error(`Firestore commit precondition failed: ${bodyText}`);
          err.code = "PRECONDITION_FAILED";
          throw err;
        }
        throw new Error(`Firestore commit failed: ${res.status} ${bodyText}`);
      }
      return true;
    },
    // Deterministic, filesystem/Firestore-safe document ID derived from an
    // arbitrary string (e.g. a provider's transaction id), so the same input
    // always maps to the same doc ID — used to let Firestore itself enforce
    // "only one write ever succeeds for this id" via a create-precondition,
    // closing the check-then-write race a separate query would have.
    async deterministicId(input) {
      const bytes = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  };
}
__name(createFirestoreClient, "createFirestoreClient");

// src/firebaseAuth.js
var JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);
async function verifyIdToken(request, env2) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token)
    return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${env2.FIREBASE_PROJECT_ID}`,
      audience: env2.FIREBASE_PROJECT_ID
    });
    return { uid: payload.sub, claims: payload };
  } catch (e) {
    console.error("[FirebaseAuth] token verification failed:", e?.message || e);
    return null;
  }
}
__name(verifyIdToken, "verifyIdToken");
async function requireAdmin(request, env2, firestore) {
  const auth = await verifyIdToken(request, env2);
  if (!auth)
    return { ok: false, status: 401, error: "UNAUTHENTICATED" };
  const userDoc = await firestore.getDoc(`users/${auth.uid}`);
  if (!userDoc || userDoc.role !== "admin") {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }
  return { ok: true, uid: auth.uid };
}
__name(requireAdmin, "requireAdmin");

// src/reward.js
async function creditReward(firestore, { userId, amountRupees, coinAmount, type, source, provider, providerTransactionId, transactionKey, description, metadata, userFields = {}, userUpdateMask = [], additionalWrites = [] }) {
  if (amountRupees <= 0)
    throw new AppError("INVALID_AMOUNT", "Reward amount must be positive.");
  const eventKey = transactionKey || providerTransactionId;
  const transactionId = eventKey ? `ptx_${await firestore.deterministicId(eventKey)}` : crypto.randomUUID();
  const userMeta = await firestore.getDocMeta(`users/${userId}`);
  if (!userMeta)
    throw new AppError("USER_NOT_FOUND", "User not found.");
  const user = userMeta.doc;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const coinDelta = coinAmount ?? Math.round(amountRupees * 100);
  const newBalance = (user.balanceRupees || 0) + amountRupees;
  const newCoins = (user.coinBalance || 0) + coinDelta;
  const newTotalEarned = (user.totalEarnedCoins || 0) + coinDelta;
  try {
    await firestore.commit([
      {
        path: `transactions/${transactionId}`,
        data: {
          transactionId,
          userId,
          type,
          source: source || type,
          provider: provider || null,
          providerTransactionId: providerTransactionId || null,
          eventKey: eventKey || null,
          amountRupees,
          amountCoins: coinDelta,
          status: "completed",
          description: description || "",
          metadata: metadata || {},
          createdAt: now,
          updatedAt: now
        },
        condition: eventKey ? { exists: false } : void 0
      },
      {
        path: `users/${userId}`,
        data: { balanceRupees: newBalance, coinBalance: newCoins, totalEarnedCoins: newTotalEarned, updatedAt: now, ...userFields },
        updateMask: ["balanceRupees", "coinBalance", "totalEarnedCoins", "updatedAt", ...userUpdateMask],
        condition: userMeta.updateTime ? { updateTime: userMeta.updateTime } : void 0
      },
      ...additionalWrites
    ]);
  } catch (err) {
    if (eventKey && err.code === "PRECONDITION_FAILED") {
      const existing = await firestore.getDoc(`transactions/${transactionId}`);
      if (existing)
        return { alreadyProcessed: true, transaction: existing };
    }
    throw err;
  }
  return { alreadyProcessed: false, transactionId, newBalance };
}
__name(creditReward, "creditReward");
async function reverseTransaction(firestore, { originalTransactionId, userId, amountRupees, reason, type = "reward_reversal", coinDelta = null, idempotencyKey, userFields = {}, userUpdateMask = [], additionalWrites = [] }) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const eventKey = idempotencyKey || `reversal:${originalTransactionId || crypto.randomUUID()}`;
  const transactionId = `rtx_${await firestore.deterministicId(eventKey)}`;
  const userMeta = await firestore.getDocMeta(`users/${userId}`);
  if (!userMeta)
    throw new AppError("USER_NOT_FOUND", "User not found.");
  const user = userMeta.doc;
  const newBalance = (user.balanceRupees || 0) + amountRupees;
  const effectiveCoinDelta = coinDelta ?? Math.round(amountRupees * 100);
  const newCoins = Math.max((user.coinBalance || 0) + effectiveCoinDelta, 0);
  try {
    await firestore.commit([
      {
        path: `transactions/${transactionId}`,
        data: { transactionId, userId, type, amountRupees, status: "completed", description: reason || "", metadata: { originalTransactionId, eventKey }, createdAt: now, updatedAt: now },
        condition: { exists: false }
      },
      { path: `users/${userId}`, data: { balanceRupees: newBalance, coinBalance: newCoins, updatedAt: now, ...userFields }, updateMask: ["balanceRupees", "coinBalance", "updatedAt", ...userUpdateMask], condition: userMeta.updateTime ? { updateTime: userMeta.updateTime } : void 0 },
      ...additionalWrites
    ]);
  } catch (err) {
    if (err.code === "PRECONDITION_FAILED") {
      const existing = await firestore.getDoc(`transactions/${transactionId}`);
      if (existing)
        return { alreadyProcessed: true, transactionId, transaction: existing };
    }
    throw err;
  }
  return { alreadyProcessed: false, transactionId, newBalance };
}
__name(reverseTransaction, "reverseTransaction");
var AppError = class extends Error {
  constructor(code, message2, status = 400) {
    super(message2);
    this.code = code;
    this.status = status;
  }
};
__name(AppError, "AppError");

// src/http.js
function corsHeaders(env2, request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env2.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function json(data, init = {}) {
  return new Response(JSON.stringify({ success: true, data }), {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers || {} }
  });
}
__name(json, "json");
function jsonError(err, init = {}) {
  const status = err instanceof AppError ? err.status : init.status || 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  const message2 = err instanceof AppError ? err.message : "Something went wrong. Please try again.";
  return new Response(JSON.stringify({ success: false, error: { code, message: message2 } }), {
    status,
    headers: { "Content-Type": "application/json", ...init.headers || {} }
  });
}
__name(jsonError, "jsonError");
var buckets = /* @__PURE__ */ new Map();
function rateLimit(key, { limit = 30, windowMs = 6e4 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  buckets.set(key, entry);
  return entry.count <= limit;
}
__name(rateLimit, "rateLimit");

// src/admin.js
function q(url, key, fallback = null) {
  const v = url.searchParams.get(key);
  return v === null || v === "" ? fallback : v;
}
__name(q, "q");
function businessDateKey(date, timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
__name(businessDateKey, "businessDateKey");
var SETTINGS_DEFAULTS = {
  minWithdrawRupees: 50,
  dailyWithdrawLimitRupees: 0,
  referralRewardRupees: 20,
  dailyBonusBaseRupees: 2,
  supportEmail: "",
  maintenanceMode: false,
  enabledMethods: ["upi"],
  businessTimezone: "Asia/Kolkata"
};
function validateSettings(payload) {
  const allowed = new Set(Object.keys(SETTINGS_DEFAULTS));
  for (const key of Object.keys(payload || {}))
    if (!allowed.has(key))
      throw new AppError("INVALID_SETTING", `Unsupported setting: ${key}.`);
  const out = {};
  const money = /* @__PURE__ */ __name((key, min, max) => {
    if (payload[key] === void 0)
      return;
    const value = Number(payload[key]);
    if (!Number.isFinite(value) || value < min || value > max)
      throw new AppError("INVALID_SETTING", `${key} must be between ${min} and ${max}.`);
    out[key] = Math.round(value * 100) / 100;
  }, "money");
  money("minWithdrawRupees", 0.01, 1e6);
  money("dailyWithdrawLimitRupees", 0, 1e7);
  money("referralRewardRupees", 0, 1e6);
  money("dailyBonusBaseRupees", 0.01, 1e5);
  if (payload.supportEmail !== void 0) {
    if (typeof payload.supportEmail !== "string" || payload.supportEmail.length > 254 || payload.supportEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.supportEmail))
      throw new AppError("INVALID_SETTING", "supportEmail is invalid.");
    out.supportEmail = payload.supportEmail.trim();
  }
  if (payload.maintenanceMode !== void 0) {
    if (typeof payload.maintenanceMode !== "boolean")
      throw new AppError("INVALID_SETTING", "maintenanceMode must be boolean.");
    out.maintenanceMode = payload.maintenanceMode;
  }
  if (payload.enabledMethods !== void 0) {
    if (!Array.isArray(payload.enabledMethods) || payload.enabledMethods.length === 0 || payload.enabledMethods.some((m) => !["upi", "amazon", "flipkart", "myntra"].includes(m)))
      throw new AppError("INVALID_SETTING", "enabledMethods contains an unsupported method.");
    out.enabledMethods = [...new Set(payload.enabledMethods)];
  }
  if (payload.businessTimezone !== void 0) {
    if (typeof payload.businessTimezone !== "string" || payload.businessTimezone.length > 64)
      throw new AppError("INVALID_SETTING", "businessTimezone is invalid.");
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: payload.businessTimezone }).format();
    } catch {
      throw new AppError("INVALID_SETTING", "businessTimezone is invalid.");
    }
    out.businessTimezone = payload.businessTimezone;
  }
  return out;
}
__name(validateSettings, "validateSettings");
async function handleAdminStats(request, env2, firestore) {
  const url = new URL(request.url);
  const range = q(url, "range", "7d");
  const since = rangeToDate(range);
  const [users, transactions, withdrawals, settings] = await Promise.all([
    firestore.runQuery("users"),
    firestore.runQuery("transactions", { where: [["createdAt", "GREATER_THAN_OR_EQUAL", since]], limit: 1e3 }),
    firestore.runQuery("withdrawals", { where: [["status", "EQUAL", "pending"]], limit: 500 }),
    firestore.getDoc("settings/platform")
  ]);
  const userRewards = transactions.filter((t) => t.amountRupees > 0 && t.type !== "manual_credit").reduce((s, t) => s + t.amountRupees, 0);
  const revenue = userRewards * 1.4;
  const profit = revenue - userRewards;
  const bySource = {};
  for (const t of transactions) {
    if (t.amountRupees <= 0)
      continue;
    bySource[t.type] = (bySource[t.type] || 0) + t.amountRupees;
  }
  return json({
    totalUsers: users.length,
    activeToday: users.filter((u) => u.updatedAt && businessDateKey(new Date(u.updatedAt), settings?.businessTimezone || SETTINGS_DEFAULTS.businessTimezone) === businessDateKey(/* @__PURE__ */ new Date(), settings?.businessTimezone || SETTINGS_DEFAULTS.businessTimezone)).length,
    revenue,
    userRewards,
    profit,
    isEstimate: true,
    pendingWithdrawals: withdrawals.length,
    providerCosts: userRewards * 0.9,
    withdrawalsTotal: withdrawals.reduce((s, w) => s + (w.amountRupees || 0), 0),
    earningSources: Object.entries(bySource).map(([label, amountRupees]) => ({ label, amountRupees })),
    byProvider: [],
    byType: Object.entries(bySource).map(([type, revenue2]) => ({ type, revenue: revenue2, userRewards: revenue2, profit: 0 })),
    recentActivity: transactions.slice(0, 10).map((t) => ({ event: t.type, actor: t.userId, detail: t.description, timestamp: t.createdAt }))
  });
}
__name(handleAdminStats, "handleAdminStats");
function rangeToDate(range) {
  const days = { today: 1, "7d": 7, "30d": 30, "90d": 90 }[range] || 7;
  return new Date(Date.now() - days * 864e5).toISOString();
}
__name(rangeToDate, "rangeToDate");
async function handleAdminListUsers(request, env2, firestore) {
  const url = new URL(request.url);
  const status = q(url, "status", "All");
  const search = q(url, "q", "").trim().toLowerCase();
  let users = await firestore.runQuery("users", { limit: 200 });
  if (status === "Active")
    users = users.filter((u) => !u.suspended);
  if (status === "Suspended")
    users = users.filter((u) => u.suspended);
  users = users.map((u) => ({ ...u, riskLevel: u.riskLevel || "Low" }));
  if (status === "High Risk")
    users = users.filter((u) => u.riskLevel === "High");
  if (search) {
    users = users.filter(
      (u) => (u.displayName || "").toLowerCase().includes(search) || (u.email || "").toLowerCase().includes(search) || u.id.toLowerCase().includes(search)
    );
  }
  if (users.length > 0) {
    const allReferrals = await firestore.runQuery("referrals", { limit: 1e3 });
    const counts = {};
    for (const r of allReferrals)
      counts[r.referrerId] = (counts[r.referrerId] || 0) + 1;
    users = users.map((u) => ({ ...u, referralCount: counts[u.id] || 0 }));
  }
  return json(users);
}
__name(handleAdminListUsers, "handleAdminListUsers");
async function handleAdminGetUserDetail(request, env2, firestore, userId) {
  const user = await firestore.getDoc(`users/${userId}`);
  if (!user)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const [transactions, withdrawals, submissions, referred, referralsMade] = await Promise.all([
    firestore.runQuery("transactions", { where: [["userId", "EQUAL", userId]], orderBy: ["createdAt", "DESCENDING"], limit: 50 }),
    firestore.runQuery("withdrawals", { where: [["userId", "EQUAL", userId]], orderBy: ["createdAt", "DESCENDING"], limit: 50 }),
    firestore.runQuery("taskSubmissions", { where: [["userId", "EQUAL", userId]], limit: 50 }),
    firestore.runQuery("referrals", { where: [["referredId", "EQUAL", userId]], limit: 1 }),
    firestore.runQuery("referrals", { where: [["referrerId", "EQUAL", userId]], limit: 200 })
  ]);
  return json({
    user,
    transactions,
    withdrawals,
    submissions,
    referredBy: referred[0] || null,
    referralsMade
  });
}
__name(handleAdminGetUserDetail, "handleAdminGetUserDetail");
async function handleAdminSuspendUser(request, env2, firestore, userId, adminUid) {
  const { suspend } = await request.json();
  const userMeta = await firestore.getDocMeta(`users/${userId}`);
  if (!userMeta)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  await firestore.setDoc(`users/${userId}`, { ...userMeta.doc, suspended: !!suspend, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { updateTime: userMeta.updateTime });
  await writeAdminLog(firestore, adminUid, suspend ? "user_suspended" : "user_unsuspended", userId, {});
  return json({ suspended: !!suspend });
}
__name(handleAdminSuspendUser, "handleAdminSuspendUser");
async function handleAdminAdjustBalance(request, env2, firestore, userId, adminUid) {
  const { amountRupees, reason } = await request.json();
  if (typeof amountRupees !== "number" || !Number.isFinite(amountRupees) || amountRupees === 0) {
    throw new AppError("INVALID_INPUT", "amountRupees must be a non-zero number.");
  }
  if (amountRupees > 0) {
    const result = await creditReward(firestore, {
      userId,
      amountRupees,
      type: "manual_credit",
      source: "admin",
      providerTransactionId: `manual:${crypto.randomUUID()}`,
      description: reason || "Manual credit",
      metadata: { adminUid }
    });
    await writeAdminLog(firestore, adminUid, "manual_credit", userId, { amountRupees, reason });
    return json({ transactionId: result.transactionId });
  } else {
    const user = await firestore.getDoc(`users/${userId}`);
    if (!user)
      throw new AppError("USER_NOT_FOUND", "User not found.", 404);
    if ((user.balanceRupees || 0) + amountRupees < 0) {
      throw new AppError("INSUFFICIENT_BALANCE", "This debit would take the user's balance below zero.");
    }
    const result = await reverseTransaction(firestore, {
      originalTransactionId: null,
      userId,
      amountRupees,
      reason: reason || "Manual debit",
      type: "manual_debit",
      // Keep coinBalance in step with balanceRupees on manual debits too,
      // same as withdrawal debits — otherwise the two ledgers drift apart.
      coinDelta: Math.round(amountRupees * 100)
    });
    await writeAdminLog(firestore, adminUid, "manual_debit", userId, { amountRupees, reason });
    return json({ transactionId: result.transactionId });
  }
}
__name(handleAdminAdjustBalance, "handleAdminAdjustBalance");
async function handleAdminListTasks(request, env2, firestore) {
  const url = new URL(request.url);
  const status = q(url, "status", "All");
  const search = q(url, "q", "").trim().toLowerCase();
  let tasks = await firestore.runQuery("tasks", { limit: 300 });
  if (status !== "All")
    tasks = tasks.filter((t) => (t.status || "").toLowerCase() === status.toLowerCase());
  if (search)
    tasks = tasks.filter((t) => [t.title, t.provider, t.category].some((v) => String(v || "").toLowerCase().includes(search)));
  return json(tasks);
}
__name(handleAdminListTasks, "handleAdminListTasks");
async function handleAdminGetTask(request, env2, firestore, taskId) {
  const task = await firestore.getDoc(`tasks/${taskId}`);
  if (!task)
    throw new AppError("NOT_FOUND", "Task not found.", 404);
  const internal = await firestore.getDoc(`taskInternal/${taskId}`);
  return json({ ...task, notes: internal?.notes || "" });
}
__name(handleAdminGetTask, "handleAdminGetTask");
async function handleAdminCreateTask(request, env2, firestore, adminUid) {
  const payload = await request.json();
  const taskId = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { notes, ...publicPayload } = payload;
  await firestore.createDoc("tasks", taskId, { ...publicPayload, iconUrl: publicPayload.iconUrl || publicPayload.icon || "", id: taskId, completions: 0, createdAt: now, updatedAt: now });
  if (notes)
    await firestore.setDoc(`taskInternal/${taskId}`, { taskId, notes, updatedAt: now });
  await writeAdminLog(firestore, adminUid, "task_created", taskId, { title: payload.title });
  return json({ id: taskId });
}
__name(handleAdminCreateTask, "handleAdminCreateTask");
async function handleAdminUpdateTask(request, env2, firestore, taskId, adminUid) {
  const payload = await request.json();
  const existingMeta = await firestore.getDocMeta(`tasks/${taskId}`);
  if (!existingMeta)
    throw new AppError("NOT_FOUND", "Task not found.", 404);
  const existing = existingMeta.doc;
  const { notes, ...publicPayload } = payload;
  await firestore.setDoc(`tasks/${taskId}`, { ...existing, ...publicPayload, completions: existing.completions || 0, iconUrl: publicPayload.iconUrl || existing.iconUrl || existing.icon || "", updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { updateTime: existingMeta.updateTime });
  if (notes !== void 0)
    await firestore.setDoc(`taskInternal/${taskId}`, { taskId, notes: String(notes || ""), updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  await writeAdminLog(firestore, adminUid, "task_updated", taskId, { ...publicPayload, notesChanged: notes !== void 0 });
  return json({ id: taskId });
}
__name(handleAdminUpdateTask, "handleAdminUpdateTask");
async function handleAdminListSubmissions(request, env2, firestore) {
  const url = new URL(request.url);
  const status = q(url, "status", "All");
  const map = { "Pending": "verification", "Approved": "completed", "Rejected": "failed", "In Progress": "in_progress", "Verification": "verification", "Completed": "completed", "Failed": "failed" };
  const kind = q(url, "kind", "");
  let items = await firestore.runQuery("taskSubmissions", { orderBy: ["startedAt", "DESCENDING"], limit: 300 });
  if (status !== "All" && map[status])
    items = items.filter((s) => s.status === map[status]);
  if (kind === "ongoing")
    items = items.filter((s) => s.status === "in_progress" || s.status === "verification");
  return json(items);
}
__name(handleAdminListSubmissions, "handleAdminListSubmissions");
async function handleAdminListWithdrawals(request, env2, firestore) {
  const url = new URL(request.url);
  const status = q(url, "status", "All");
  let items = await firestore.runQuery("withdrawals", { orderBy: ["createdAt", "DESCENDING"], limit: 300 });
  if (status !== "All")
    items = items.filter((w) => w.status === status.toLowerCase());
  return json(items);
}
__name(handleAdminListWithdrawals, "handleAdminListWithdrawals");
async function handleAdminListTransactions(request, env2, firestore) {
  const items = await firestore.runQuery("transactions", { orderBy: ["createdAt", "DESCENDING"], limit: 300 });
  return json(items);
}
__name(handleAdminListTransactions, "handleAdminListTransactions");
async function handleAdminListProviders(request, env2, firestore) {
  const items = await firestore.runQuery("providers", { limit: 100 });
  return json(items);
}
__name(handleAdminListProviders, "handleAdminListProviders");
async function handleAdminListFraud(request, env2, firestore) {
  const url = new URL(request.url);
  const risk = q(url, "risk", "All");
  let items = await firestore.runQuery("fraudFlags", { orderBy: ["detectedAt", "DESCENDING"], limit: 200 });
  items = items.map((f) => ({ ...f, riskLevel: f.riskLevel || f.risk || "Low" }));
  if (risk !== "All")
    items = items.filter((f) => (f.riskLevel || "").toLowerCase() === risk.toLowerCase());
  return json(items);
}
__name(handleAdminListFraud, "handleAdminListFraud");
async function handleAdminResolveFraud(request, env2, firestore, flagId, adminUid) {
  const { action } = await request.json();
  const flagMeta = await firestore.getDocMeta(`fraudFlags/${flagId}`);
  if (!flagMeta)
    throw new AppError("NOT_FOUND", "Flag not found.", 404);
  const flag = flagMeta.doc;
  const normalizedRisk = flag.riskLevel || flag.risk || (action === "suspend" ? "High" : "Low");
  const writes = [{ path: `fraudFlags/${flagId}`, data: { ...flag, riskLevel: normalizedRisk, status: action === "clear" ? "cleared" : action, resolvedAt: (/* @__PURE__ */ new Date()).toISOString() }, condition: { updateTime: flagMeta.updateTime } }];
  if (flag.userId) {
    const userMeta = await firestore.getDocMeta(`users/${flag.userId}`);
    if (userMeta)
      writes.push({ path: `users/${flag.userId}`, data: { ...userMeta.doc, riskLevel: action === "clear" ? "Low" : normalizedRisk, suspended: action === "suspend" ? true : userMeta.doc.suspended }, condition: { updateTime: userMeta.updateTime } });
  }
  await firestore.commit(writes);
  await writeAdminLog(firestore, adminUid, `fraud_${action}`, flagId, {});
  return json({ status: action });
}
__name(handleAdminResolveFraud, "handleAdminResolveFraud");
async function handleAdminListBroadcasts(request, env2, firestore) {
  const items = await firestore.runQuery("broadcasts", { orderBy: ["sentAt", "DESCENDING"], limit: 100 });
  return json(items);
}
__name(handleAdminListBroadcasts, "handleAdminListBroadcasts");
async function handleAdminSendNotification(request, env2, firestore, adminUid) {
  const { audience, title: title2, body } = await request.json();
  if (!title2 || !body)
    throw new AppError("INVALID_INPUT", "title and body are required.");
  if (!["all", "active", "suspended"].includes(audience))
    throw new AppError("INVALID_INPUT", "audience must be 'all', 'active', or 'suspended'.");
  let users = await firestore.runQuery("users");
  if (audience === "active")
    users = users.filter((u) => !u.suspended);
  if (audience === "suspended")
    users = users.filter((u) => u.suspended);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const results = [];
  const chunkSize = 25;
  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map((u) => firestore.createDoc(`users/${u.id}/notifications`, crypto.randomUUID(), { category: "system", title: title2, body, read: false, createdAt: now })));
    results.push(...chunkResults);
  }
  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;
  const broadcastId = crypto.randomUUID();
  await firestore.createDoc("broadcasts", broadcastId, { title: title2, body, audience, attemptedCount: results.length, sentCount: sent, failedCount: failed, sentBy: adminUid, sentAt: now });
  await writeAdminLog(firestore, adminUid, "notification_broadcast", broadcastId, { audience, title: title2, attemptedCount: results.length, sentCount: sent, failedCount: failed });
  return json({ broadcastId, attemptedCount: results.length, sentCount: sent, failedCount: failed, partialFailure: failed > 0 });
}
__name(handleAdminSendNotification, "handleAdminSendNotification");
async function handleAdminSettingsGet(request, env2, firestore) {
  const settings = await firestore.getDoc("settings/platform");
  return json({ ...SETTINGS_DEFAULTS, ...settings || {} });
}
__name(handleAdminSettingsGet, "handleAdminSettingsGet");
async function handleAdminSettingsSet(request, env2, firestore, adminUid) {
  const payload = await request.json();
  const validated = validateSettings(payload);
  const existing = await firestore.getDoc("settings/platform");
  await firestore.setDoc("settings/platform", { ...SETTINGS_DEFAULTS, ...existing || {}, ...validated, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  await writeAdminLog(firestore, adminUid, "settings_updated", "platform", validated);
  return json({ saved: true });
}
__name(handleAdminSettingsSet, "handleAdminSettingsSet");
async function handleAdminLogs(request, env2, firestore) {
  const url = new URL(request.url);
  const type = q(url, "type", "All");
  const CATEGORY_MAP = {
    Task: ["task_created", "task_updated"],
    User: ["manual_credit", "manual_debit", "fraud_review", "fraud_suspend", "fraud_clear", "user_suspended", "user_unsuspended"],
    Withdrawal: ["withdrawal_approved", "withdrawal_paid", "withdrawal_rejected"],
    Settings: ["settings_updated"]
  };
  let items = await firestore.runQuery("adminLogs", { orderBy: ["timestamp", "DESCENDING"], limit: 200 });
  if (type !== "All" && CATEGORY_MAP[type])
    items = items.filter((l) => CATEGORY_MAP[type].includes(l.action));
  return json(items);
}
__name(handleAdminLogs, "handleAdminLogs");
async function writeAdminLog(firestore, adminUid, action, target, details) {
  const id = crypto.randomUUID();
  await firestore.createDoc("adminLogs", id, { admin: adminUid, action, target: String(target), details, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
}
__name(writeAdminLog, "writeAdminLog");

// src/routes.js
var SETTINGS_DEFAULTS2 = {
  minWithdrawRupees: 50,
  referralRewardRupees: 20,
  dailyBonusBaseRupees: 2,
  dailyWithdrawLimitRupees: 0,
  businessTimezone: "Asia/Kolkata",
  enabledMethods: ["upi"],
  maintenanceMode: false,
  supportEmail: ""
};
var DAILY_BONUS_CURVE = [2, 3, 5, 5, 8, 10, 20];
function dailyBonusSchedule(settings) {
  const scale = Number(settings.dailyBonusBaseRupees || 2) / DAILY_BONUS_CURVE[0];
  return DAILY_BONUS_CURVE.map((amount) => Math.round(amount * scale * 100) / 100);
}
__name(dailyBonusSchedule, "dailyBonusSchedule");
async function getPlatformSettings(firestore) {
  const settings = await firestore.getDoc("settings/platform");
  return { ...SETTINGS_DEFAULTS2, ...settings || {} };
}
__name(getPlatformSettings, "getPlatformSettings");
async function requireUser(request, env2, firestore) {
  const auth = await verifyIdToken(request, env2);
  if (!auth)
    throw new AppError("UNAUTHENTICATED", "Sign-in required.", 401);
  const user = await firestore.getDoc(`users/${auth.uid}`);
  if (!user)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  if (user.suspended)
    throw new AppError("ACCOUNT_SUSPENDED", "This account is suspended.", 403);
  return auth.uid;
}
__name(requireUser, "requireUser");
function listValue(value) {
  if (Array.isArray(value))
    return value.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
  return String(value || "").split(/[,|]/).map((v) => v.trim().toUpperCase()).filter(Boolean);
}
__name(listValue, "listValue");
function deviceClasses(request) {
  const ua = request.headers.get("user-agent") || "";
  const mobileHint = request.headers.get("sec-ch-ua-mobile") || "";
  const platform2 = request.headers.get("sec-ch-ua-platform") || "";
  const isTablet = /ipad|tablet|playbook|silk/i.test(ua) || /android/i.test(ua) && !/mobile/i.test(ua) || /macintosh/i.test(ua) && /ipad|iphone/i.test(ua);
  const isMobile = isTablet || /mobile|android|iphone|ipod/i.test(ua) || mobileHint === "?1";
  const classes = new Set(isMobile ? ["MOBILE"] : ["DESKTOP"]);
  if (isTablet)
    classes.add("TABLET");
  if (/windows|macintosh|linux|chromeos/i.test(`${ua} ${platform2}`) && !isMobile)
    classes.add("DESKTOP");
  return classes;
}
__name(deviceClasses, "deviceClasses");
function businessDateKey2(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || SETTINGS_DEFAULTS2.businessTimezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
__name(businessDateKey2, "businessDateKey");
function previousBusinessDateKey(dateKey) {
  const d = /* @__PURE__ */ new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
__name(previousBusinessDateKey, "previousBusinessDateKey");
function publicTask(task) {
  const { notes, internalNotes, ...safe } = task;
  return safe;
}
__name(publicTask, "publicTask");
function enforceTaskEligibility(request, task) {
  const now = Date.now();
  if (task.startDate && now < Date.parse(task.startDate))
    throw new AppError("TASK_NOT_STARTED", "This task is not available yet.", 409);
  if (task.expiryDate && now > Date.parse(task.expiryDate))
    throw new AppError("TASK_EXPIRED", "This task has expired.", 409);
  const countries = listValue(task.country);
  if (countries.length && !countries.includes("ALL")) {
    const country = String(request.cf?.country || request.headers.get("CF-IPCountry") || "").toUpperCase();
    if (!country || !countries.includes(country))
      throw new AppError("COUNTRY_RESTRICTED", "This task is not available in your country.", 403);
  }
  const devices = listValue(task.device);
  if (devices.length && !devices.includes("ALL")) {
    const classes = deviceClasses(request);
    if (!devices.some((device) => classes.has(device)))
      throw new AppError("DEVICE_RESTRICTED", "This task is not available on this device.", 403);
  }
}
__name(enforceTaskEligibility, "enforceTaskEligibility");
async function handleGetPublicSettings(request, env2, firestore) {
  const settings = await getPlatformSettings(firestore);
  return json({
    minWithdrawRupees: settings.minWithdrawRupees,
    dailyWithdrawLimitRupees: settings.dailyWithdrawLimitRupees,
    enabledMethods: settings.enabledMethods,
    maintenanceMode: settings.maintenanceMode,
    supportEmail: settings.supportEmail
  });
}
__name(handleGetPublicSettings, "handleGetPublicSettings");
async function handleGetUser(request, env2, firestore) {
  const uid = await requireUser(request, env2, firestore);
  const user = await firestore.getDoc(`users/${uid}`);
  if (!user)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  return json(user);
}
__name(handleGetUser, "handleGetUser");
async function handleGetTransactions(request, env2, firestore) {
  const uid = await requireUser(request, env2, firestore);
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const items = await firestore.runQuery("transactions", {
    where: [["userId", "EQUAL", uid]],
    orderBy: ["createdAt", "DESCENDING"],
    limit
  });
  return json(items);
}
__name(handleGetTransactions, "handleGetTransactions");
async function handleGetWithdrawals(request, env2, firestore) {
  const uid = await requireUser(request, env2, firestore);
  const items = await firestore.runQuery("withdrawals", { where: [["userId", "EQUAL", uid]], orderBy: ["createdAt", "DESCENDING"], limit: 50 });
  return json(items);
}
__name(handleGetWithdrawals, "handleGetWithdrawals");
async function handleListTasks(request, env2, firestore) {
  await requireUser(request, env2, firestore);
  const tasks = await firestore.runQuery("tasks", { where: [["status", "EQUAL", "active"]], orderBy: ["createdAt", "DESCENDING"], limit: 300 });
  const eligible = tasks.filter((task) => {
    try {
      enforceTaskEligibility(request, task);
      return true;
    } catch {
      return false;
    }
  });
  return json(eligible.map(publicTask));
}
__name(handleListTasks, "handleListTasks");
async function handleGetTask(request, env2, firestore, taskId) {
  await requireUser(request, env2, firestore);
  const task = await firestore.getDoc(`tasks/${taskId}`);
  if (!task || task.status !== "active")
    throw new AppError("TASK_UNAVAILABLE", "This task is not available.", 404);
  enforceTaskEligibility(request, task);
  return json(publicTask(task));
}
__name(handleGetTask, "handleGetTask");
async function handleTaskStart(request, env2, firestore) {
  const uid = await requireUser(request, env2, firestore);
  const { taskId } = await request.json();
  if (!taskId)
    throw new AppError("INVALID_INPUT", "taskId is required.");
  const task = await firestore.getDoc(`tasks/${taskId}`);
  if (!task || task.status !== "active")
    throw new AppError("TASK_UNAVAILABLE", "This task is not available.", 404);
  enforceTaskEligibility(request, task);
  const configuredReward = Number(task.rewardRupees || 0);
  const maxReward = Number(task.maxRewardRupees || 0);
  if (!Number.isFinite(configuredReward) || configuredReward <= 0)
    throw new AppError("INVALID_TASK_REWARD", "This task has an invalid reward configuration.", 409);
  if (maxReward > 0 && configuredReward > maxReward)
    throw new AppError("INVALID_TASK_REWARD", "This task reward exceeds its configured maximum.", 409);
  const existing = await firestore.runQuery("taskSubmissions", {
    where: [["userId", "EQUAL", uid], ["taskId", "EQUAL", taskId]],
    limit: 20
  });
  const activeSubmission = existing.find((s) => s.status === "in_progress" || s.status === "verification");
  if (activeSubmission)
    return json({ submissionId: activeSubmission.id, status: activeSubmission.status });
  const settings = await getPlatformSettings(firestore);
  const userLimit = task.repeatable ? 0 : Number(task.userLimit) > 0 ? Number(task.userLimit) : 1;
  const dailyLimit = Number(task.dailyLimit || 0);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const nowMs = Date.now();
    const userCompletions = userLimit > 0 ? await firestore.runQuery("taskSubmissions", {
      where: [["userId", "EQUAL", uid], ["taskId", "EQUAL", taskId], ["status", "EQUAL", "completed"]],
      limit: Math.max(userLimit, 100)
    }) : [];
    const userSlotsRaw = userLimit > 0 ? await firestore.runQuery("taskUserSlots", {
      where: [["userId", "EQUAL", uid], ["taskId", "EQUAL", taskId]],
      limit: userLimit + 100
    }) : [];
    const userSlots = userSlotsRaw.filter((slot) => !slot.expiresAt || Date.parse(slot.expiresAt) > nowMs);
    const todayKey = businessDateKey2(/* @__PURE__ */ new Date(), settings.businessTimezone);
    const dailySlotsRaw = dailyLimit > 0 ? await firestore.runQuery("taskDailySlots", {
      where: [["taskId", "EQUAL", taskId], ["businessDateKey", "EQUAL", todayKey]],
      limit: dailyLimit + 100
    }) : [];
    const dailySlots = dailySlotsRaw.filter((slot) => !slot.expiresAt || Date.parse(slot.expiresAt) > nowMs);
    const usedUserSlots = userCompletions.length + userSlots.length;
    if (userLimit > 0 && usedUserSlots >= userLimit)
      throw new AppError("TASK_ALREADY_COMPLETED", "You've already reached this task's completion limit.", 409);
    if (dailyLimit > 0 && dailySlots.length >= dailyLimit)
      throw new AppError("TASK_DAILY_LIMIT_REACHED", "This task has reached its daily completion limit. Try again tomorrow.", 409);
    const submissionId = crypto.randomUUID();
    const providerAttemptId = await firestore.deterministicId(`${uid}:${taskId}:${submissionId}`);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const submissionStatus = task.requiresProof ? "in_progress" : "verification";
    const writes = [{
      path: `taskSubmissions/${submissionId}`,
      data: { userId: uid, taskId, taskTitle: task.title, provider: task.provider || "", providerAttemptId, attemptId: providerAttemptId, iconUrl: task.iconUrl || task.icon || "", rewardRupees: configuredReward, maxRewardRupees: maxReward || null, status: submissionStatus, startedAt: now, updatedAt: now },
      condition: { exists: false }
    }];
    let userSlotId = null;
    let dailySlotId = null;
    if (userLimit > 0) {
      const userSlot = usedUserSlots;
      userSlotId = await firestore.deterministicId(`${uid}:${taskId}:user:${userSlot}`);
      writes.push({ path: `taskUserSlots/${userSlotId}`, data: { userId: uid, taskId, submissionId, slot: userSlot, createdAt: now, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString() }, condition: { exists: false } });
    }
    if (dailyLimit > 0) {
      const dailySlot = dailySlots.length;
      dailySlotId = await firestore.deterministicId(`${taskId}:${todayKey}:daily:${dailySlot}`);
      writes.push({ path: `taskDailySlots/${dailySlotId}`, data: { taskId, businessDateKey: todayKey, submissionId, slot: dailySlot, createdAt: now, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString() }, condition: { exists: false } });
    }
    writes[0].data.userSlotId = userSlotId;
    writes[0].data.dailySlotId = dailySlotId;
    try {
      await firestore.commit(writes);
      return json({ submissionId, attemptId: providerAttemptId, providerAttemptId, status: submissionStatus });
    } catch (err) {
      if (err.code === "PRECONDITION_FAILED")
        continue;
      throw err;
    }
  }
  throw new AppError("TASK_LIMIT_RACE", "This task's limit changed while starting it. Please try again.", 409);
}
__name(handleTaskStart, "handleTaskStart");
async function handleTaskSubmit(request, env2, firestore) {
  const uid = await requireUser(request, env2, firestore);
  const { taskId, proof, submissionId, attemptId } = await request.json();
  const subs = submissionId ? [{ id: submissionId }] : await firestore.runQuery("taskSubmissions", {
    where: [["userId", "EQUAL", uid], ["taskId", "EQUAL", taskId], ["status", "EQUAL", "in_progress"]],
    limit: 1
  });
  if (subs.length === 0)
    throw new AppError("SUBMISSION_NOT_FOUND", "No active submission for this task.", 404);
  const subMeta = await firestore.getDocMeta(`taskSubmissions/${subs[0].id}`);
  if (!subMeta || !subMeta.updateTime || subMeta.doc.userId !== uid || subMeta.doc.status !== "in_progress" || attemptId && subMeta.doc.providerAttemptId !== attemptId)
    throw new AppError("INVALID_STATE", "This submission is no longer active or does not match the attempt.", 409);
  await firestore.setDoc(`taskSubmissions/${subs[0].id}`, {
    ...subMeta.doc,
    status: "verification",
    proof: proof || null,
    submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, { updateTime: subMeta.updateTime });
  return json({ status: "verification" });
}
__name(handleTaskSubmit, "handleTaskSubmit");
async function notifyUser(firestore, userId, { category, title: title2, body }) {
  try {
    await firestore.createDoc(`users/${userId}/notifications`, crypto.randomUUID(), {
      category,
      title: title2,
      body,
      read: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (e) {
  }
}
__name(notifyUser, "notifyUser");
async function handleTaskApprove(request, env2, firestore, adminUid) {
  const { submissionId } = await request.json();
  const subMeta = await firestore.getDocMeta(`taskSubmissions/${submissionId}`);
  if (!subMeta)
    throw new AppError("SUBMISSION_NOT_FOUND", "Submission not found.", 404);
  const sub = subMeta.doc;
  if (sub.status === "completed")
    return json({ status: "completed", alreadyProcessed: true });
  if (sub.status !== "verification")
    throw new AppError("INVALID_STATE", "Only submissions awaiting verification can be approved.", 409);
  const amount = Number(sub.rewardRupees || 0);
  const max = Number(sub.maxRewardRupees || 0);
  if (!Number.isFinite(amount) || amount <= 0 || max > 0 && amount > max)
    throw new AppError("INVALID_REWARD", "Submission reward is outside the permitted range.", 409);
  const taskMeta = sub.taskId ? await firestore.getDocMeta(`tasks/${sub.taskId}`) : null;
  const task = taskMeta?.doc;
  const additionalWrites = [
    { path: `taskSubmissions/${submissionId}`, data: { ...sub, status: "completed", updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, condition: subMeta.updateTime ? { updateTime: subMeta.updateTime } : void 0 }
  ];
  if (sub.userSlotId)
    additionalWrites.push({ path: `taskUserSlots/${sub.userSlotId}`, delete: true, condition: { exists: true } });
  if (sub.dailySlotId)
    additionalWrites.push({ path: `taskDailySlots/${sub.dailySlotId}`, delete: true, condition: { exists: true } });
  if (taskMeta)
    additionalWrites.push({ path: `tasks/${sub.taskId}`, data: { completions: Number(task.completions || 0) + 1, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, updateMask: ["completions", "updatedAt"], condition: taskMeta.updateTime ? { updateTime: taskMeta.updateTime } : void 0 });
  const result = await creditReward(firestore, {
    userId: sub.userId,
    amountRupees: amount,
    type: "task",
    source: "manual_review",
    provider: sub.provider,
    providerTransactionId: `manual:${submissionId}`,
    transactionKey: `submission:${submissionId}`,
    description: `${sub.taskTitle} \u2014 approved`,
    additionalWrites
  });
  if (result.alreadyProcessed)
    return json({ status: "completed", alreadyProcessed: true });
  await notifyUser(firestore, sub.userId, { category: "reward", title: "Task approved", body: `"${sub.taskTitle}" was approved \u2014 \u20B9${amount} added to your balance.` });
  try {
    const pendingReferral = await firestore.runQuery("referrals", { where: [["referredId", "EQUAL", sub.userId], ["status", "EQUAL", "pending"]], limit: 1 });
    if (pendingReferral.length > 0)
      await creditReferralReward(firestore, pendingReferral[0].id);
  } catch (e) {
  }
  return json({ status: "completed", transactionId: result.transactionId });
}
__name(handleTaskApprove, "handleTaskApprove");
async function handleTaskReject(request, env2, firestore, adminUid) {
  const { submissionId, reason } = await request.json();
  const subMeta = await firestore.getDocMeta(`taskSubmissions/${submissionId}`);
  if (!subMeta)
    throw new AppError("SUBMISSION_NOT_FOUND", "Submission not found.", 404);
  const sub = subMeta.doc;
  if (sub.status === "completed")
    throw new AppError("INVALID_STATE", "Completed submissions cannot be rejected; use the audited reward-reversal flow.", 409);
  if (sub.status !== "verification" && sub.status !== "in_progress")
    throw new AppError("INVALID_STATE", "Only active or reviewable submissions can be rejected.", 409);
  if (!subMeta.updateTime)
    throw new AppError("INVALID_STATE", "Submission metadata is missing an update precondition.", 409);
  const rejectWrites = [{ path: `taskSubmissions/${submissionId}`, data: { ...sub, status: "failed", rejectReason: reason || "", updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, condition: { updateTime: subMeta.updateTime } }];
  if (sub.userSlotId)
    rejectWrites.push({ path: `taskUserSlots/${sub.userSlotId}`, delete: true, condition: { exists: true } });
  if (sub.dailySlotId)
    rejectWrites.push({ path: `taskDailySlots/${sub.dailySlotId}`, delete: true, condition: { exists: true } });
  await firestore.commit(rejectWrites);
  await notifyUser(firestore, sub.userId, { category: "system", title: "Task submission rejected", body: `"${sub.taskTitle}" wasn't approved${reason ? `: ${reason}` : "."}` });
  return json({ status: "failed" });
}
__name(handleTaskReject, "handleTaskReject");
async function handleDailyBonusSchedule(request, env2, firestore) {
  const uid = await requireUser(request, env2, firestore);
  const settings = await getPlatformSettings(firestore);
  const user = await firestore.getDoc(`users/${uid}`);
  const todayKey = businessDateKey2(/* @__PURE__ */ new Date(), settings.businessTimezone);
  const claimedToday = !!user && (user.dailyBonusDateKey || (user.lastDailyLogin ? businessDateKey2(new Date(user.lastDailyLogin), settings.businessTimezone) : null)) === todayKey;
  return json({ amounts: dailyBonusSchedule(settings), businessDateKey: todayKey, businessTimezone: settings.businessTimezone, claimedToday, streak: Number(user?.dailyStreak || 0) });
}
__name(handleDailyBonusSchedule, "handleDailyBonusSchedule");
async function handleDailyLoginReward(request, env2, firestore) {
  const uid = await requireUser(request, env2, firestore);
  const user = await firestore.getDoc(`users/${uid}`);
  if (!user)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const settings = await getPlatformSettings(firestore);
  const todayKey = businessDateKey2(/* @__PURE__ */ new Date(), settings.businessTimezone);
  const previousKey = previousBusinessDateKey(todayKey);
  const storedDateKey = user.dailyBonusDateKey || (user.lastDailyLogin ? businessDateKey2(new Date(user.lastDailyLogin), settings.businessTimezone) : null);
  if (storedDateKey === todayKey)
    throw new AppError("ALREADY_CLAIMED", "You've already claimed today's bonus.");
  const streakContinues = storedDateKey === previousKey;
  const prevStreak = user.dailyStreak || 0;
  const newStreak = streakContinues ? prevStreak % 7 + 1 : 1;
  const schedule = dailyBonusSchedule(settings);
  const amount = schedule[(newStreak - 1) % 7];
  const dailyTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const result = await creditReward(firestore, {
    userId: uid,
    amountRupees: amount,
    type: "daily_bonus",
    source: "daily_bonus",
    providerTransactionId: `daily:${uid}:${todayKey}`,
    description: `Daily bonus \u2014 day ${newStreak}`,
    userFields: { dailyStreak: newStreak, lastDailyLogin: dailyTimestamp, dailyBonusDateKey: todayKey },
    userUpdateMask: ["dailyStreak", "lastDailyLogin", "dailyBonusDateKey"]
  });
  return json({ amountRupees: amount, streak: newStreak, transactionId: result.transactionId });
}
__name(handleDailyLoginReward, "handleDailyLoginReward");
async function handleRecordReferral(request, env2, firestore) {
  const uid = await requireUser(request, env2, firestore);
  const { referralCode } = await request.json();
  if (!referralCode)
    throw new AppError("INVALID_INPUT", "referralCode is required.");
  const referrers = await firestore.runQuery("users", { where: [["referralCode", "EQUAL", referralCode]], limit: 1 });
  if (referrers.length === 0)
    throw new AppError("INVALID_CODE", "Referral code not found.");
  const referrer = referrers[0];
  if (referrer.id === uid)
    throw new AppError("SELF_REFERRAL", "You can't refer yourself.");
  const already = await firestore.runQuery("referrals", { where: [["referredId", "EQUAL", uid]], limit: 1 });
  if (already.length > 0)
    throw new AppError("ALREADY_REFERRED", "This account was already referred.");
  const referredUser = await firestore.getDoc(`users/${uid}`);
  const referralId = crypto.randomUUID();
  await firestore.createDoc("referrals", referralId, {
    referrerId: referrer.id,
    referredId: uid,
    referredName: referredUser?.displayName || "New user",
    status: "pending",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return json({ referralId, status: "pending" });
}
__name(handleRecordReferral, "handleRecordReferral");
async function creditReferralReward(firestore, referralId) {
  const refMeta = await firestore.getDocMeta(`referrals/${referralId}`);
  if (!refMeta || refMeta.doc.status === "rewarded")
    return;
  const ref = refMeta.doc;
  const settings = await getPlatformSettings(firestore);
  const rewardAmount = settings.referralRewardRupees;
  try {
    const result = await creditReward(firestore, {
      userId: ref.referrerId,
      amountRupees: rewardAmount,
      type: "referral",
      source: "referral",
      providerTransactionId: `referral:${referralId}`,
      transactionKey: `referral:${referralId}`,
      description: "Referral reward"
    });
    const latest = await firestore.getDocMeta(`referrals/${referralId}`);
    if (latest && latest.doc.status !== "rewarded")
      await firestore.setDoc(`referrals/${referralId}`, { ...latest.doc, status: "rewarded", rewardRupees: rewardAmount, qualifiedAt: latest.doc.qualifiedAt || (/* @__PURE__ */ new Date()).toISOString(), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { updateTime: latest.updateTime });
    await notifyUser(firestore, ref.referrerId, {
      category: "reward",
      title: "Referral reward earned",
      body: `Your referral completed their first task \u2014 \u20B9${rewardAmount} added to your balance.`
    });
    return result;
  } catch (err) {
    const attempts = Number(ref.rewardAttempts || 0) + 1;
    const delayMs = Math.min(24 * 60 * 60 * 1e3, 6e4 * 2 ** Math.min(attempts, 10));
    try {
      await firestore.setDoc(`referrals/${referralId}`, { ...ref, status: "pending", qualifiedAt: ref.qualifiedAt || (/* @__PURE__ */ new Date()).toISOString(), rewardAttempts: attempts, lastRewardError: String(err.message || err).slice(0, 500), nextRetryAt: new Date(Date.now() + delayMs).toISOString(), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { updateTime: refMeta.updateTime });
    } catch (_) {
    }
    throw err;
  }
}
__name(creditReferralReward, "creditReferralReward");
var QUOTA_CLEANUP_BATCH = 100;
async function cleanupExpiredQuotaSlots(firestore, nowMs = Date.now()) {
  const nowIso = new Date(nowMs).toISOString();
  let cleaned = 0;
  let inspected = 0;
  for (const collection of ["taskUserSlots", "taskDailySlots"]) {
    const candidates = await firestore.runQuery(collection, {
      where: [["expiresAt", "LESS_THAN_OR_EQUAL", nowIso]],
      limit: QUOTA_CLEANUP_BATCH
    });
    for (const candidate of candidates) {
      if (inspected >= QUOTA_CLEANUP_BATCH * 2)
        break;
      inspected += 1;
      if (!candidate.expiresAt || Date.parse(candidate.expiresAt) > nowMs)
        continue;
      if (candidate.submissionId) {
        const submission = await firestore.getDoc(`taskSubmissions/${candidate.submissionId}`);
        if (submission && (submission.status === "in_progress" || submission.status === "verification"))
          continue;
      }
      const slotMeta = await firestore.getDocMeta(`${collection}/${candidate.id}`);
      if (!slotMeta || !slotMeta.doc.expiresAt || Date.parse(slotMeta.doc.expiresAt) > nowMs)
        continue;
      if (slotMeta.doc.submissionId) {
        const submission = await firestore.getDoc(`taskSubmissions/${slotMeta.doc.submissionId}`);
        if (submission && (submission.status === "in_progress" || submission.status === "verification"))
          continue;
      }
      try {
        await firestore.commit([{ path: `${collection}/${candidate.id}`, delete: true, condition: slotMeta.updateTime ? { updateTime: slotMeta.updateTime } : { exists: true } }]);
        cleaned += 1;
      } catch (err) {
        if (err.code !== "PRECONDITION_FAILED")
          throw err;
      }
    }
  }
  return { cleaned, inspected };
}
__name(cleanupExpiredQuotaSlots, "cleanupExpiredQuotaSlots");
async function handleScheduledMaintenance(firestore) {
  const now = Date.now();
  const referrals = await firestore.runQuery("referrals", { where: [["status", "EQUAL", "pending"]], limit: 1e3 });
  let retriedReferrals = 0;
  for (const ref of referrals) {
    if (ref.qualifiedAt && (!ref.nextRetryAt || Date.parse(ref.nextRetryAt) <= now)) {
      try {
        await creditReferralReward(firestore, ref.id);
        retriedReferrals += 1;
      } catch (_) {
      }
    }
  }
  const quotaCleanup = await cleanupExpiredQuotaSlots(firestore, now);
  return { retriedReferrals, cleanedQuotaSlots: quotaCleanup.cleaned, inspectedQuotaSlots: quotaCleanup.inspected };
}
__name(handleScheduledMaintenance, "handleScheduledMaintenance");
async function handleWatchAdReward(request, env2, firestore) {
  if (env2.AD_PROVIDER_ENABLED !== "true") {
    throw new AppError(
      "NOT_CONFIGURED",
      "Rewarded ads are not yet enabled on this platform.",
      503
    );
  }
  const uid = await requireUser(request, env2, firestore);
  const { placementId, providerToken } = await request.json();
  if (!providerToken)
    throw new AppError("MISSING_TOKEN", "Ad completion token is required.", 400);
  if (!env2.AD_PROVIDER_VERIFY_URL)
    throw new AppError("NOT_CONFIGURED", "Rewarded-ad verification is not configured.", 503);
  const verifyResponse = await fetch(env2.AD_PROVIDER_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...env2.AD_PROVIDER_VERIFY_SECRET ? { Authorization: `Bearer ${env2.AD_PROVIDER_VERIFY_SECRET}` } : {} },
    body: JSON.stringify({ providerToken, userId: uid, placementId: placementId || "default" })
  });
  if (!verifyResponse.ok)
    throw new AppError("AD_VERIFICATION_FAILED", "The ad completion could not be verified.", 400);
  const verification = await verifyResponse.json();
  if (!verification.verified || verification.userId && verification.userId !== uid)
    throw new AppError("AD_VERIFICATION_FAILED", "The ad completion could not be verified.", 400);
  const user = await firestore.getDoc(`users/${uid}`);
  if (!user)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const COOLDOWN_MS = 6e4;
  if (user.lastRewardedAdTime && Date.now() - new Date(user.lastRewardedAdTime).getTime() < COOLDOWN_MS) {
    throw new AppError("COOLDOWN", "Please wait before watching another ad.");
  }
  const AD_REWARD = 0.5;
  const result = await creditReward(firestore, {
    userId: uid,
    amountRupees: AD_REWARD,
    type: "ad",
    source: "rewarded_ad",
    providerTransactionId: `ad:${uid}:${providerToken}`,
    description: `Rewarded ad \u2014 ${placementId || "default"}`,
    userFields: { lastRewardedAdTime: (/* @__PURE__ */ new Date()).toISOString() },
    userUpdateMask: ["lastRewardedAdTime"]
  });
  return json({ amountRupees: AD_REWARD, transactionId: result.transactionId });
}
__name(handleWatchAdReward, "handleWatchAdReward");
async function handleWithdraw(request, env2, firestore) {
  const uid = await requireUser(request, env2, firestore);
  const { method, amountRupees, upiId } = await request.json();
  if (!["upi", "amazon", "flipkart", "myntra"].includes(method))
    throw new AppError("INVALID_METHOD", "Unsupported payment method.");
  const settings = await getPlatformSettings(firestore);
  if (settings.maintenanceMode)
    throw new AppError("MAINTENANCE_MODE", "Withdrawals are temporarily paused for maintenance. Please try again later.", 503);
  if (settings.enabledMethods && !settings.enabledMethods.includes(method))
    throw new AppError("INVALID_METHOD", "This withdrawal method is currently unavailable.");
  const minWithdraw = Number(settings.minWithdrawRupees);
  const amount = Number(amountRupees);
  if (!Number.isFinite(amount) || amount <= 0 || amount < minWithdraw)
    throw new AppError("BELOW_MINIMUM", `Minimum withdrawal is \u20B9${minWithdraw}.`);
  if (method === "upi" && (!upiId || !upiId.includes("@")))
    throw new AppError("INVALID_UPI", "Enter a valid UPI ID.");
  const userMeta = await firestore.getDocMeta(`users/${uid}`);
  if (!userMeta)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const user = userMeta.doc;
  if ((user.balanceRupees || 0) < amount)
    throw new AppError("INSUFFICIENT_BALANCE", "Insufficient balance.");
  const dailyCap = Number(settings.dailyWithdrawLimitRupees || 0);
  if (dailyCap > 0) {
    const todayKey = businessDateKey2(/* @__PURE__ */ new Date(), settings.businessTimezone);
    const todayWithdrawals = await firestore.runQuery("withdrawals", {
      where: [["userId", "EQUAL", uid], ["businessDateKey", "EQUAL", todayKey]],
      limit: 200
    });
    const usedToday = todayWithdrawals.filter((w) => ["pending", "processing", "paid"].includes(w.status)).reduce((sum, w) => sum + Number(w.amountRupees || 0), 0);
    if (usedToday + amount > dailyCap)
      throw new AppError("DAILY_WITHDRAW_LIMIT", `Daily withdrawal limit is \u20B9${dailyCap}.`, 409);
  }
  const pending = await firestore.runQuery("withdrawals", { where: [["userId", "EQUAL", uid], ["status", "EQUAL", "pending"]], limit: 1 });
  if (pending.length > 0)
    throw new AppError("PENDING_EXISTS", "You already have a pending withdrawal request.");
  const processing = await firestore.runQuery("withdrawals", { where: [["userId", "EQUAL", uid], ["status", "EQUAL", "processing"]], limit: 1 });
  if (processing.length > 0)
    throw new AppError("PENDING_EXISTS", "You already have a withdrawal request being processed.");
  const withdrawalId = crypto.randomUUID();
  const withdrawalTransactionId = crypto.randomUUID();
  const requestId = `WD-${withdrawalId.slice(0, 8).toUpperCase()}`;
  const businessDateKeyValue = businessDateKey2(/* @__PURE__ */ new Date(), settings.businessTimezone);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await firestore.commit([
    { path: `withdrawals/${withdrawalId}`, data: { withdrawalId, requestId, userId: uid, method, amountRupees: amount, upiId: upiId || null, withdrawalTransactionId, businessDateKey: businessDateKeyValue, status: "pending", createdAt: now, updatedAt: now } },
    {
      path: `transactions/${withdrawalTransactionId}`,
      data: { transactionId: withdrawalTransactionId, userId: uid, type: "withdrawal", amountRupees: -amount, status: "pending", description: `Withdrawal \u2014 ${method}`, metadata: { withdrawalId }, createdAt: now, updatedAt: now },
      condition: { exists: false }
    },
    {
      path: `users/${uid}`,
      data: {
        balanceRupees: (user.balanceRupees || 0) - amount,
        coinBalance: Math.max((user.coinBalance || 0) - Math.round(amount * 100), 0),
        pendingWithdrawal: (user.pendingWithdrawal || 0) + amount,
        updatedAt: now
      },
      updateMask: ["balanceRupees", "coinBalance", "pendingWithdrawal", "updatedAt"],
      condition: userMeta.updateTime ? { updateTime: userMeta.updateTime } : void 0
    }
  ]);
  return json({ requestId, withdrawalId, status: "pending" });
}
__name(handleWithdraw, "handleWithdraw");
async function handleWithdrawApprove(request, env2, firestore, adminUid) {
  const { withdrawalId } = await request.json();
  const wMeta = await firestore.getDocMeta(`withdrawals/${withdrawalId}`);
  if (!wMeta)
    throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  const w = wMeta.doc;
  if (w.status !== "pending")
    throw new AppError("INVALID_STATE", "Only pending withdrawals can be approved.", 409);
  await firestore.setDoc(`withdrawals/${withdrawalId}`, { ...w, status: "processing", updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, wMeta.updateTime ? { updateTime: wMeta.updateTime } : void 0);
  await writeAdminLog(firestore, adminUid, "withdrawal_approved", withdrawalId, { userId: w.userId, amountRupees: w.amountRupees });
  return json({ status: "processing" });
}
__name(handleWithdrawApprove, "handleWithdrawApprove");
async function handleWithdrawResolve(request, env2, firestore, adminUid) {
  const { withdrawalId, status } = await request.json();
  if (status !== "paid")
    throw new AppError("INVALID_STATUS", "Withdrawal can only be resolved as paid.");
  const wMeta = await firestore.getDocMeta(`withdrawals/${withdrawalId}`);
  if (!wMeta)
    throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  const w = wMeta.doc;
  if (w.status !== "processing")
    throw new AppError("INVALID_STATE", "Only processing withdrawals can be marked paid.", 409);
  const userMeta = await firestore.getDocMeta(`users/${w.userId}`);
  if (!userMeta)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const txns = await firestore.runQuery("transactions", { where: [["metadata.withdrawalId", "EQUAL", withdrawalId]], limit: 1 });
  const txnMeta = txns.length ? await firestore.getDocMeta(`transactions/${txns[0].id}`) : null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const writes = [
    { path: `withdrawals/${withdrawalId}`, data: { ...w, status: "paid", updatedAt: now }, condition: wMeta.updateTime ? { updateTime: wMeta.updateTime } : void 0 },
    { path: `users/${w.userId}`, data: { pendingWithdrawal: Math.max((userMeta.doc.pendingWithdrawal || 0) - w.amountRupees, 0), totalWithdrawn: (userMeta.doc.totalWithdrawn || 0) + w.amountRupees, totalRedeemedCoins: (userMeta.doc.totalRedeemedCoins || 0) + Math.round(w.amountRupees * 100), updatedAt: now }, updateMask: ["pendingWithdrawal", "totalWithdrawn", "totalRedeemedCoins", "updatedAt"], condition: userMeta.updateTime ? { updateTime: userMeta.updateTime } : void 0 }
  ];
  if (txnMeta)
    writes.push({ path: `transactions/${txnMeta.doc.id}`, data: { ...txnMeta.doc, status: "completed", updatedAt: now }, condition: txnMeta.updateTime ? { updateTime: txnMeta.updateTime } : void 0 });
  await firestore.commit(writes);
  await writeAdminLog(firestore, adminUid, "withdrawal_paid", withdrawalId, { userId: w.userId, amountRupees: w.amountRupees });
  await notifyUser(firestore, w.userId, { category: "withdrawal", title: "Withdrawal paid", body: `Your withdrawal of \u20B9${w.amountRupees} has been paid out.` });
  return json({ status: "paid" });
}
__name(handleWithdrawResolve, "handleWithdrawResolve");
async function handleWithdrawReject(request, env2, firestore, adminUid) {
  const { withdrawalId, reason } = await request.json();
  const wMeta = await firestore.getDocMeta(`withdrawals/${withdrawalId}`);
  if (!wMeta)
    throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  const w = wMeta.doc;
  if (w.status !== "pending" && w.status !== "processing")
    throw new AppError("INVALID_STATE", "Only pending/processing withdrawals can be rejected.", 409);
  const userMeta = await firestore.getDocMeta(`users/${w.userId}`);
  if (!userMeta)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const txns = await firestore.runQuery("transactions", { where: [["metadata.withdrawalId", "EQUAL", withdrawalId]], limit: 1 });
  const txnMeta = w.withdrawalTransactionId ? await firestore.getDocMeta(`transactions/${w.withdrawalTransactionId}`) : txns.length ? await firestore.getDocMeta(`transactions/${txns[0].id}`) : null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const additionalWrites = [
    { path: `withdrawals/${withdrawalId}`, data: { ...w, status: "rejected", rejectReason: reason || "", updatedAt: now }, condition: wMeta.updateTime ? { updateTime: wMeta.updateTime } : void 0 }
  ];
  if (txnMeta)
    additionalWrites.push({
      path: `transactions/${txnMeta.doc.id}`,
      data: { ...txnMeta.doc, status: "reversed", updatedAt: now },
      condition: txnMeta.updateTime ? { updateTime: txnMeta.updateTime } : void 0
    });
  const result = await reverseTransaction(firestore, {
    originalTransactionId: txnMeta?.doc?.id || withdrawalId,
    userId: w.userId,
    amountRupees: w.amountRupees,
    reason: reason || "Withdrawal rejected",
    type: "withdrawal_reversal",
    idempotencyKey: `withdrawal:${withdrawalId}:reversal`,
    userFields: { pendingWithdrawal: Math.max((userMeta.doc.pendingWithdrawal || 0) - w.amountRupees, 0) },
    userUpdateMask: ["pendingWithdrawal"],
    additionalWrites
  });
  if (result.alreadyProcessed)
    return json({ status: "rejected", alreadyProcessed: true });
  await writeAdminLog(firestore, adminUid, "withdrawal_rejected", withdrawalId, { userId: w.userId, amountRupees: w.amountRupees, reason });
  await notifyUser(firestore, w.userId, { category: "withdrawal", title: "Withdrawal rejected", body: `Your withdrawal of \u20B9${w.amountRupees} was rejected${reason ? `: ${reason}` : "."} The amount has been returned to your balance.` });
  return json({ status: "rejected" });
}
__name(handleWithdrawReject, "handleWithdrawReject");

// src/postbacks.js
function mapProviderToType(providerName) {
  if (providerName.includes("survey"))
    return "survey";
  if (providerName.includes("offer"))
    return "offer";
  if (providerName.includes("ad"))
    return "ad";
  return "offer";
}
__name(mapProviderToType, "mapProviderToType");
async function findLinkedSubmission(firestore, { userId, taskId, submissionId, attemptId }) {
  let linkedMeta = submissionId ? await firestore.getDocMeta(`taskSubmissions/${submissionId}`) : null;
  if (!linkedMeta && attemptId) {
    const matches = await firestore.runQuery("taskSubmissions", { where: [["providerAttemptId", "EQUAL", attemptId]], limit: 2 });
    const candidate = matches.find((s) => s.userId === userId && (!taskId || s.taskId === taskId));
    linkedMeta = candidate ? await firestore.getDocMeta(`taskSubmissions/${candidate.id}`) : null;
  }
  return linkedMeta;
}
__name(findLinkedSubmission, "findLinkedSubmission");
async function handleProviderPostback(request, env2, firestore, { providerName, secretParam = "secret", secretEnvVar = "POSTBACK_SECRET" }) {
  const url = new URL(request.url);
  const expectedSecret = env2[secretEnvVar] || env2.POSTBACK_SECRET;
  const secret = url.searchParams.get(secretParam);
  if (!secret || !expectedSecret || secret !== expectedSecret)
    throw new AppError("INVALID_SECRET", "Invalid postback secret.", 401);
  const userId = url.searchParams.get("user_id") || url.searchParams.get("subid");
  const providerTransactionId = url.searchParams.get("transaction_id") || url.searchParams.get("tx_id");
  const amountRupees = Number(url.searchParams.get("payout") || url.searchParams.get("amount") || 0);
  const status = String(url.searchParams.get("status") || "completed").toLowerCase();
  const taskId = url.searchParams.get("task_id");
  const submissionId = url.searchParams.get("submission_id");
  const attemptId = url.searchParams.get("attempt_id") || url.searchParams.get("attempt");
  if (!userId || !providerTransactionId || !Number.isFinite(amountRupees) || amountRupees <= 0)
    throw new AppError("INVALID_PAYLOAD", "Missing required postback fields.");
  if (taskId && !submissionId && !attemptId)
    throw new AppError("MISSING_ATTEMPT_ID", "Provider callback must identify the task attempt.", 400);
  const user = await firestore.getDoc(`users/${userId}`);
  if (!user)
    throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const linkedMeta = taskId || submissionId || attemptId ? await findLinkedSubmission(firestore, { userId, taskId, submissionId, attemptId }) : null;
  if ((taskId || submissionId) && !linkedMeta)
    throw new AppError("SUBMISSION_NOT_FOUND", "Provider callback arrived before the task submission was created.", 409);
  const linked = linkedMeta?.doc;
  if (linked && (linked.userId !== userId || taskId && linked.taskId !== taskId || attemptId && linked.providerAttemptId !== attemptId))
    throw new AppError("INVALID_LINK", "Provider callback does not match the submission attempt.", 400);
  const eventKey = linked ? `submission:${linked.id}` : `provider:${providerName}:${providerTransactionId}`;
  const originalEventKey = linked ? eventKey : providerTransactionId;
  const originalId = `ptx_${await firestore.deterministicId(originalEventKey)}`;
  if (status === "chargeback" || status === "reversal") {
    const originalMeta = await firestore.getDocMeta(`transactions/${originalId}`);
    if (!originalMeta || originalMeta.doc.status !== "completed")
      return json({ handled: true, type: "reversal", reversed: false });
    const result2 = await reverseTransaction(firestore, {
      originalTransactionId: originalId,
      userId,
      amountRupees: -Math.abs(originalMeta.doc.amountRupees),
      reason: `${providerName} chargeback \u2014 ${providerTransactionId}`,
      type: `${mapProviderToType(providerName)}_reversal`,
      idempotencyKey: `chargeback:${eventKey}`,
      additionalWrites: [{
        path: `transactions/${originalId}`,
        data: { ...originalMeta.doc, status: "reversed", updatedAt: (/* @__PURE__ */ new Date()).toISOString() },
        condition: originalMeta.updateTime ? { updateTime: originalMeta.updateTime } : void 0
      }]
    });
    return json({ handled: true, type: "reversal", reversed: !result2.alreadyProcessed, alreadyProcessed: !!result2.alreadyProcessed });
  }
  if (linked) {
    const existingSubmissionTransaction = await firestore.getDoc(originalId);
    if (existingSubmissionTransaction?.status === "completed")
      return json({ handled: true, alreadyProcessed: true, transactionId: originalId });
    if (linked.status === "completed")
      throw new AppError("ALREADY_COMPLETED", "This submission has already been paid.", 409);
    if (linked.status !== "verification" && linked.status !== "in_progress")
      throw new AppError("INVALID_STATE", "The linked submission is not rewardable.", 409);
    const task = linked.taskId ? await firestore.getDoc(`tasks/${linked.taskId}`) : null;
    const expectedReward = Number(task?.providerRewardRupees ?? linked.providerRewardRupees ?? linked.rewardRupees ?? 0);
    const maxReward = Number(task?.maxRewardRupees ?? linked.maxRewardRupees ?? 0);
    if (!Number.isFinite(expectedReward) || expectedReward <= 0 || Math.round(amountRupees * 100) !== Math.round(expectedReward * 100))
      throw new AppError("REWARD_MISMATCH", "Provider payout does not match the server-side task reward.", 409);
    if (maxReward > 0 && amountRupees > maxReward)
      throw new AppError("REWARD_LIMIT_EXCEEDED", "Provider payout exceeds the task maximum reward.", 409);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const additionalWrites = [{
      path: `taskSubmissions/${linked.id}`,
      data: { ...linked, status: "completed", completedTransactionKey: eventKey, updatedAt: now },
      condition: linkedMeta.updateTime ? { updateTime: linkedMeta.updateTime } : void 0
    }];
    if (linked.userSlotId)
      additionalWrites.push({ path: `taskUserSlots/${linked.userSlotId}`, delete: true, condition: { exists: true } });
    if (linked.dailySlotId)
      additionalWrites.push({ path: `taskDailySlots/${linked.dailySlotId}`, delete: true, condition: { exists: true } });
    if (task && linked.taskId) {
      const taskMeta = await firestore.getDocMeta(`tasks/${linked.taskId}`);
      if (taskMeta)
        additionalWrites.push({
          path: `tasks/${linked.taskId}`,
          data: { completions: Number(task.completions || 0) + 1, updatedAt: now },
          updateMask: ["completions", "updatedAt"],
          condition: taskMeta.updateTime ? { updateTime: taskMeta.updateTime } : void 0
        });
    }
    const result2 = await creditReward(firestore, {
      userId,
      amountRupees,
      type: "task",
      source: providerName,
      provider: providerName,
      providerTransactionId,
      transactionKey: eventKey,
      description: `${providerName} \u2014 ${providerTransactionId}`,
      additionalWrites
    });
    return json({ handled: true, alreadyProcessed: !!result2.alreadyProcessed, transactionId: result2.transactionId });
  }
  const result = await creditReward(firestore, {
    userId,
    amountRupees,
    type: mapProviderToType(providerName),
    source: providerName,
    provider: providerName,
    providerTransactionId,
    description: `${providerName} \u2014 ${providerTransactionId}`
  });
  return json({ handled: true, alreadyProcessed: !!result.alreadyProcessed, transactionId: result.transactionId });
}
__name(handleProviderPostback, "handleProviderPostback");
var handleProviderGenericPostback = /* @__PURE__ */ __name((request, env2, firestore) => handleProviderPostback(request, env2, firestore, { providerName: "provider" }), "handleProviderGenericPostback");
var handleAdsgramPostback = /* @__PURE__ */ __name((request, env2, firestore) => handleProviderPostback(request, env2, firestore, { providerName: "adsgram", secretEnvVar: "ADSGRAM_SECRET" }), "handleAdsgramPostback");
var handleSurveyPostback = /* @__PURE__ */ __name((request, env2, firestore) => handleProviderPostback(request, env2, firestore, { providerName: "survey", secretEnvVar: "SURVEY_SECRET" }), "handleSurveyPostback");
var handleOfferPostback = /* @__PURE__ */ __name((request, env2, firestore) => handleProviderPostback(request, env2, firestore, { providerName: "offer", secretEnvVar: "OFFER_SECRET" }), "handleOfferPostback");

// src/userAuth.js
async function handleEnsureUser(request, env2, firestore) {
  const auth = await verifyIdToken(request, env2);
  if (!auth)
    throw new AppError("UNAUTHENTICATED", "Sign-in required.", 401);
  const uid = auth.uid;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = await firestore.getDoc(`users/${uid}`);
  if (!existing) {
    const referralCode = generateReferralCode();
    const profile3 = {
      firebaseUid: uid,
      email: auth.claims.email || "",
      displayName: auth.claims.name || (auth.claims.email ? auth.claims.email.split("@")[0] : "Earnivo user"),
      profilePhoto: auth.claims.picture || "",
      role: "user",
      coinBalance: 0,
      balanceRupees: 0,
      totalEarnedCoins: 0,
      totalRedeemedCoins: 0,
      dailyStreak: 0,
      riskLevel: "Low",
      referralCode,
      createdAt: now,
      updatedAt: now
    };
    try {
      await firestore.createDoc("users", uid, profile3);
      return json(profile3);
    } catch (e) {
      const nowExisting = await firestore.getDoc(`users/${uid}`);
      if (nowExisting)
        return backfillReferralCodeIfMissing(firestore, uid, nowExisting);
      throw e;
    }
  }
  return backfillReferralCodeIfMissing(firestore, uid, existing);
}
__name(handleEnsureUser, "handleEnsureUser");
function generateReferralCode() {
  return `EARN${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
__name(generateReferralCode, "generateReferralCode");
async function backfillReferralCodeIfMissing(firestore, uid, profile3) {
  if (profile3.referralCode)
    return json(profile3);
  const path = `users/${uid}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const meta = await firestore.getDocMeta(path);
    if (!meta)
      return json(profile3);
    if (meta.doc.referralCode)
      return json(meta.doc);
    const referralCode = generateReferralCode();
    const existingWithCode = await firestore.runQuery("users", {
      where: [["referralCode", "EQUAL", referralCode]],
      limit: 1
    });
    if (existingWithCode.length)
      continue;
    const updated = { ...meta.doc, referralCode, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    try {
      await firestore.setDoc(path, updated, { updateTime: meta.updateTime });
      return json(updated);
    } catch (e) {
    }
  }
  return json(profile3);
}
__name(backfillReferralCodeIfMissing, "backfillReferralCodeIfMissing");

// src/index.js
var SENSITIVE_PREFIXES = ["/withdraw", "/task/", "/daily-login-reward", "/watch-ad-reward", "/record-referral", "/auth/ensure-user", "/provider/", "/adsgram/", "/survey/", "/offer/"];
var src_default = {
  async scheduled(event, env2, ctx) {
    const firestore = createFirestoreClient(env2);
    ctx.waitUntil(handleScheduledMaintenance(firestore));
  },
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    const headers = corsHeaders(env2, request);
    if (request.method === "OPTIONS")
      return new Response(null, { headers });
    try {
      const firestore = createFirestoreClient(env2);
      if (SENSITIVE_PREFIXES.some((p) => url.pathname.startsWith(p))) {
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        if (!rateLimit(`${ip}:${url.pathname}`, { limit: 20, windowMs: 6e4 })) {
          throw new AppError("RATE_LIMITED", "Too many requests. Please slow down.", 429);
        }
      }
      const res = await route(request, env2, firestore, url);
      for (const [k, v] of Object.entries(headers))
        res.headers.set(k, v);
      return res;
    } catch (err) {
      console.error("[WORKER ERROR]", err?.stack || err);
      const res = jsonError(err, { status: err instanceof AppError ? err.status : 500 });
      for (const [k, v] of Object.entries(headers))
        res.headers.set(k, v);
      return res;
    }
  }
};
async function route(request, env2, firestore, url) {
  const { pathname } = url;
  const method = request.method;
if (pathname === "/" && method === "GET")
  return json({ ok: true, service: "Earnivo Worker", status: "online" });
  if (pathname === "/auth/ensure-user" && method === "POST")
    return handleEnsureUser(request, env2, firestore);
  if (pathname === "/settings/public" && method === "GET")
    return handleGetPublicSettings(request, env2, firestore);
  if (pathname === "/user" && method === "GET")
    return handleGetUser(request, env2, firestore);
  if (pathname === "/transactions" && method === "GET")
    return handleGetTransactions(request, env2, firestore);
  if (pathname === "/withdrawals" && method === "GET")
    return handleGetWithdrawals(request, env2, firestore);
  if (pathname === "/tasks" && method === "GET")
    return handleListTasks(request, env2, firestore);
  if (pathname.match(/^\/tasks\/[^/]+$/) && method === "GET")
    return handleGetTask(request, env2, firestore, pathname.split("/")[2]);
  if (pathname === "/task/start" && method === "POST")
    return handleTaskStart(request, env2, firestore);
  if (pathname === "/task/submit" && method === "POST")
    return handleTaskSubmit(request, env2, firestore);
  if (pathname === "/daily-bonus-schedule" && method === "GET")
    return handleDailyBonusSchedule(request, env2, firestore);
  if (pathname === "/daily-login-reward" && method === "POST")
    return handleDailyLoginReward(request, env2, firestore);
  if (pathname === "/record-referral" && method === "POST")
    return handleRecordReferral(request, env2, firestore);
  if (pathname === "/watch-ad-reward" && method === "POST")
    return handleWatchAdReward(request, env2, firestore);
  if (pathname === "/withdraw" && method === "POST")
    return handleWithdraw(request, env2, firestore);
  if (pathname === "/provider/postback" && method === "POST")
    return handleProviderGenericPostback(request, env2, firestore);
  if (pathname === "/adsgram/postback" && method === "POST")
    return handleAdsgramPostback(request, env2, firestore);
  if (pathname === "/survey/postback" && method === "POST")
    return handleSurveyPostback(request, env2, firestore);
  if (pathname === "/offer/postback" && method === "POST")
    return handleOfferPostback(request, env2, firestore);
  if (pathname === "/diagnose" && method === "GET")
    return json({ ok: true, time: (/* @__PURE__ */ new Date()).toISOString() });
  if (pathname.startsWith("/admin/") || pathname.startsWith("/withdraw/") || pathname.startsWith("/task/approve") || pathname.startsWith("/task/reject")) {
    const adminCheck = await requireAdmin(request, env2, firestore);
    if (!adminCheck.ok)
      throw new AppError(adminCheck.error, adminCheck.error === "FORBIDDEN" ? "Admin access required." : "Sign-in required.", adminCheck.status);
    const adminUid = adminCheck.uid;
    if (pathname === "/task/approve" && method === "POST")
      return handleTaskApprove(request, env2, firestore, adminUid);
    if (pathname === "/task/reject" && method === "POST")
      return handleTaskReject(request, env2, firestore, adminUid);
    if (pathname === "/withdraw/approve" && method === "POST")
      return handleWithdrawApprove(request, env2, firestore, adminUid);
    if (pathname === "/withdraw/reject" && method === "POST")
      return handleWithdrawReject(request, env2, firestore, adminUid);
    if (pathname === "/withdraw/resolve" && method === "POST")
      return handleWithdrawResolve(request, env2, firestore, adminUid);
    if (pathname === "/admin/stats" && method === "GET")
      return handleAdminStats(request, env2, firestore);
    if (pathname === "/admin/users" && method === "GET")
      return handleAdminListUsers(request, env2, firestore);
    if (pathname.match(/^\/admin\/users\/[^/]+$/) && method === "GET")
      return handleAdminGetUserDetail(request, env2, firestore, pathname.split("/")[3]);
    if (pathname.match(/^\/admin\/users\/[^/]+\/suspend$/) && method === "POST")
      return handleAdminSuspendUser(request, env2, firestore, pathname.split("/")[3], adminUid);
    if (pathname.match(/^\/admin\/users\/[^/]+\/adjust-balance$/) && method === "POST")
      return handleAdminAdjustBalance(request, env2, firestore, pathname.split("/")[3], adminUid);
    if (pathname === "/admin/tasks" && method === "GET")
      return handleAdminListTasks(request, env2, firestore);
    if (pathname === "/admin/tasks" && method === "POST")
      return handleAdminCreateTask(request, env2, firestore, adminUid);
    if (pathname.match(/^\/admin\/tasks\/[^/]+$/) && method === "GET")
      return handleAdminGetTask(request, env2, firestore, pathname.split("/")[3]);
    if (pathname.match(/^\/admin\/tasks\/[^/]+$/) && method === "POST")
      return handleAdminUpdateTask(request, env2, firestore, pathname.split("/")[3], adminUid);
    if (pathname === "/admin/submissions" && method === "GET")
      return handleAdminListSubmissions(request, env2, firestore);
    if (pathname === "/admin/withdrawals" && method === "GET")
      return handleAdminListWithdrawals(request, env2, firestore);
    if (pathname === "/admin/transactions" && method === "GET")
      return handleAdminListTransactions(request, env2, firestore);
    if (pathname === "/admin/providers" && method === "GET")
      return handleAdminListProviders(request, env2, firestore);
    if (pathname === "/admin/fraud" && method === "GET")
      return handleAdminListFraud(request, env2, firestore);
    if (pathname.match(/^\/admin\/fraud\/[^/]+$/) && method === "POST")
      return handleAdminResolveFraud(request, env2, firestore, pathname.split("/")[3], adminUid);
    if (pathname === "/admin/settings" && method === "GET")
      return handleAdminSettingsGet(request, env2, firestore);
    if (pathname === "/admin/settings" && method === "POST")
      return handleAdminSettingsSet(request, env2, firestore, adminUid);
    if (pathname === "/admin/logs" && method === "GET")
      return handleAdminLogs(request, env2, firestore);
    if (pathname === "/admin/notifications/send" && method === "POST")
      return handleAdminSendNotification(request, env2, firestore, adminUid);
    if (pathname === "/admin/broadcasts" && method === "GET")
      return handleAdminListBroadcasts(request, env2, firestore);
  }
  throw new AppError("NOT_FOUND", "Endpoint not found.", 404);
}
__name(route, "route");
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
