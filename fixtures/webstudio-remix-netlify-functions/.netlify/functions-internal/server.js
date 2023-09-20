"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf,
  __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value,
      })
    : (obj[key] = value);
var __commonJS = (cb, mod) =>
  function () {
    return (
      mod ||
        (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod),
      mod.exports
    );
  };
var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: !0 });
  },
  __copyProps = (to, from, except, desc) => {
    if ((from && typeof from == "object") || typeof from == "function")
      for (let key of __getOwnPropNames(from))
        !__hasOwnProp.call(to, key) &&
          key !== except &&
          __defProp(to, key, {
            get: () => from[key],
            enumerable:
              !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
          });
    return to;
  };
var __toESM = (mod, isNodeMode, target) => (
    (target = mod != null ? __create(__getProtoOf(mod)) : {}),
    __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule
        ? __defProp(target, "default", { value: mod, enumerable: !0 })
        : target,
      mod
    )
  ),
  __toCommonJS = (mod) =>
    __copyProps(__defProp({}, "__esModule", { value: !0 }), mod);
var __publicField = (obj, key, value) => (
    __defNormalProp(obj, typeof key != "symbol" ? key + "" : key, value), value
  ),
  __accessCheck = (obj, member, msg) => {
    if (!member.has(obj)) throw TypeError("Cannot " + msg);
  };
var __privateGet = (obj, member, getter) => (
    __accessCheck(obj, member, "read from private field"),
    getter ? getter.call(obj) : member.get(obj)
  ),
  __privateAdd = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  },
  __privateSet = (obj, member, value, setter) => (
    __accessCheck(obj, member, "write to private field"),
    setter ? setter.call(obj, value) : member.set(obj, value),
    value
  );

// ../../node_modules/@jsep-plugin/assignment/dist/cjs/index.cjs.js
var require_index_cjs = __commonJS({
  "../../node_modules/@jsep-plugin/assignment/dist/cjs/index.cjs.js"(
    exports,
    module2
  ) {
    "use strict";
    var plugin = {
      name: "assignment",
      assignmentOperators: /* @__PURE__ */ new Set([
        "=",
        "*=",
        "**=",
        "/=",
        "%=",
        "+=",
        "-=",
        "<<=",
        ">>=",
        ">>>=",
        "&=",
        "^=",
        "|=",
      ]),
      updateOperators: [43, 45],
      assignmentPrecedence: 0.9,
      init(jsep2) {
        let updateNodeTypes = [jsep2.IDENTIFIER, jsep2.MEMBER_EXP];
        plugin.assignmentOperators.forEach((op) =>
          jsep2.addBinaryOp(op, plugin.assignmentPrecedence, !0)
        ),
          jsep2.hooks.add("gobble-token", function (env) {
            let code = this.code;
            plugin.updateOperators.some(
              (c) => c === code && c === this.expr.charCodeAt(this.index + 1)
            ) &&
              ((this.index += 2),
              (env.node = {
                type: "UpdateExpression",
                operator: code === 43 ? "++" : "--",
                argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
                prefix: !0,
              }),
              (!env.node.argument ||
                !updateNodeTypes.includes(env.node.argument.type)) &&
                this.throwError(`Unexpected ${env.node.operator}`));
          }),
          jsep2.hooks.add("after-token", function (env) {
            if (env.node) {
              let code = this.code;
              plugin.updateOperators.some(
                (c) => c === code && c === this.expr.charCodeAt(this.index + 1)
              ) &&
                (updateNodeTypes.includes(env.node.type) ||
                  this.throwError(`Unexpected ${env.node.operator}`),
                (this.index += 2),
                (env.node = {
                  type: "UpdateExpression",
                  operator: code === 43 ? "++" : "--",
                  argument: env.node,
                  prefix: !1,
                }));
            }
          }),
          jsep2.hooks.add("after-expression", function (env) {
            env.node && updateBinariesToAssignments(env.node);
          });
        function updateBinariesToAssignments(node) {
          plugin.assignmentOperators.has(node.operator)
            ? ((node.type = "AssignmentExpression"),
              updateBinariesToAssignments(node.left),
              updateBinariesToAssignments(node.right))
            : node.operator ||
              Object.values(node).forEach((val) => {
                val &&
                  typeof val == "object" &&
                  updateBinariesToAssignments(val);
              });
        }
      },
    };
    module2.exports = plugin;
  },
});

// server.js
var server_exports = {};
__export(server_exports, {
  handler: () => handler,
});
module.exports = __toCommonJS(server_exports);
var import_remix_adapter = require("@netlify/remix-adapter");

// server-entry-module:@remix-run/dev/server-build
var server_build_exports = {};
__export(server_build_exports, {
  assets: () => assets_manifest_default,
  assetsBuildDirectory: () => assetsBuildDirectory,
  entry: () => entry,
  future: () => future,
  publicPath: () => publicPath,
  routes: () => routes,
});

// app/entry.server.tsx
var entry_server_exports = {};
__export(entry_server_exports, {
  default: () => handleRequest,
});
var import_react = require("@remix-run/react"),
  import_server = require("react-dom/server"),
  import_jsx_runtime = require("react/jsx-runtime");
function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext
) {
  let markup = (0, import_server.renderToString)(
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.RemixServer, {
      context: remixContext,
      url: request.url,
    })
  );
  return (
    responseHeaders.set("Content-Type", "text/html"),
    new Response("<!DOCTYPE html>" + markup, {
      headers: responseHeaders,
      status: responseStatusCode,
    })
  );
}

// app/root.tsx
var root_exports = {};
__export(root_exports, {
  default: () => Root,
});

// ../../packages/fonts/lib/index.js
var import_zod = require("zod"),
  SYSTEM_FONTS = /* @__PURE__ */ new Map([
    ["Arial", ["Roboto", "sans-serif"]],
    ["Times New Roman", ["sans"]],
    ["Courier New", ["monospace"]],
    ["system-ui", []],
  ]),
  DEFAULT_FONT_FALLBACK = "sans-serif",
  FONT_FORMATS = /* @__PURE__ */ new Map([
    ["woff", "woff"],
    ["woff2", "woff2"],
    ["ttf", "truetype"],
    ["otf", "opentype"],
  ]),
  FONT_MIME_TYPES = Array.from(FONT_FORMATS.keys())
    .map((format) => `.${format}`)
    .join(", "),
  FONT_STYLES = ["normal", "italic", "oblique"];
var FontFormat = import_zod.z.union([
    import_zod.z.literal("ttf"),
    import_zod.z.literal("woff"),
    import_zod.z.literal("woff2"),
    import_zod.z.literal("otf"),
  ]),
  AxisName = import_zod.z.enum([
    "wght",
    "wdth",
    "slnt",
    "opsz",
    "ital",
    "GRAD",
    "XTRA",
    "XOPQ",
    "YOPQ",
    "YTLC",
    "YTUC",
    "YTAS",
    "YTDE",
    "YTFI",
  ]),
  VariationAxes = import_zod.z.record(
    AxisName,
    import_zod.z.object({
      name: import_zod.z.string(),
      min: import_zod.z.number(),
      default: import_zod.z.number(),
      max: import_zod.z.number(),
    })
  ),
  FontMetaStatic = import_zod.z.object({
    family: import_zod.z.string(),
    style: import_zod.z.enum(FONT_STYLES),
    weight: import_zod.z.number(),
  }),
  FontMetaVariable = import_zod.z.object({
    family: import_zod.z.string(),
    variationAxes: VariationAxes,
  }),
  FontMeta = import_zod.z.union([FontMetaStatic, FontMetaVariable]);

// ../../packages/react-sdk/lib/index.js
var import_react3 = require("react");

// ../../node_modules/nanostores/atom/index.js
var listenerQueue = [],
  atom = (initialValue, level) => {
    let listeners = [],
      store = {
        get() {
          return store.lc || store.listen(() => {})(), store.value;
        },
        l: level || 0,
        lc: 0,
        listen(listener, listenerLevel) {
          return (
            (store.lc = listeners.push(listener, listenerLevel || store.l) / 2),
            () => {
              let index = listeners.indexOf(listener);
              ~index &&
                (listeners.splice(index, 2),
                store.lc--,
                store.lc || store.off());
            }
          );
        },
        notify(changedKey) {
          let runListenerQueue = !listenerQueue.length;
          for (let i = 0; i < listeners.length; i += 2)
            listenerQueue.push(
              listeners[i],
              store.value,
              changedKey,
              listeners[i + 1]
            );
          if (runListenerQueue) {
            for (let i = 0; i < listenerQueue.length; i += 4) {
              let skip = !1;
              for (let j = i + 7; j < listenerQueue.length; j += 4)
                if (listenerQueue[j] < listenerQueue[i + 3]) {
                  skip = !0;
                  break;
                }
              skip
                ? listenerQueue.push(
                    listenerQueue[i],
                    listenerQueue[i + 1],
                    listenerQueue[i + 2],
                    listenerQueue[i + 3]
                  )
                : listenerQueue[i](listenerQueue[i + 1], listenerQueue[i + 2]);
            }
            listenerQueue.length = 0;
          }
        },
        off() {},
        /* It will be called on last listener unsubscribing.
       We will redefine it in onMount and onStop. */
        set(data) {
          store.value !== data && ((store.value = data), store.notify());
        },
        subscribe(cb, listenerLevel) {
          let unbind = store.listen(cb, listenerLevel);
          return cb(store.value), unbind;
        },
        value: initialValue,
      };
    return store;
  };

// ../../node_modules/nanostores/lifecycle/index.js
var MOUNT = 5,
  UNMOUNT = 6;
var REVERT_MUTATION = 10,
  on = (object, listener, eventKey, mutateStore) => (
    (object.events = object.events || {}),
    object.events[eventKey + REVERT_MUTATION] ||
      (object.events[eventKey + REVERT_MUTATION] = mutateStore((eventProps) => {
        object.events[eventKey].reduceRight((event, l) => (l(event), event), {
          shared: {},
          ...eventProps,
        });
      })),
    (object.events[eventKey] = object.events[eventKey] || []),
    object.events[eventKey].push(listener),
    () => {
      let currentListeners = object.events[eventKey],
        index = currentListeners.indexOf(listener);
      currentListeners.splice(index, 1),
        currentListeners.length ||
          (delete object.events[eventKey],
          object.events[eventKey + REVERT_MUTATION](),
          delete object.events[eventKey + REVERT_MUTATION]);
    }
  );
var STORE_UNMOUNT_DELAY = 1e3,
  onMount = (store, initialize) =>
    on(
      store,
      (payload) => {
        let destroy = initialize(payload);
        destroy && store.events[UNMOUNT].push(destroy);
      },
      MOUNT,
      (runListeners) => {
        let originListen = store.listen;
        store.listen = (...args) => (
          !store.lc && !store.active && ((store.active = !0), runListeners()),
          originListen(...args)
        );
        let originOff = store.off;
        return (
          (store.events[UNMOUNT] = []),
          (store.off = () => {
            originOff(),
              setTimeout(() => {
                if (store.active && !store.lc) {
                  store.active = !1;
                  for (let destroy of store.events[UNMOUNT]) destroy();
                  store.events[UNMOUNT] = [];
                }
              }, STORE_UNMOUNT_DELAY);
          }),
          () => {
            (store.listen = originListen), (store.off = originOff);
          }
        );
      }
    );

// ../../node_modules/nanostores/computed/index.js
var computed = (stores, cb) => {
  Array.isArray(stores) || (stores = [stores]);
  let diamondArgs,
    run = () => {
      let args = stores.map((store) => store.get());
      (diamondArgs === void 0 ||
        args.some((arg, i) => arg !== diamondArgs[i])) &&
        ((diamondArgs = args), derived.set(cb(...args)));
    },
    derived = atom(void 0, Math.max(...stores.map((s) => s.l)) + 1);
  return (
    onMount(derived, () => {
      let unbinds = stores.map((store) => store.listen(run, derived.l));
      return (
        run(),
        () => {
          for (let unbind of unbinds) unbind();
        }
      );
    }),
    derived
  );
};

// ../../node_modules/nanostores/listen-keys/index.js
function listenKeys(store, keys, listener) {
  let keysSet = /* @__PURE__ */ new Set([...keys, void 0]);
  return store.listen((value, changed) => {
    keysSet.has(changed) && listener(value, changed);
  });
}

// ../../packages/react-sdk/lib/index.js
var import_react4 = require("react"),
  import_jsx_runtime2 = require("react/jsx-runtime"),
  import_react5 = require("react");
var import_react6 = require("react"),
  import_react7 = require("react");

// ../../node_modules/@nanostores/react/index.js
var import_react2 = require("react");
function useStore(store, opts = {}) {
  let subscribe = (0, import_react2.useCallback)(
      (onChange) =>
        opts.keys
          ? listenKeys(store, opts.keys, onChange)
          : store.listen(onChange),
      [opts.keys, store]
    ),
    get = store.get.bind(store);
  return (0, import_react2.useSyncExternalStore)(subscribe, get, get);
}

// ../../packages/react-sdk/lib/index.js
var import_jsx_runtime3 = require("react/jsx-runtime");

// ../../packages/error-utils/lib/index.js
var captureError = (error, value) => {
  throw error;
};

// ../../packages/css-engine/lib/index.js
var import_hyphenate_style_name = __toESM(require("hyphenate-style-name"), 1),
  import_zod2 = require("zod");
var fallbackTransform = (styleValue) => {
    if (styleValue.type === "fontFamily") {
      let firstFontFamily = styleValue.value[0],
        fallbacks = SYSTEM_FONTS.get(firstFontFamily),
        fontFamily = [...styleValue.value];
      return (
        Array.isArray(fallbacks)
          ? fontFamily.push(...fallbacks)
          : fontFamily.push(DEFAULT_FONT_FALLBACK),
        {
          type: "fontFamily",
          value: fontFamily,
        }
      );
    }
  },
  toValue = (styleValue, transformValue) => {
    if (styleValue === void 0) return "";
    let value =
      (transformValue == null ? void 0 : transformValue(styleValue)) ??
      fallbackTransform(styleValue) ??
      styleValue;
    if (value.type === "unit")
      return value.value + (value.unit === "number" ? "" : value.unit);
    if (value.type === "fontFamily") return value.value.join(", ");
    if (value.type === "var") {
      let fallbacks = [];
      for (let fallback of value.fallbacks)
        fallbacks.push(toValue(fallback, transformValue));
      let fallbacksString =
        fallbacks.length > 0 ? `, ${fallbacks.join(", ")}` : "";
      return `var(--${value.value}${fallbacksString})`;
    }
    if (
      value.type === "keyword" ||
      value.type === "invalid" ||
      value.type === "unset"
    )
      return value.value;
    if (value.type === "rgb")
      return `rgba(${value.r}, ${value.g}, ${value.b}, ${value.alpha})`;
    if (value.type === "image")
      return value.hidden || value.value.type !== "url"
        ? "none"
        : `url(${value.value.url})`;
    if (value.type === "unparsed") return value.hidden ? "none" : value.value;
    if (value.type === "layers") {
      let valueString = value.value
        .filter(
          (layer) =>
            !("hidden" in layer) || ("hidden" in layer && layer.hidden === !1)
        )
        .map((layer) => toValue(layer, transformValue))
        .join(", ");
      return valueString === "" ? "none" : valueString;
    }
    return value.type === "tuple"
      ? value.value.map((value2) => toValue(value2, transformValue)).join(" ")
      : captureError(new Error("Unknown value type"), value);
  },
  toProperty = (property) =>
    property === "backgroundClip"
      ? "-webkit-background-clip"
      : (0, import_hyphenate_style_name.default)(property),
  _styleMap,
  _isDirty,
  _string,
  _indent,
  _transformValue,
  _a,
  StylePropertyMap =
    ((_a = class {
      constructor(transformValue) {
        __privateAdd(this, _styleMap, /* @__PURE__ */ new Map());
        __privateAdd(this, _isDirty, !1);
        __privateAdd(this, _string, "");
        __privateAdd(this, _indent, 0);
        __privateAdd(this, _transformValue, void 0);
        __publicField(this, "onChange");
        __privateSet(this, _transformValue, transformValue);
      }
      setTransformer(transformValue) {
        __privateSet(this, _transformValue, transformValue);
      }
      set(property, value) {
        var _a7;
        __privateGet(this, _styleMap).set(property, value),
          __privateSet(this, _isDirty, !0),
          (_a7 = this.onChange) == null || _a7.call(this);
      }
      has(property) {
        return __privateGet(this, _styleMap).has(property);
      }
      get size() {
        return __privateGet(this, _styleMap).size;
      }
      keys() {
        return __privateGet(this, _styleMap).keys();
      }
      delete(property) {
        var _a7;
        __privateGet(this, _styleMap).delete(property),
          __privateSet(this, _isDirty, !0),
          (_a7 = this.onChange) == null || _a7.call(this);
      }
      clear() {
        var _a7;
        __privateGet(this, _styleMap).clear(),
          __privateSet(this, _isDirty, !0),
          (_a7 = this.onChange) == null || _a7.call(this);
      }
      toString({ indent = 0 } = {}) {
        if (
          __privateGet(this, _isDirty) === !1 &&
          indent === __privateGet(this, _indent)
        )
          return __privateGet(this, _string);
        __privateSet(this, _indent, indent);
        let block = [],
          spaces = " ".repeat(indent);
        for (let [property, value] of __privateGet(this, _styleMap))
          value !== void 0 &&
            block.push(
              `${spaces}${toProperty(property)}: ${toValue(
                value,
                __privateGet(this, _transformValue)
              )}`
            );
        return (
          __privateSet(
            this,
            _string,
            block.join(`;
`)
          ),
          __privateSet(this, _isDirty, !1),
          __privateGet(this, _string)
        );
      }
    }),
    (_styleMap = new WeakMap()),
    (_isDirty = new WeakMap()),
    (_string = new WeakMap()),
    (_indent = new WeakMap()),
    (_transformValue = new WeakMap()),
    _a),
  _onChange,
  _a2,
  StyleRule =
    ((_a2 = class {
      constructor(selectorText, style, transformValue) {
        __publicField(this, "styleMap");
        __publicField(this, "selectorText");
        __publicField(this, "onChange");
        __privateAdd(this, _onChange, () => {
          var _a7;
          (_a7 = this.onChange) == null || _a7.call(this);
        });
        (this.styleMap = new StylePropertyMap(transformValue)),
          (this.selectorText = selectorText);
        let property;
        for (property in style) this.styleMap.set(property, style[property]);
        this.styleMap.onChange = __privateGet(this, _onChange);
      }
      get cssText() {
        return this.toString();
      }
      toString(options = { indent: 0 }) {
        let spaces = " ".repeat(options.indent);
        return `${spaces}${this.selectorText} {
${this.styleMap.toString({
  indent: options.indent + 2,
})}
${spaces}}`;
      }
    }),
    (_onChange = new WeakMap()),
    _a2),
  _mediaType,
  _a3,
  MediaRule =
    ((_a3 = class {
      constructor(options = {}) {
        __publicField(this, "options");
        __publicField(this, "rules", []);
        __privateAdd(this, _mediaType, void 0);
        (this.options = options),
          __privateSet(this, _mediaType, options.mediaType ?? "all");
      }
      insertRule(rule) {
        return this.rules.push(rule), rule;
      }
      get cssText() {
        return this.toString();
      }
      toString() {
        if (this.rules.length === 0) return "";
        let rules = [];
        for (let rule of this.rules) rules.push(rule.toString({ indent: 2 }));
        let conditionText = "",
          { minWidth, maxWidth } = this.options;
        return (
          minWidth !== void 0 &&
            (conditionText = ` and (min-width: ${minWidth}px)`),
          maxWidth !== void 0 &&
            (conditionText += ` and (max-width: ${maxWidth}px)`),
          `@media ${__privateGet(this, _mediaType)}${conditionText} {
${rules.join(
  `
`
)}
}`
        );
      }
    }),
    (_mediaType = new WeakMap()),
    _a3),
  PlaintextRule = class {
    cssText;
    styleMap = new StylePropertyMap();
    constructor(cssText) {
      this.cssText = cssText;
    }
    toString() {
      return this.cssText;
    }
  },
  FontFaceRule = class {
    options;
    constructor(options) {
      this.options = options;
    }
    get cssText() {
      return this.toString();
    }
    toString() {
      let decls = [],
        { fontFamily, fontStyle, fontWeight, fontDisplay, src } = this.options;
      return (
        decls.push(
          `font-family: ${
            /\s/.test(fontFamily) ? `"${fontFamily}"` : fontFamily
          }`
        ),
        decls.push(`font-style: ${fontStyle}`),
        decls.push(`font-weight: ${fontWeight}`),
        decls.push(`font-display: ${fontDisplay}`),
        decls.push(`src: ${src}`),
        `@font-face {
  ${decls.join("; ")};
}`
      );
    }
  },
  compareMedia = (optionA, optionB) =>
    optionA.minWidth === void 0 && optionA.maxWidth === void 0
      ? -1
      : optionB.minWidth === void 0 && optionB.maxWidth === void 0
      ? 1
      : optionA.minWidth !== void 0 && optionB.minWidth !== void 0
      ? optionA.minWidth - optionB.minWidth
      : optionA.maxWidth !== void 0 && optionB.maxWidth !== void 0
      ? optionB.maxWidth - optionA.maxWidth
      : "minWidth" in optionA
      ? 1
      : -1,
  _element,
  _name,
  _a4,
  StyleElement =
    ((_a4 = class {
      constructor(name = "") {
        __privateAdd(this, _element, void 0);
        __privateAdd(this, _name, void 0);
        __privateSet(this, _name, name);
      }
      get isMounted() {
        var _a7;
        return (
          ((_a7 = __privateGet(this, _element)) == null
            ? void 0
            : _a7.parentElement) != null
        );
      }
      mount() {
        this.isMounted === !1 &&
          (__privateSet(this, _element, document.createElement("style")),
          __privateGet(this, _element).setAttribute(
            "data-webstudio",
            __privateGet(this, _name)
          ),
          document.head.appendChild(__privateGet(this, _element)));
      }
      unmount() {
        var _a7, _b;
        this.isMounted &&
          ((_b =
            (_a7 = __privateGet(this, _element)) == null
              ? void 0
              : _a7.parentElement) == null ||
            _b.removeChild(__privateGet(this, _element)),
          __privateSet(this, _element, void 0));
      }
      render(cssText) {
        __privateGet(this, _element) &&
          (__privateGet(this, _element).textContent = cssText);
      }
      setAttribute(name, value) {
        __privateGet(this, _element) &&
          __privateGet(this, _element).setAttribute(name, value);
      }
      getAttribute(name) {
        if (__privateGet(this, _element))
          return __privateGet(this, _element).getAttribute(name);
      }
    }),
    (_element = new WeakMap()),
    (_name = new WeakMap()),
    _a4),
  _cssText,
  _element2,
  _a5,
  StyleSheet =
    ((_a5 = class {
      constructor(element) {
        __privateAdd(this, _cssText, "");
        __privateAdd(this, _element2, void 0);
        __privateSet(this, _element2, element);
      }
      replaceSync(cssText) {
        cssText !== __privateGet(this, _cssText) &&
          (__privateSet(this, _cssText, cssText),
          __privateGet(this, _element2).render(cssText));
      }
    }),
    (_cssText = new WeakMap()),
    (_element2 = new WeakMap()),
    _a5),
  defaultMediaRuleId = "__default-media-rule__",
  _element3,
  _mediaRules,
  _plainRules,
  _fontFaceRules,
  _sheet,
  _isDirty2,
  _cssText2,
  _onChangeRule,
  _a6,
  CssEngine =
    ((_a6 = class {
      constructor({ name }) {
        __privateAdd(this, _element3, void 0);
        __privateAdd(this, _mediaRules, /* @__PURE__ */ new Map());
        __privateAdd(this, _plainRules, /* @__PURE__ */ new Map());
        __privateAdd(this, _fontFaceRules, []);
        __privateAdd(this, _sheet, void 0);
        __privateAdd(this, _isDirty2, !1);
        __privateAdd(this, _cssText2, "");
        __privateAdd(this, _onChangeRule, () => {
          __privateSet(this, _isDirty2, !0);
        });
        __privateSet(this, _element3, new StyleElement(name)),
          __privateSet(
            this,
            _sheet,
            new StyleSheet(__privateGet(this, _element3))
          );
      }
      addMediaRule(id, options) {
        let mediaRule = __privateGet(this, _mediaRules).get(id);
        return mediaRule === void 0
          ? ((mediaRule = new MediaRule(options)),
            __privateGet(this, _mediaRules).set(id, mediaRule),
            __privateSet(this, _isDirty2, !0),
            mediaRule)
          : (options &&
              ((mediaRule.options = options),
              __privateSet(this, _isDirty2, !0)),
            mediaRule);
      }
      addStyleRule(selectorText, rule, transformValue) {
        let mediaRule = this.addMediaRule(
          rule.breakpoint || defaultMediaRuleId
        );
        __privateSet(this, _isDirty2, !0);
        let styleRule = new StyleRule(selectorText, rule.style, transformValue);
        if (
          ((styleRule.onChange = __privateGet(this, _onChangeRule)),
          mediaRule === void 0)
        )
          throw new Error("No media rule found");
        return mediaRule.insertRule(styleRule), styleRule;
      }
      addPlaintextRule(cssText) {
        let rule = __privateGet(this, _plainRules).get(cssText);
        return rule !== void 0
          ? rule
          : (__privateSet(this, _isDirty2, !0),
            __privateGet(this, _plainRules).set(
              cssText,
              new PlaintextRule(cssText)
            ));
      }
      addFontFaceRule(options) {
        return (
          __privateSet(this, _isDirty2, !0),
          __privateGet(this, _fontFaceRules).push(new FontFaceRule(options))
        );
      }
      clear() {
        __privateGet(this, _mediaRules).clear(),
          __privateGet(this, _plainRules).clear(),
          __privateSet(this, _fontFaceRules, []),
          __privateSet(this, _isDirty2, !0);
      }
      render() {
        __privateGet(this, _element3).mount(),
          __privateGet(this, _sheet).replaceSync(this.cssText);
      }
      unmount() {
        __privateGet(this, _element3).unmount();
      }
      setAttribute(name, value) {
        __privateGet(this, _element3).setAttribute(name, value);
      }
      getAttribute(name) {
        return __privateGet(this, _element3).getAttribute(name);
      }
      get cssText() {
        if (__privateGet(this, _isDirty2) === !1)
          return __privateGet(this, _cssText2);
        __privateSet(this, _isDirty2, !1);
        let css = [];
        css.push(
          ...__privateGet(this, _fontFaceRules).map((rule) => rule.cssText)
        );
        for (let plaintextRule of __privateGet(this, _plainRules).values())
          css.push(plaintextRule.cssText);
        let sortedMediaRules = Array.from(
          __privateGet(this, _mediaRules).values()
        ).sort((ruleA, ruleB) => compareMedia(ruleA.options, ruleB.options));
        for (let mediaRule of sortedMediaRules) {
          let { cssText } = mediaRule;
          cssText !== "" && css.push(cssText);
        }
        return (
          __privateSet(
            this,
            _cssText2,
            css.join(`
`)
          ),
          __privateGet(this, _cssText2)
        );
      }
    }),
    (_element3 = new WeakMap()),
    (_mediaRules = new WeakMap()),
    (_plainRules = new WeakMap()),
    (_fontFaceRules = new WeakMap()),
    (_sheet = new WeakMap()),
    (_isDirty2 = new WeakMap()),
    (_cssText2 = new WeakMap()),
    (_onChangeRule = new WeakMap()),
    _a6);
var Unit = import_zod2.z.string(),
  UnitValue = import_zod2.z.object({
    type: import_zod2.z.literal("unit"),
    unit: Unit,
    value: import_zod2.z.number(),
  }),
  KeywordValue = import_zod2.z.object({
    type: import_zod2.z.literal("keyword"),
    // @todo use exact type
    value: import_zod2.z.string(),
  }),
  UnparsedValue = import_zod2.z.object({
    type: import_zod2.z.literal("unparsed"),
    value: import_zod2.z.string(),
    // For the builder we want to be able to hide background-image
    hidden: import_zod2.z.boolean().optional(),
  }),
  FontFamilyValue = import_zod2.z.object({
    type: import_zod2.z.literal("fontFamily"),
    value: import_zod2.z.array(import_zod2.z.string()),
  }),
  RgbValue = import_zod2.z.object({
    type: import_zod2.z.literal("rgb"),
    r: import_zod2.z.number(),
    g: import_zod2.z.number(),
    b: import_zod2.z.number(),
    alpha: import_zod2.z.number(),
  }),
  ImageValue = import_zod2.z.object({
    type: import_zod2.z.literal("image"),
    value: import_zod2.z.union([
      import_zod2.z.object({
        type: import_zod2.z.literal("asset"),
        value: import_zod2.z.string(),
      }),
      // url is not stored in db and only used by css-engine transformValue
      // to prepare image value for rendering
      import_zod2.z.object({
        type: import_zod2.z.literal("url"),
        url: import_zod2.z.string(),
      }),
    ]),
    // For the builder we want to be able to hide images
    hidden: import_zod2.z.boolean().optional(),
  }),
  InvalidValue = import_zod2.z.object({
    type: import_zod2.z.literal("invalid"),
    value: import_zod2.z.string(),
  }),
  UnsetValue = import_zod2.z.object({
    type: import_zod2.z.literal("unset"),
    value: import_zod2.z.literal(""),
  }),
  TupleValueItem = import_zod2.z.union([
    UnitValue,
    KeywordValue,
    UnparsedValue,
    RgbValue,
  ]),
  TupleValue = import_zod2.z.object({
    type: import_zod2.z.literal("tuple"),
    value: import_zod2.z.array(TupleValueItem),
    hidden: import_zod2.z.boolean().optional(),
  }),
  LayerValueItem = import_zod2.z.union([
    UnitValue,
    KeywordValue,
    UnparsedValue,
    ImageValue,
    TupleValue,
    InvalidValue,
  ]),
  LayersValue = import_zod2.z.object({
    type: import_zod2.z.literal("layers"),
    value: import_zod2.z.array(LayerValueItem),
  }),
  ValidStaticStyleValue = import_zod2.z.union([
    ImageValue,
    LayersValue,
    UnitValue,
    KeywordValue,
    FontFamilyValue,
    RgbValue,
    UnparsedValue,
    TupleValue,
  ]);
var VarValue = import_zod2.z.object({
    type: import_zod2.z.literal("var"),
    value: import_zod2.z.string(),
    fallbacks: import_zod2.z.array(ValidStaticStyleValue),
  }),
  StyleValue = import_zod2.z.union([
    ValidStaticStyleValue,
    InvalidValue,
    UnsetValue,
    VarValue,
  ]),
  Style = import_zod2.z.record(import_zod2.z.string(), StyleValue);

// ../../packages/react-sdk/lib/index.js
var import_react9 = require("@remix-run/react"),
  import_jsx_runtime4 = require("react/jsx-runtime"),
  import_zod3 = require("zod"),
  import_zod4 = require("zod"),
  import_zod5 = require("zod");
var import_title_case = require("title-case"),
  import_no_case = require("no-case");
var import_jsep = __toESM(require("jsep"), 1),
  import_assignment = __toESM(require_index_cjs(), 1);
var ReactSdkContext = (0, import_react4.createContext)({
    assetBaseUrl: "/",
    imageBaseUrl: "/",
    imageLoader: ({ src }) => src,
    propsByInstanceIdStore: atom(/* @__PURE__ */ new Map()),
    assetsStore: atom(/* @__PURE__ */ new Map()),
    pagesStore: atom(/* @__PURE__ */ new Map()),
    dataSourcesLogicStore: atom(/* @__PURE__ */ new Map()),
    indexesWithinAncestors: /* @__PURE__ */ new Map(),
  }),
  createElementsTree = ({
    renderer,
    assetBaseUrl: assetBaseUrl2,
    imageBaseUrl: imageBaseUrl2,
    imageLoader: imageLoader2,
    instances,
    rootInstanceId,
    propsByInstanceIdStore,
    assetsStore,
    pagesStore,
    dataSourcesLogicStore,
    indexesWithinAncestors: indexesWithinAncestors5,
    Component,
    components: components5,
    scripts,
  }) => {
    let rootInstance = instances.get(rootInstanceId);
    if (rootInstance === void 0) return null;
    let rootInstanceSelector = [rootInstanceId],
      children = createInstanceChildrenElements({
        instances,
        instanceSelector: rootInstanceSelector,
        Component,
        children: rootInstance.children,
        components: components5,
      }),
      root = createInstanceElement({
        Component,
        instance: rootInstance,
        instanceSelector: rootInstanceSelector,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            import_react3.Fragment,
            {
              children: [children, scripts],
            },
            "children"
          ),
        ],
        components: components5,
      });
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ReactSdkContext.Provider,
      {
        value: {
          propsByInstanceIdStore,
          assetsStore,
          pagesStore,
          dataSourcesLogicStore,
          renderer,
          imageLoader: imageLoader2,
          assetBaseUrl: assetBaseUrl2,
          imageBaseUrl: imageBaseUrl2,
          indexesWithinAncestors: indexesWithinAncestors5,
        },
        children: root,
      }
    );
  },
  createInstanceChildrenElements = ({
    instances,
    instanceSelector,
    children,
    Component,
    components: components5,
  }) => {
    let elements = [];
    for (let child of children) {
      if (child.type === "text") {
        elements.push(child.value);
        continue;
      }
      let childInstance = instances.get(child.value);
      if (childInstance === void 0) continue;
      let childInstanceSelector = [child.value, ...instanceSelector],
        children2 = createInstanceChildrenElements({
          instances,
          instanceSelector: childInstanceSelector,
          children: childInstance.children,
          Component,
          components: components5,
        }),
        element = createInstanceElement({
          instance: childInstance,
          instanceSelector: childInstanceSelector,
          Component,
          children: children2,
          components: components5,
        });
      elements.push(element);
    }
    return elements;
  },
  createInstanceElement = ({
    Component,
    instance,
    instanceSelector,
    children = [],
    components: components5,
  }) =>
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Component,
      {
        instance,
        instanceSelector,
        components: components5,
        children,
      },
      instance.id
    ),
  getPropsByInstanceId = (props) => {
    let propsByInstanceId = /* @__PURE__ */ new Map();
    for (let prop of props.values()) {
      let instanceProps = propsByInstanceId.get(prop.instanceId);
      instanceProps === void 0 &&
        ((instanceProps = []),
        propsByInstanceId.set(prop.instanceId, instanceProps)),
        instanceProps.push(prop);
    }
    return propsByInstanceId;
  },
  useInstanceProps = (instanceId) => {
    let {
        propsByInstanceIdStore,
        dataSourcesLogicStore,
        indexesWithinAncestors: indexesWithinAncestors5,
      } = (0, import_react7.useContext)(ReactSdkContext),
      index = indexesWithinAncestors5.get(instanceId),
      instancePropsObjectStore = (0, import_react7.useMemo)(
        () =>
          computed(
            [propsByInstanceIdStore, dataSourcesLogicStore],
            (propsByInstanceId, dataSourcesLogic) => {
              let instancePropsObject2 = {};
              index !== void 0 &&
                (instancePropsObject2[indexAttribute] = index.toString());
              let instanceProps = propsByInstanceId.get(instanceId);
              if (instanceProps === void 0) return instancePropsObject2;
              for (let prop of instanceProps)
                if (!(prop.type === "asset" || prop.type === "page")) {
                  if (prop.type === "dataSource") {
                    let dataSourceId = prop.value,
                      value = dataSourcesLogic.get(dataSourceId);
                    value !== void 0 &&
                      (instancePropsObject2[prop.name] = value);
                    continue;
                  }
                  if (prop.type === "action") {
                    let action5 = dataSourcesLogic.get(prop.id);
                    typeof action5 == "function" &&
                      (instancePropsObject2[prop.name] = action5);
                    continue;
                  }
                  instancePropsObject2[prop.name] = prop.value;
                }
              return instancePropsObject2;
            }
          ),
        [propsByInstanceIdStore, dataSourcesLogicStore, instanceId, index]
      );
    return useStore(instancePropsObjectStore);
  },
  usePropAsset = (instanceId, name) => {
    let { propsByInstanceIdStore, assetsStore } = (0, import_react7.useContext)(
        ReactSdkContext
      ),
      assetStore = (0, import_react7.useMemo)(
        () =>
          computed(
            [propsByInstanceIdStore, assetsStore],
            (propsByInstanceId, assets) => {
              let instanceProps = propsByInstanceId.get(instanceId);
              if (instanceProps !== void 0) {
                for (let prop of instanceProps)
                  if (prop.type === "asset" && prop.name === name) {
                    let assetId = prop.value;
                    return assets.get(assetId);
                  }
              }
            }
          ),
        [propsByInstanceIdStore, assetsStore, instanceId, name]
      );
    return useStore(assetStore);
  },
  resolveUrlProp = (instanceId, name, { props, pages, assets }) => {
    var _a7;
    let instanceProps = props.get(instanceId);
    if (instanceProps === void 0) return;
    let prop;
    for (let intanceProp of instanceProps)
      intanceProp.name === name && (prop = intanceProp);
    if (prop !== void 0) {
      if (prop.type === "page") {
        if (typeof prop.value == "string") {
          let page2 = pages.get(prop.value);
          return page2 && { type: "page", page: page2 };
        }
        let { instanceId: instanceId2, pageId } = prop.value,
          page = pages.get(pageId);
        if (page === void 0) return;
        let idProp =
          (_a7 = props.get(instanceId2)) == null
            ? void 0
            : _a7.find((prop2) => prop2.name === "id");
        return {
          type: "page",
          page,
          instanceId: instanceId2,
          hash:
            idProp === void 0 || idProp.type !== "string"
              ? void 0
              : idProp.value,
        };
      }
      if (prop.type === "string") {
        for (let page of pages.values())
          if (page.path === prop.value) return { type: "page", page };
        return { type: "string", url: prop.value };
      }
      if (prop.type === "asset") {
        let asset = assets.get(prop.value);
        return asset && { type: "asset", asset };
      }
    }
  },
  usePropUrl = (instanceId, name) => {
    let { propsByInstanceIdStore, pagesStore, assetsStore } = (0,
      import_react7.useContext)(ReactSdkContext),
      store = (0, import_react7.useMemo)(
        () =>
          computed(
            [propsByInstanceIdStore, pagesStore, assetsStore],
            (props, pages, assets) =>
              resolveUrlProp(instanceId, name, { props, pages, assets })
          ),
        [propsByInstanceIdStore, pagesStore, assetsStore, instanceId, name]
      );
    return useStore(store);
  },
  getInstanceIdFromComponentProps = (props) => props[idAttribute],
  getIndexWithinAncestorFromComponentProps = (props) => props[indexAttribute],
  renderText = (text) => {
    let lines = text.split(`
`);
    return lines.map((line, index) =>
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        import_react6.Fragment,
        {
          children: [
            line,
            index < lines.length - 1
              ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("br", {})
              : null,
          ],
        },
        index
      )
    );
  },
  renderWebstudioComponentChildren = (children) => {
    if (!(children === void 0 || children.length === 0))
      return children.map((child) =>
        typeof child == "string" ? renderText(child) : child
      );
  },
  WebstudioComponent = (0, import_react6.forwardRef)(
    (
      {
        instance,
        instanceSelector,
        children,
        components: components5,
        ...rest
      },
      ref
    ) => {
      let { [showAttribute]: show = !0, ...instanceProps } = useInstanceProps(
          instance.id
        ),
        props = {
          ...instanceProps,
          ...rest,
          [idAttribute]: instance.id,
          [componentAttribute]: instance.component,
        };
      if (show === !1)
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          import_jsx_runtime3.Fragment,
          {}
        );
      let Component = components5.get(instance.component);
      return Component === void 0
        ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            import_jsx_runtime3.Fragment,
            {}
          )
        : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Component, {
            ...props,
            ref,
            children: renderWebstudioComponentChildren(children),
          });
    }
  ),
  idAttribute = "data-ws-id";
var componentAttribute = "data-ws-component",
  showAttribute = "data-ws-show",
  indexAttribute = "data-ws-index";
var InstanceRoot = ({
  data,
  utils: utils5,
  Component,
  components: components5,
  scripts,
  imageLoader: imageLoader2,
}) => {
  var _a7, _b;
  let {
      indexesWithinAncestors: indexesWithinAncestors5,
      getDataSourcesLogic: getDataSourcesLogic5,
    } = utils5,
    dataSourceVariablesStoreRef = (0, import_react5.useRef)(void 0);
  dataSourceVariablesStoreRef.current === void 0 &&
    (dataSourceVariablesStoreRef.current = atom(/* @__PURE__ */ new Map()));
  let dataSourceVariablesStore = dataSourceVariablesStoreRef.current,
    dataSourcesLogicStoreRef = (0, import_react5.useRef)(void 0);
  dataSourcesLogicStoreRef.current === void 0 &&
    (dataSourcesLogicStoreRef.current = computed(
      dataSourceVariablesStore,
      (dataSourceVariables) => {
        try {
          return getDataSourcesLogic5(
            (id) => dataSourceVariables.get(id),
            (id, value) => {
              let dataSourceVariables2 = new Map(
                dataSourceVariablesStore.get()
              );
              dataSourceVariables2.set(id, value),
                dataSourceVariablesStore.set(dataSourceVariables2);
            }
          );
        } catch (error) {
          console.error(error);
        }
        return /* @__PURE__ */ new Map();
      }
    ));
  let dataSourcesLogicStore = dataSourcesLogicStoreRef.current;
  return createElementsTree({
    imageLoader: imageLoader2,
    imageBaseUrl:
      ((_a7 = data.params) == null ? void 0 : _a7.imageBaseUrl) ?? "/",
    assetBaseUrl:
      ((_b = data.params) == null ? void 0 : _b.assetBaseUrl) ?? "/",
    instances: new Map(data.build.instances),
    rootInstanceId: data.page.rootInstanceId,
    propsByInstanceIdStore: atom(
      getPropsByInstanceId(new Map(data.build.props))
    ),
    assetsStore: atom(new Map(data.assets.map((asset) => [asset.id, asset]))),
    pagesStore: atom(new Map(data.pages.map((page) => [page.id, page]))),
    indexesWithinAncestors: indexesWithinAncestors5,
    dataSourcesLogicStore,
    Component: Component ?? WebstudioComponent,
    components: components5,
    scripts,
  });
};
var Root = ({ Outlet: Outlet5 = import_react9.Outlet }) =>
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("html", {
      lang: "en",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("head", {
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("meta", {
              charSet: "utf-8",
            }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("meta", {
              name: "viewport",
              content: "width=device-width,initial-scale=1",
            }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("link", {
              rel: "icon",
              href: "/favicon.ico",
              type: "image/x-icon",
            }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("link", {
              rel: "shortcut icon",
              href: "/favicon.ico",
              type: "image/x-icon",
            }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              import_react9.Meta,
              {}
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              import_react9.Links,
              {}
            ),
          ],
        }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Outlet5, {}),
      ],
    }),
  common = {
    label: import_zod3.z.string().optional(),
    description: import_zod3.z.string().optional(),
    required: import_zod3.z.boolean(),
  },
  Number2 = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("number"),
    type: import_zod3.z.literal("number"),
    defaultValue: import_zod3.z.number().optional(),
  }),
  Range = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("range"),
    type: import_zod3.z.literal("number"),
    defaultValue: import_zod3.z.number().optional(),
  }),
  Text = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("text"),
    type: import_zod3.z.literal("string"),
    defaultValue: import_zod3.z.string().optional(),
    /**
     * The number of rows in <textarea>. If set to 0 an <input> will be used instead.
     * In line with Storybook team's plan: https://github.com/storybookjs/storybook/issues/21100
     */
    rows: import_zod3.z.number().optional(),
  }),
  Code = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("code"),
    type: import_zod3.z.literal("string"),
    defaultValue: import_zod3.z.string().optional(),
    /**
     * The number of rows in <textarea>. If set to 0 an <input> will be used instead.
     * In line with Storybook team's plan: https://github.com/storybookjs/storybook/issues/21100
     */
    rows: import_zod3.z.number().optional(),
  }),
  Color = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("color"),
    type: import_zod3.z.literal("string"),
    defaultValue: import_zod3.z.string().optional(),
  }),
  Boolean = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("boolean"),
    type: import_zod3.z.literal("boolean"),
    defaultValue: import_zod3.z.boolean().optional(),
  }),
  Radio = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("radio"),
    type: import_zod3.z.literal("string"),
    defaultValue: import_zod3.z.string().optional(),
    options: import_zod3.z.array(import_zod3.z.string()),
  }),
  InlineRadio = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("inline-radio"),
    type: import_zod3.z.literal("string"),
    defaultValue: import_zod3.z.string().optional(),
    options: import_zod3.z.array(import_zod3.z.string()),
  }),
  Select = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("select"),
    type: import_zod3.z.literal("string"),
    defaultValue: import_zod3.z.string().optional(),
    options: import_zod3.z.array(import_zod3.z.string()),
  }),
  Check = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("check"),
    type: import_zod3.z.literal("string[]"),
    defaultValue: import_zod3.z.array(import_zod3.z.string()).optional(),
    options: import_zod3.z.array(import_zod3.z.string()),
  }),
  InlineCheck = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("inline-check"),
    type: import_zod3.z.literal("string[]"),
    defaultValue: import_zod3.z.array(import_zod3.z.string()).optional(),
    options: import_zod3.z.array(import_zod3.z.string()),
  }),
  MultiSelect = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("multi-select"),
    type: import_zod3.z.literal("string[]"),
    defaultValue: import_zod3.z.array(import_zod3.z.string()).optional(),
    options: import_zod3.z.array(import_zod3.z.string()),
  }),
  File = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("file"),
    type: import_zod3.z.literal("string"),
    defaultValue: import_zod3.z.string().optional(),
    /** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept */
    accept: import_zod3.z.string().optional(),
  }),
  Url = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("url"),
    type: import_zod3.z.literal("string"),
    defaultValue: import_zod3.z.string().optional(),
  }),
  ObjectType = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("object"),
    // @todo not sure what type should be here
    // (we don't support Object yet, added for completeness)
    type: import_zod3.z.literal("Record<string, string>"),
    defaultValue: import_zod3.z.record(import_zod3.z.string()).optional(),
  }),
  Date = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("date"),
    // @todo not sure what type should be here
    // (we don't support Date yet, added for completeness)
    type: import_zod3.z.literal("string"),
    defaultValue: import_zod3.z.string().optional(),
  }),
  Action = import_zod3.z.object({
    ...common,
    control: import_zod3.z.literal("action"),
    type: import_zod3.z.literal("action"),
    defaultValue: import_zod3.z.undefined().optional(),
  }),
  PropMeta = import_zod3.z.union([
    Number2,
    Range,
    Text,
    Code,
    Color,
    Boolean,
    Radio,
    InlineRadio,
    Select,
    MultiSelect,
    Check,
    InlineCheck,
    File,
    Url,
    ObjectType,
    Date,
    Action,
  ]);
import_jsep.default.plugins.register(import_assignment.default);
var EmbedTemplateText = import_zod5.z.object({
    type: import_zod5.z.literal("text"),
    value: import_zod5.z.string(),
  }),
  EmbedTemplateDataSource = import_zod5.z.union([
    import_zod5.z.object({
      type: import_zod5.z.literal("variable"),
      initialValue: import_zod5.z.union([
        import_zod5.z.string(),
        import_zod5.z.number(),
        import_zod5.z.boolean(),
        import_zod5.z.array(import_zod5.z.string()),
      ]),
    }),
    import_zod5.z.object({
      type: import_zod5.z.literal("expression"),
      code: import_zod5.z.string(),
    }),
  ]),
  EmbedTemplateProp = import_zod5.z.union([
    import_zod5.z.object({
      type: import_zod5.z.literal("dataSource"),
      name: import_zod5.z.string(),
      dataSourceName: import_zod5.z.string(),
    }),
    import_zod5.z.object({
      type: import_zod5.z.literal("number"),
      name: import_zod5.z.string(),
      value: import_zod5.z.number(),
    }),
    import_zod5.z.object({
      type: import_zod5.z.literal("string"),
      name: import_zod5.z.string(),
      value: import_zod5.z.string(),
    }),
    import_zod5.z.object({
      type: import_zod5.z.literal("boolean"),
      name: import_zod5.z.string(),
      value: import_zod5.z.boolean(),
    }),
    import_zod5.z.object({
      type: import_zod5.z.literal("string[]"),
      name: import_zod5.z.string(),
      value: import_zod5.z.array(import_zod5.z.string()),
    }),
    import_zod5.z.object({
      type: import_zod5.z.literal("action"),
      name: import_zod5.z.string(),
      value: import_zod5.z.array(
        import_zod5.z.object({
          type: import_zod5.z.literal("execute"),
          args: import_zod5.z.optional(
            import_zod5.z.array(import_zod5.z.string())
          ),
          code: import_zod5.z.string(),
        })
      ),
    }),
  ]),
  EmbedTemplateStyleDeclRaw = import_zod5.z.object({
    // State selector, e.g. :hover
    state: import_zod5.z.optional(import_zod5.z.string()),
    property: import_zod5.z.string(),
    value: StyleValue,
  }),
  EmbedTemplateStyleDecl = EmbedTemplateStyleDeclRaw,
  EmbedTemplateInstance = import_zod5.z.lazy(() =>
    import_zod5.z.object({
      type: import_zod5.z.literal("instance"),
      component: import_zod5.z.string(),
      label: import_zod5.z.optional(import_zod5.z.string()),
      dataSources: import_zod5.z.optional(
        import_zod5.z.record(import_zod5.z.string(), EmbedTemplateDataSource)
      ),
      props: import_zod5.z.optional(import_zod5.z.array(EmbedTemplateProp)),
      tokens: import_zod5.z.optional(
        import_zod5.z.array(import_zod5.z.string())
      ),
      styles: import_zod5.z.optional(
        import_zod5.z.array(EmbedTemplateStyleDecl)
      ),
      children: WsEmbedTemplate,
    })
  ),
  WsEmbedTemplate = import_zod5.z.lazy(() =>
    import_zod5.z.array(
      import_zod5.z.union([EmbedTemplateInstance, EmbedTemplateText])
    )
  );
var WsComponentPropsMeta = import_zod4.z.object({
    props: import_zod4.z.record(PropMeta),
    // Props that will be always visible in properties panel.
    initialProps: import_zod4.z.array(import_zod4.z.string()).optional(),
  }),
  componentCategories = [
    "general",
    "text",
    "media",
    "forms",
    "radix",
    "hidden",
  ],
  stateCategories = ["states", "component-states"],
  ComponentState = import_zod4.z.object({
    category: import_zod4.z.enum(stateCategories).optional(),
    selector: import_zod4.z.string(),
    label: import_zod4.z.string(),
  }),
  ComponentToken = import_zod4.z.object({
    variant: import_zod4.z.optional(import_zod4.z.string()),
    styles: import_zod4.z.array(EmbedTemplateStyleDecl),
  });
var WsComponentMeta = import_zod4.z.object({
  category: import_zod4.z.enum(componentCategories).optional(),
  // container - can accept other components with dnd or be edited as text
  // control - usually form controls like inputs, without children
  // embed - images, videos or other embeddable components, without children
  // rich-text-child - formatted text fragment, not listed in components list
  type: import_zod4.z.enum([
    "container",
    "control",
    "embed",
    "rich-text-child",
  ]),
  requiredAncestors: import_zod4.z.optional(
    import_zod4.z.array(import_zod4.z.string())
  ),
  invalidAncestors: import_zod4.z.optional(
    import_zod4.z.array(import_zod4.z.string())
  ),
  // when this field is specified component receives
  // prop with index of same components withiin specified ancestor
  // important to automatically enumerate collections without
  // naming every item manually
  indexWithinAncestor: import_zod4.z.optional(import_zod4.z.string()),
  stylable: import_zod4.z.optional(import_zod4.z.boolean()),
  // specifies whether the instance can be deleted,
  // copied or dragged out of its parent instance
  // true by default
  detachable: import_zod4.z.optional(import_zod4.z.boolean()),
  label: import_zod4.z.optional(import_zod4.z.string()),
  description: import_zod4.z.string().optional(),
  icon: import_zod4.z.string(),
  presetStyle: import_zod4.z.optional(
    import_zod4.z.record(
      import_zod4.z.string(),
      import_zod4.z.array(EmbedTemplateStyleDecl)
    )
  ),
  presetTokens: import_zod4.z.optional(
    import_zod4.z.record(import_zod4.z.string(), ComponentToken)
  ),
  states: import_zod4.z.optional(import_zod4.z.array(ComponentState)),
  template: import_zod4.z.optional(WsEmbedTemplate),
  order: import_zod4.z.number().optional(),
});

// app/routes/[_route_with_symbols_]._index.tsx
var route_with_symbols_index_exports = {};
__export(route_with_symbols_index_exports, {
  action: () => action,
  default: () => route_with_symbols_index_default,
  links: () => links,
  meta: () => meta,
});
var import_server_runtime = require("@remix-run/server-runtime");

// ../../packages/form-handlers/lib/index.js
var formHiddenFieldPrefix = "ws--form",
  formIdFieldName = `${formHiddenFieldPrefix}-id`,
  getFormEntries = (formData) =>
    [...formData.entries()].flatMap(([key, value]) =>
      key.startsWith(formHiddenFieldPrefix) === !1 && typeof value == "string"
        ? [[key, value]]
        : []
    ),
  getFormId = (formData) => {
    for (let [key, value] of formData.entries())
      if (key === formIdFieldName && typeof value == "string") return value;
  },
  getDomain = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return;
    }
  },
  formToEmail = ({ formData, pageUrl, toEmail, fromEmail }) => {
    let html = `<p>There has been a new submission of your form at <a href="${pageUrl}">${pageUrl}</a>:</p>`,
      txt = `There has been a new submission of your form at ${pageUrl}:

`;
    html += "<table><tbody>";
    for (let [key, value] of getFormEntries(formData))
      (html += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`),
        (txt += `${key}: ${value}
`);
    return (
      (html += "</tbody></table>"),
      {
        from: fromEmail,
        to: toEmail,
        subject: `New form submission from ${getDomain(pageUrl) ?? pageUrl}`,
        txt,
        html,
      }
    );
  },
  getResponseBody = async (response) => {
    let text = await response.text();
    try {
      let json5 = JSON.parse(text);
      return typeof json5 == "object" && json5 !== null
        ? { json: json5, text }
        : { text };
    } catch {
      return { text: text === "" ? response.statusText : text };
    }
  },
  getErrors = (json5) => {
    if (json5 !== void 0) {
      if (typeof json5.error == "string") return [json5.error];
      if (typeof json5.message == "string") return [json5.message];
      if (
        Array.isArray(json5.errors) &&
        json5.errors.every((error) => typeof error == "string")
      )
        return json5.errors;
    }
  };
var getAuth = (hookUrl) => {
    let url = new URL(hookUrl),
      { username, password } = url;
    (url.username = ""), (url.password = "");
    let urlWithoutAuth = url.toString();
    return {
      username,
      password,
      urlWithoutAuth,
    };
  },
  n8nHandler = async ({ formInfo, hookUrl }) => {
    let headers = { "Content-Type": "application/json" },
      { username, password, urlWithoutAuth } = getAuth(hookUrl);
    username !== "" &&
      password !== "" &&
      (headers.Authorization = `Basic ${btoa([username, password].join(":"))}`);
    let formId = getFormId(formInfo.formData);
    if (formId === void 0)
      return { success: !1, errors: ["No form id in FormData"] };
    let payload = {
        email: formToEmail(formInfo),
        // globally unique form id (can be used for unsubscribing)
        formId: [formInfo.projectId, formId].join("--"),
        action: formInfo.action,
        method: formInfo.method,
        formData: Object.fromEntries(getFormEntries(formInfo.formData)),
      },
      response;
    try {
      response = await fetch(urlWithoutAuth, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      return { success: !1, errors: [error.message] };
    }
    let { text, json: json5 } = await getResponseBody(response);
    return response.status >= 200 &&
      response.status < 300 && // It's difficult to control status code at n8n side.
      // Data is easier to control, so we use data to determine success.
      (json5 == null ? void 0 : json5.success) === !0
      ? { success: !0 }
      : { success: !1, errors: getErrors(json5) ?? [text] };
  };

// app/routes/[_route_with_symbols_]._index.tsx
var import_react43 = require("@remix-run/react");

// ../../packages/sdk-components-react/lib/components.js
var import_react11 = require("react"),
  import_jsx_runtime6 = require("react/jsx-runtime"),
  import_react12 = require("react"),
  import_jsx_runtime7 = require("react/jsx-runtime"),
  import_react13 = require("react"),
  import_utils = require("@react-aria/utils");
var import_jsx_runtime8 = require("react/jsx-runtime"),
  import_react14 = require("react"),
  import_jsx_runtime9 = require("react/jsx-runtime"),
  import_react15 = require("react"),
  import_react16 = require("react"),
  import_react17 = require("react"),
  import_react18 = require("react"),
  import_jsx_runtime10 = require("react/jsx-runtime"),
  import_react19 = require("react");
var import_jsx_runtime11 = require("react/jsx-runtime"),
  import_react20 = require("react"),
  import_jsx_runtime12 = require("react/jsx-runtime"),
  import_react21 = require("react"),
  import_jsx_runtime13 = require("react/jsx-runtime"),
  import_react22 = require("react"),
  import_jsx_runtime14 = require("react/jsx-runtime"),
  import_react23 = require("react"),
  import_jsx_runtime15 = require("react/jsx-runtime"),
  import_react24 = require("react"),
  import_jsx_runtime16 = require("react/jsx-runtime"),
  import_react25 = require("react"),
  import_jsx_runtime17 = require("react/jsx-runtime"),
  import_react26 = require("react"),
  import_jsx_runtime18 = require("react/jsx-runtime"),
  import_react27 = require("react"),
  import_jsx_runtime19 = require("react/jsx-runtime"),
  import_react28 = require("react"),
  import_jsx_runtime20 = require("react/jsx-runtime"),
  import_react29 = require("react");

// ../../packages/image/lib/index.js
var import_react10 = require("react"),
  import_jsx_runtime5 = require("react/jsx-runtime"),
  import_warn_once = __toESM(require("warn-once"), 1),
  imageSizes = [16, 32, 48, 64, 96, 128, 256, 384],
  deviceSizes = [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  allSizes = [...imageSizes, ...deviceSizes],
  getWidths = (width, sizes) => {
    if (sizes) {
      let viewportWidthRe = /(^|\s)(1?\d?\d)vw/g,
        percentSizes = [];
      for (let match; (match = viewportWidthRe.exec(sizes)); match)
        percentSizes.push(Number.parseInt(match[2], 10));
      if (percentSizes.length) {
        let smallestRatio = Math.min(...percentSizes) * 0.01;
        return {
          widths: allSizes.filter((s) => s >= deviceSizes[0] * smallestRatio),
          kind: "w",
        };
      }
      return { widths: allSizes, kind: "w" };
    }
    return width == null
      ? { widths: deviceSizes, kind: "w" }
      : {
          widths: [
            ...new Set(
              [width, width * 2].map(
                (w) =>
                  allSizes.find((p) => p >= w) || allSizes[allSizes.length - 1]
              )
            ),
          ],
          kind: "x",
        };
  },
  generateImgAttrs = ({ src, width, quality, sizes, loader }) => {
    let { widths, kind } = getWidths(width, sizes);
    return {
      sizes: !sizes && kind === "w" ? "100vw" : sizes,
      srcSet: widths
        .map(
          (w, i) =>
            `${loader({ src, quality, width: w })} ${
              kind === "w" ? w : i + 1
            }${kind}`
        )
        .join(", "),
      // Must be last, to prevent Safari to load images twice
      src: loader({
        src,
        quality,
        width: widths[widths.length - 1],
      }),
    };
  },
  getInt = (value) => {
    if (typeof value == "number") return Math.round(value);
    if (typeof value == "string") {
      let vNum = Number.parseFloat(value);
      if (!Number.isNaN(vNum)) return Math.round(vNum);
    }
  },
  DEFAULT_SIZES = "(min-width: 1280px) 50vw, 100vw",
  DEFAULT_QUALITY = 80,
  getImageAttributes = (props) => {
    let width = getInt(props.width),
      quality = Math.max(
        Math.min(getInt(props.quality) ?? DEFAULT_QUALITY, 100),
        0
      );
    if (props.src != null && props.src !== "") {
      if (props.srcSet == null && props.optimize) {
        let sizes =
          props.sizes ?? (props.width == null ? DEFAULT_SIZES : void 0);
        return generateImgAttrs({
          src: props.src,
          width,
          quality,
          sizes,
          loader: props.loader,
        });
      }
      let resAttrs = { src: props.src };
      return (
        props.srcSet != null && (resAttrs.srcSet = props.srcSet),
        props.sizes != null && (resAttrs.sizes = props.sizes),
        resAttrs
      );
    }
    return null;
  },
  Image = (0, import_react10.forwardRef)(
    (
      {
        quality,
        loader,
        optimize = !0,
        loading = "lazy",
        decoding = "async",
        ...imageProps
      },
      ref
    ) => {
      let imageAttributes = getImageAttributes({
        src: imageProps.src,
        srcSet: imageProps.srcSet,
        sizes: imageProps.sizes,
        width: imageProps.width,
        quality,
        loader,
        optimize,
      }) ?? { src: imagePlaceholderSvg };
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("img", {
        ...imageProps,
        ...imageAttributes,
        decoding,
        loading,
        ref,
      });
    }
  );
Image.displayName = "Image";
var imagePlaceholderSvg = `data:image/svg+xml;base64,${btoa(`<svg
  width="140"
  height="140"
  viewBox="0 0 600 600"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  >
  <rect width="600" height="600" fill="#CCCCCC" />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M450 170H150C141.716 170 135 176.716 135 185V415C135 423.284 141.716 430 150 430H450C458.284 430 465 423.284 465 415V185C465 176.716 458.284 170 450 170ZM150 145C127.909 145 110 162.909 110 185V415C110 437.091 127.909 455 150 455H450C472.091 455 490 437.091 490 415V185C490 162.909 472.091 145 450 145H150Z"
    fill="#A2A2A2"
  />
  <path
    d="M237.135 235.012C237.135 255.723 220.345 272.512 199.635 272.512C178.924 272.512 162.135 255.723 162.135 235.012C162.135 214.301 178.924 197.512 199.635 197.512C220.345 197.512 237.135 214.301 237.135 235.012Z"
    fill="#A2A2A2"
  />
  <path
    d="M160 405V367.205L221.609 306.364L256.552 338.628L358.161 234L440 316.043V405H160Z"
    fill="#A2A2A2"
  />
</svg>`)}`;

// ../../packages/sdk-components-react/lib/components.js
var import_jsx_runtime21 = require("react/jsx-runtime"),
  import_react30 = require("react"),
  import_react31 = require("react"),
  import_react32 = require("react"),
  import_react33 = require("react"),
  import_react34 = require("react"),
  import_react35 = require("react"),
  import_jsx_runtime22 = require("react/jsx-runtime"),
  import_react36 = require("react"),
  import_jsx_runtime23 = require("react/jsx-runtime"),
  import_react37 = require("react"),
  import_jsx_runtime24 = require("react/jsx-runtime"),
  import_react38 = require("react"),
  import_jsx_runtime25 = require("react/jsx-runtime"),
  import_colord = require("colord"),
  import_react39 = require("react");
var import_shallow_equal = require("shallow-equal"),
  import_jsx_runtime26 = require("react/jsx-runtime"),
  import_react40 = require("react"),
  import_jsx_runtime27 = require("react/jsx-runtime"),
  import_react41 = require("react"),
  import_jsx_runtime28 = require("react/jsx-runtime"),
  import_react42 = require("react"),
  import_jsx_runtime29 = require("react/jsx-runtime"),
  Slot = (0, import_react11.forwardRef)((props, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", {
      ...props,
      ref,
      style: { display: props.children ? "contents" : "block" },
    })
  );
Slot.displayName = "Slot";
var Fragment4 = (0, import_react12.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", {
    ...props,
    ref,
    style: { display: "contents" },
  })
);
Fragment4.displayName = "Fragment";
var ExecutableHtml = (props) => {
    let { code, innerRef, ...rest } = props,
      containerRef = (0, import_react13.useRef)(null);
    return (
      (0, import_react13.useEffect)(() => {
        let container = containerRef.current;
        if (container === null || code === void 0) return;
        let range = document.createRange();
        range.setStart(container, 0);
        let fragment = range.createContextualFragment(code);
        for (; container.firstChild; )
          container.removeChild(container.firstChild);
        container.append(fragment);
      }, [code]),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", {
        ...rest,
        ref: (0, import_utils.mergeRefs)(innerRef, containerRef),
        style: { display: "contents" },
      })
    );
  },
  InnerHtml = (props) => {
    let { code, innerRef, ...rest } = props;
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", {
      ...rest,
      ref: innerRef,
      style: { display: "contents" },
      dangerouslySetInnerHTML: { __html: props.code ?? "" },
    });
  },
  Placeholder = (props) => {
    let { code, innerRef, ...rest } = props;
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", {
      ref: innerRef,
      ...rest,
      style: { padding: "20px" },
      children: 'Open the "Settings" panel to insert HTML code',
    });
  },
  HtmlEmbed = (0, import_react13.forwardRef)((props, ref) => {
    let { renderer } = (0, import_react13.useContext)(ReactSdkContext),
      { code, executeScriptOnCanvas, ...rest } = props;
    return code === void 0 || code.trim().length === 0
      ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Placeholder, {
          innerRef: ref,
          ...rest,
        })
      : (renderer === "canvas" && executeScriptOnCanvas === !0) ||
        renderer === "preview"
      ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ExecutableHtml, {
          innerRef: ref,
          code,
          ...rest,
        })
      : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(InnerHtml, {
          innerRef: ref,
          code,
          ...rest,
        });
  });
HtmlEmbed.displayName = "HtmlEmbed";
var Body = (0, import_react14.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("body", { ...props, ref })
);
Body.displayName = "Body";
var defaultTag = "div",
  Box = (0, import_react15.forwardRef)(({ tag = defaultTag, ...props }, ref) =>
    (0, import_react15.createElement)(tag, { ...props, ref })
  );
Box.displayName = "Box";
var defaultTag2 = "div",
  Text2 = (0, import_react16.forwardRef)(
    ({ tag = defaultTag2, ...props }, ref) =>
      (0, import_react16.createElement)(tag, { ...props, ref })
  );
Text2.displayName = "Text";
var defaultTag3 = "h1",
  Heading = (0, import_react17.forwardRef)(
    ({ tag = defaultTag3, ...props }, ref) =>
      (0, import_react17.createElement)(tag, { ...props, ref })
  );
Heading.displayName = "Heading";
var Paragraph = (0, import_react18.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { ...props, ref })
);
Paragraph.displayName = "Paragraph";
var Link = (0, import_react19.forwardRef)((props, ref) => {
  let { assetBaseUrl: assetBaseUrl2 } = (0, import_react19.useContext)(
      ReactSdkContext
    ),
    href = usePropUrl(getInstanceIdFromComponentProps(props), "href"),
    url = "#";
  switch (href == null ? void 0 : href.type) {
    case "page": {
      url = href.page.path === "" ? "/" : href.page.path;
      let urlTo = new URL(url, "https://any-valid.url");
      (url = urlTo.pathname),
        href.hash !== void 0 &&
          ((urlTo.hash = encodeURIComponent(href.hash)),
          (url = `${urlTo.pathname}${urlTo.hash}`));
      break;
    }
    case "asset":
      url = `${assetBaseUrl2}${href.asset.name}`;
      break;
    case "string":
      url = href.url;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("a", {
    ...props,
    href: url,
    ref,
  });
});
Link.displayName = "Link";
var RichTextLink = (0, import_react20.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Link, { ...props, ref })
);
RichTextLink.displayName = "RichTextLink";
var Span = (0, import_react21.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { ...props, ref })
);
Span.displayName = "Span";
var Bold = (0, import_react22.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("b", { ...props, ref })
);
Bold.displayName = "Bold";
var Italic = (0, import_react23.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("i", { ...props, ref })
);
Italic.displayName = "Italic";
var Superscript = (0, import_react24.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("sup", { ...props, ref })
);
Superscript.displayName = "Bold";
var Subscript = (0, import_react25.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("sub", { ...props, ref })
);
Subscript.displayName = "Subscript";
var Button = (0, import_react26.forwardRef)(
  ({ type = "submit", children, ...props }, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("button", {
      type,
      ...props,
      ref,
      children,
    })
);
Button.displayName = "Button";
var Input = (0, import_react27.forwardRef)(
  ({ children: _children, ...props }, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("input", { ...props, ref })
);
Input.displayName = "Input";
var Form = (0, import_react28.forwardRef)(({ children, ...props }, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("form", {
    ...props,
    ref,
    children,
  })
);
Form.displayName = "Form";
var imagePlaceholderSvg2 = `data:image/svg+xml;base64,${btoa(`<svg
  width="140"
  height="140"
  viewBox="0 0 600 600"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  >
  <rect width="600" height="600" fill="#CCCCCC" />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M450 170H150C141.716 170 135 176.716 135 185V415C135 423.284 141.716 430 150 430H450C458.284 430 465 423.284 465 415V185C465 176.716 458.284 170 450 170ZM150 145C127.909 145 110 162.909 110 185V415C110 437.091 127.909 455 150 455H450C472.091 455 490 437.091 490 415V185C490 162.909 472.091 145 450 145H150Z"
    fill="#A2A2A2"
  />
  <path
    d="M237.135 235.012C237.135 255.723 220.345 272.512 199.635 272.512C178.924 272.512 162.135 255.723 162.135 235.012C162.135 214.301 178.924 197.512 199.635 197.512C220.345 197.512 237.135 214.301 237.135 235.012Z"
    fill="#A2A2A2"
  />
  <path
    d="M160 405V367.205L221.609 306.364L256.552 338.628L358.161 234L440 316.043V405H160Z"
    fill="#A2A2A2"
  />
</svg>`)}`,
  Image2 = (0, import_react29.forwardRef)(
    ({ loading = "lazy", ...props }, ref) => {
      let { imageLoader: imageLoader2 } = (0, import_react29.useContext)(
          ReactSdkContext
        ),
        asset = usePropAsset(getInstanceIdFromComponentProps(props), "src"),
        src = (asset == null ? void 0 : asset.name) ?? props.src;
      return asset == null
        ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
            "img",
            {
              loading,
              ...props,
              src: src || imagePlaceholderSvg2,
              ref,
            },
            src
          )
        : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
            Image,
            {
              loading,
              ...props,
              loader: imageLoader2,
              src,
              ref,
            },
            src
          );
    }
  );
Image2.displayName = "Image";
var defaultTag4 = "blockquote",
  Blockquote = (0, import_react30.forwardRef)((props, ref) =>
    (0, import_react30.createElement)(defaultTag4, { ...props, ref })
  );
Blockquote.displayName = "Blockquote";
var unorderedTag = "ul",
  orderedTag = "ol",
  List = (0, import_react31.forwardRef)(({ ordered = !1, ...props }, ref) =>
    (0, import_react31.createElement)(ordered ? orderedTag : unorderedTag, {
      ...props,
      ref,
    })
  );
List.displayName = "List";
var defaultTag5 = "li",
  ListItem = (0, import_react32.forwardRef)((props, ref) =>
    (0, import_react32.createElement)(defaultTag5, { ...props, ref })
  );
ListItem.displayName = "ListItem";
var defaultTag6 = "hr",
  Separator = (0, import_react33.forwardRef)((props, ref) =>
    (0, import_react33.createElement)(defaultTag6, { ...props, ref })
  );
Separator.displayName = "Separator";
var defaultTag7 = "code",
  CodeText = (0, import_react34.forwardRef)((props, ref) =>
    (0, import_react34.createElement)(defaultTag7, { ...props, ref })
  );
CodeText.displayName = "CodeText";
var Label = (0, import_react35.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { ...props, ref })
);
Label.displayName = "Label";
var Textarea = (0, import_react36.forwardRef)(
  ({ children: _children, ...props }, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("textarea", { ...props, ref })
);
Textarea.displayName = "Textarea";
var RadioButton = (0, import_react37.forwardRef)(
  ({ children: _children, ...props }, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("input", {
      ...props,
      type: "radio",
      ref,
    })
);
RadioButton.displayName = "RadioButton";
var Checkbox = (0, import_react38.forwardRef)(
  ({ children: _children, ...props }, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("input", {
      ...props,
      type: "checkbox",
      ref,
    })
);
Checkbox.displayName = "Checkbox";
var getUrl = (options) => {
    if (options.url === void 0) return;
    let url;
    try {
      let userUrl = new URL(options.url);
      (url = new URL(IFRAME_CDN)), (url.pathname = `/video${userUrl.pathname}`);
    } catch {}
    if (url === void 0) return;
    let option;
    for (option in options) {
      let value = options[option];
      option === "url" ||
        value === void 0 ||
        url.searchParams.append(option, value.toString());
    }
    if (
      (url.searchParams.set("autoplay", "true"),
      typeof options.color == "string")
    ) {
      let color = (0, import_colord.colord)(options.color)
        .toHex()
        .replace("#", "");
      url.searchParams.set("color", color);
    }
    return (
      options.portrait && url.searchParams.set("title", "true"),
      options.byline &&
        (url.searchParams.set("portrait", "true"),
        url.searchParams.set("title", "true")),
      url.toString()
    );
  },
  preconnect = (url) => {
    let link = document.createElement("link");
    (link.rel = "preconnect"),
      (link.href = url),
      (link.crossOrigin = "true"),
      document.head.append(link);
  },
  warmed = !1,
  PLAYER_CDN = "https://f.vimeocdn.com",
  IFRAME_CDN = "https://player.vimeo.com",
  IMAGE_CDN = "https://i.vimeocdn.com",
  warmConnections = () => {
    warmed ||
      (preconnect(PLAYER_CDN),
      preconnect(IFRAME_CDN),
      preconnect(IMAGE_CDN),
      (warmed = !0));
  },
  createPlayer = (parent, options, callback) => {
    let url = getUrl(options);
    if (url === void 0) return;
    let iframe = document.createElement("iframe");
    return (
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture;"
      ),
      iframe.setAttribute("frameborder", "0"),
      iframe.setAttribute("allowfullscreen", "true"),
      iframe.setAttribute("src", url),
      iframe.setAttribute(
        "style",
        "position: absolute; width: 100%; height: 100%; opacity: 0; transition: opacity 1s;"
      ),
      iframe.addEventListener(
        "load",
        () => {
          (iframe.style.opacity = "1"), callback();
        },
        { once: !0 }
      ),
      parent.appendChild(iframe),
      () => {
        var _a7;
        (_a7 = iframe.parentElement) == null || _a7.removeChild(iframe);
      }
    );
  },
  getVideoId = (url) => {
    try {
      let id = new URL(url).pathname.split("/")[1];
      return id === "" || id == null ? void 0 : id;
    } catch {}
  },
  loadPreviewImage = async (element, videoUrl) => {
    let apiUrl = `https://vimeo.com/api/v2/video/${getVideoId(videoUrl)}.json`,
      thumbnail = (await (await fetch(apiUrl)).json())[0].thumbnail_large,
      imgId = thumbnail.substr(thumbnail.lastIndexOf("/") + 1).split("_")[0],
      imageUrl = new URL(IMAGE_CDN);
    return (
      (imageUrl.pathname = `/video/${imgId}.webp`),
      imageUrl.searchParams.append("mw", "1100"),
      imageUrl.searchParams.append("mh", "619"),
      imageUrl.searchParams.append("q", "70"),
      imageUrl
    );
  },
  useVimeo = ({ options, renderer, showPreview }) => {
    let [playerStatus, setPlayerStatus] = (0, import_react39.useState)(
        "initial"
      ),
      elementRef = (0, import_react39.useRef)(null),
      [previewImageUrl, setPreviewImageUrl] = (0, import_react39.useState)();
    (0, import_react39.useEffect)(() => {
      setPlayerStatus(
        options.autoplay && renderer !== "canvas" ? "initialized" : "initial"
      );
    }, [options.autoplay, renderer]),
      (0, import_react39.useEffect)(() => {
        if (
          !(
            elementRef.current === null ||
            playerStatus === "ready" ||
            options.url === void 0
          )
        ) {
          if (showPreview) {
            loadPreviewImage(elementRef.current, options.url).then(
              setPreviewImageUrl
            );
            return;
          }
          setPreviewImageUrl(void 0);
        }
      }, [renderer, showPreview, options.url, playerStatus]);
    let optionsRef = (0, import_react39.useRef)(options),
      stableOptions = (0, import_react39.useMemo)(
        () => (
          (0, import_shallow_equal.shallowEqual)(
            options,
            optionsRef.current
          ) === !1 && (optionsRef.current = options),
          optionsRef.current
        ),
        [options]
      );
    return (
      (0, import_react39.useEffect)(() => {
        if (!(elementRef.current === null || playerStatus === "initial"))
          return createPlayer(elementRef.current, stableOptions, () => {
            setPlayerStatus("ready");
          });
      }, [stableOptions, playerStatus]),
      { previewImageUrl, playerStatus, setPlayerStatus, elementRef }
    );
  },
  Vimeo = (0, import_react39.forwardRef)(
    (
      {
        url,
        autoplay = !1,
        autopause = !0,
        backgroundMode = !1,
        showByline = !1,
        showControls = !0,
        doNotTrack = !1,
        keyboard = !0,
        loop = !1,
        muted = !1,
        pip = !1,
        playsinline = !0,
        showPortrait = !0,
        quality = "auto",
        responsive = !0,
        speed = !1,
        showTitle = !1,
        transparent = !0,
        showPreview = !1,
        autopip,
        controlsColor,
        interactiveParams,
        texttrack,
        children,
        ...rest
      },
      ref
    ) => {
      let { renderer } = (0, import_react39.useContext)(ReactSdkContext),
        { previewImageUrl, playerStatus, setPlayerStatus, elementRef } =
          useVimeo({
            renderer,
            showPreview,
            options: {
              url,
              autoplay,
              autopause,
              keyboard,
              loop,
              muted,
              pip,
              playsinline,
              quality,
              responsive,
              speed,
              transparent,
              portrait: showPortrait,
              byline: showByline,
              title: showTitle,
              color: controlsColor,
              controls: showControls,
              interactive_params: interactiveParams,
              background: backgroundMode,
              dnt: doNotTrack,
            },
          });
      return /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
        VimeoContext.Provider,
        {
          value: {
            status: playerStatus,
            previewImageUrl,
            onInitPlayer() {
              renderer !== "canvas" && setPlayerStatus("initialized");
            },
          },
          children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", {
            ...rest,
            ref: (value) => {
              (elementRef.current = value),
                ref !== null &&
                  (typeof ref == "function"
                    ? ref(value)
                    : (ref.current = value));
            },
            onPointerOver: () => {
              renderer !== "canvas" && warmConnections();
            },
            children:
              url === void 0
                ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(EmptyState, {})
                : children,
          }),
        }
      );
    }
  );
Vimeo.displayName = "Vimeo";
var EmptyState = () =>
    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", {
      style: {
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.2em",
      },
      children:
        'Open the "Settings" panel and paste a video URL, e.g. https://vimeo.com/831343124.',
    }),
  VimeoContext = (0, import_react39.createContext)({
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onInitPlayer: () => {},
    status: "initial",
  }),
  base64Preview =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkOAMAANIAzr59FiYAAAAASUVORK5CYII=",
  VimeoPreviewImage = (0, import_react40.forwardRef)(
    ({ src, ...rest }, ref) => {
      let vimeoContext = (0, import_react40.useContext)(VimeoContext);
      return /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(Image2, {
        ...rest,
        src: String(vimeoContext.previewImageUrl ?? src ?? base64Preview),
        ref,
      });
    }
  );
VimeoPreviewImage.displayName = "VimeoPreviewImage";
var VimeoPlayButton = (0, import_react41.forwardRef)((props, ref) => {
  let vimeoContext = (0, import_react41.useContext)(VimeoContext);
  return vimeoContext.status !== "initial"
    ? null
    : /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(Button, {
        ...props,
        onClick: vimeoContext.onInitPlayer,
        ref,
      });
});
VimeoPlayButton.displayName = "VimeoPlayButton";
var VimeoSpinner = (0, import_react42.forwardRef)((props, ref) =>
  (0, import_react42.useContext)(VimeoContext).status !== "initialized"
    ? null
    : /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { ...props, ref })
);
VimeoSpinner.displayName = "VimeoSpinner";

// app/__generated__/[_route_with_symbols_]._index.tsx
var components = new Map(Object.entries({ Body, Image: Image2 })),
  fontAssets = [],
  pageData = {
    build: {
      props: [
        [
          "HNaXZUvlg14jFvxc29n9T",
          {
            id: "HNaXZUvlg14jFvxc29n9T",
            instanceId: "AdXSAYCx4QDo5QN6nLoGs",
            name: "src",
            type: "asset",
            value: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
          },
        ],
      ],
      instances: [
        [
          "EDEfpMPRqDejthtwkH7ws",
          {
            type: "instance",
            id: "EDEfpMPRqDejthtwkH7ws",
            component: "Body",
            children: [{ type: "id", value: "AdXSAYCx4QDo5QN6nLoGs" }],
          },
        ],
        [
          "AdXSAYCx4QDo5QN6nLoGs",
          {
            type: "instance",
            id: "AdXSAYCx4QDo5QN6nLoGs",
            component: "Image",
            label: "webp image, used to test raw image uploads",
            children: [],
          },
        ],
      ],
      dataSources: [],
    },
    pages: [
      {
        id: "7Db64ZXgYiRqKSQNR-qTQ",
        name: "Home",
        title: "Home",
        meta: {},
        rootInstanceId: "On9cvWCxr5rdZtY9O1Bv0",
        path: "",
      },
      {
        id: "xfvB4UThQXmQ_OubPYrkg",
        name: "radix",
        title: "radix",
        meta: { description: "" },
        rootInstanceId: "uKWGyE9JY3cPwY-xI9vk6",
        path: "/radix",
      },
      {
        id: "szYLvBduHPmbtqQKCDY0b",
        name: "RouteWithSymbols",
        title: "RouteWithSymbols",
        meta: { description: "" },
        rootInstanceId: "EDEfpMPRqDejthtwkH7ws",
        path: "/_route_with_symbols_",
      },
      {
        id: "U1tRJl2ERr8_OFe0g9cN_",
        name: "form",
        title: "form",
        meta: { description: "" },
        rootInstanceId: "a-4nDFkaWy4px1fn38XWJ",
        path: "/form",
      },
    ],
    page: {
      id: "szYLvBduHPmbtqQKCDY0b",
      name: "RouteWithSymbols",
      title: "RouteWithSymbols",
      meta: { description: "" },
      rootInstanceId: "EDEfpMPRqDejthtwkH7ws",
      path: "/_route_with_symbols_",
    },
    assets: [
      {
        id: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
        name: "small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp",
        description: null,
        projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
        size: 2906,
        type: "image",
        format: "webp",
        createdAt: "2023-09-12T09:44:22.120Z",
        meta: { width: 100, height: 100 },
      },
      {
        id: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
        name: "_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg",
        description: null,
        projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
        size: 210614,
        type: "image",
        format: "jpeg",
        createdAt: "2023-09-06T11:28:43.031Z",
        meta: { width: 1024, height: 1024 },
      },
    ],
  },
  user = {
    email: "hello@webstudio.is",
  },
  projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d",
  indexesWithinAncestors = /* @__PURE__ */ new Map([]),
  getDataSourcesLogic = (_getVariable, _setVariable) =>
    /* @__PURE__ */ new Map(),
  formsProperties = /* @__PURE__ */ new Map([]),
  utils = {
    indexesWithinAncestors,
    getDataSourcesLogic,
  };

// app/__generated__/index.css
var generated_default = "/build/_assets/index-XQ764N4P.css";

// app/constants.mjs
var assetBaseUrl = "/assets/",
  imageBaseUrl = "/assets/";

// app/image-loader.mjs
var imageLoader = ({ src }) => imageBaseUrl + src;

// app/routes/[_route_with_symbols_]._index.tsx
var import_jsx_runtime30 = require("react/jsx-runtime"),
  meta = () => {
    let { page } = pageData;
    return [
      {
        title: (page == null ? void 0 : page.title) || "Webstudio",
        ...(page == null ? void 0 : page.meta),
      },
    ];
  },
  links = () => {
    let result = [];
    result.push({
      rel: "stylesheet",
      href: generated_default,
    });
    for (let asset of fontAssets)
      asset.type === "font" &&
        result.push({
          rel: "preload",
          href: assetBaseUrl + asset.name,
          as: "font",
          crossOrigin: "anonymous",
          // @todo add mimeType
          // type: asset.mimeType,
        });
    return result;
  },
  getRequestHost = (request) =>
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "",
  getMethod = (value) => {
    if (value === void 0) return "post";
    switch (value.toLowerCase()) {
      case "get":
        return "get";
      default:
        return "post";
    }
  },
  action = async ({ request, context }) => {
    var _a7;
    let formData = await request.formData(),
      formId = getFormId(formData);
    if (formId === void 0)
      throw (0, import_server_runtime.json)("Form not found", { status: 404 });
    let formProperties = formsProperties.get(formId),
      { action: action5, method } = formProperties ?? {},
      email = (_a7 = user) == null ? void 0 : _a7.email;
    if (email == null) return { success: !1 };
    let pageUrl;
    try {
      (pageUrl = new URL(request.url)),
        (pageUrl.host = getRequestHost(request));
    } catch {
      return { success: !1 };
    }
    if (action5 !== void 0)
      try {
        new URL(action5);
      } catch {
        return (0, import_server_runtime.json)(
          {
            success: !1,
            error: "Invalid action URL, must be valid http/https protocol",
          },
          { status: 200 }
        );
      }
    let formInfo = {
      formData,
      projectId,
      action: action5 ?? null,
      method: getMethod(method),
      pageUrl: pageUrl.toString(),
      toEmail: email,
      fromEmail: pageUrl.hostname + "@webstudio.email",
    };
    return await n8nHandler({
      formInfo,
      hookUrl: context.N8N_FORM_EMAIL_HOOK,
    });
  },
  Outlet = () => {
    let pagesCanvasData = pageData,
      page = pagesCanvasData.page;
    if (page === void 0)
      throw (0, import_server_runtime.json)("Page not found", {
        status: 404,
      });
    let params = {
        assetBaseUrl,
        imageBaseUrl,
      },
      data = {
        build: pagesCanvasData.build,
        assets: pagesCanvasData.assets,
        page,
        pages: pagesCanvasData.pages,
        params,
      };
    return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(InstanceRoot, {
      imageLoader,
      data,
      components,
      utils,
      scripts: /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)(
        import_jsx_runtime30.Fragment,
        {
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(
              import_react43.Scripts,
              {}
            ),
            /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(
              import_react43.ScrollRestoration,
              {}
            ),
          ],
        }
      ),
    });
  },
  route_with_symbols_index_default = Outlet;

// app/routes/[radix]._index.tsx
var radix_index_exports = {};
__export(radix_index_exports, {
  action: () => action2,
  default: () => radix_index_default,
  links: () => links2,
  meta: () => meta2,
});
var import_server_runtime2 = require("@remix-run/server-runtime");
var import_react55 = require("@remix-run/react");

// ../../packages/sdk-components-react-radix/lib/components.js
var import_react44 = require("react"),
  import_react_collapsible = require("@radix-ui/react-collapsible");
var import_jsx_runtime31 = require("react/jsx-runtime"),
  import_react45 = require("react"),
  DialogPrimitive = __toESM(require("@radix-ui/react-dialog"), 1);
var import_jsx_runtime32 = require("react/jsx-runtime"),
  import_react46 = require("react"),
  PopoverPrimitive = __toESM(require("@radix-ui/react-popover"), 1);
var import_jsx_runtime33 = require("react/jsx-runtime"),
  TooltipPrimitive = __toESM(require("@radix-ui/react-tooltip"), 1);
var import_react47 = require("react"),
  import_jsx_runtime34 = require("react/jsx-runtime"),
  import_react48 = require("react"),
  import_react_tabs = require("@radix-ui/react-tabs");
var import_jsx_runtime35 = require("react/jsx-runtime"),
  import_react49 = require("react"),
  LabelPrimitive = __toESM(require("@radix-ui/react-label"), 1),
  import_jsx_runtime36 = require("react/jsx-runtime"),
  import_react50 = require("react"),
  import_react_accordion = require("@radix-ui/react-accordion");
var import_jsx_runtime37 = require("react/jsx-runtime"),
  NavigationMenuPrimitive = __toESM(
    require("@radix-ui/react-navigation-menu"),
    1
  );
var import_react51 = require("react"),
  import_jsx_runtime38 = require("react/jsx-runtime"),
  import_react52 = require("react"),
  import_react_select = require("@radix-ui/react-select");
var import_jsx_runtime39 = require("react/jsx-runtime"),
  import_react_switch = require("@radix-ui/react-switch"),
  import_react53 = require("react"),
  import_react_checkbox = require("@radix-ui/react-checkbox"),
  import_jsx_runtime40 = require("react/jsx-runtime"),
  import_react54 = require("react"),
  import_react_radio_group = require("@radix-ui/react-radio-group");
var CollapsibleTrigger = (0, import_react44.forwardRef)(
  ({ children, ...props }, ref) => {
    let firstChild = import_react44.Children.toArray(children)[0];
    return /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(
      import_react_collapsible.Trigger,
      {
        asChild: !0,
        ref,
        ...props,
        children:
          firstChild ??
          /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("button", {
            children: "Add button",
          }),
      }
    );
  }
);
var Dialog = (0, import_react45.forwardRef)((props, _ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(DialogPrimitive.Root, {
      ...props,
    })
  ),
  DialogTrigger = (0, import_react45.forwardRef)(
    ({ children, ...props }, ref) => {
      let firstChild = import_react45.Children.toArray(children)[0];
      return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
        DialogPrimitive.Trigger,
        {
          ref,
          asChild: !0,
          ...props,
          children:
            firstChild ??
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("button", {
              children: "Add button or link",
            }),
        }
      );
    }
  ),
  DialogOverlay = (0, import_react45.forwardRef)((props, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      DialogPrimitive.DialogPortal,
      {
        children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
          DialogPrimitive.Overlay,
          { ref, ...props }
        ),
      }
    )
  );
var Popover = (0, import_react46.forwardRef)((props, _ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(PopoverPrimitive.Root, {
      ...props,
    })
  ),
  PopoverTrigger = (0, import_react46.forwardRef)(
    ({ children, ...props }, ref) => {
      let firstChild = import_react46.Children.toArray(children)[0];
      return /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
        PopoverPrimitive.Trigger,
        {
          asChild: !0,
          ref,
          ...props,
          children:
            firstChild ??
            /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("button", {
              children: "Add button or link",
            }),
        }
      );
    }
  ),
  PopoverContent = (0, import_react46.forwardRef)(
    (
      { sideOffset = 4, align = "center", hideWhenDetached = !0, ...props },
      ref
    ) =>
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(PopoverPrimitive.Portal, {
        children: /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
          PopoverPrimitive.Content,
          {
            ref,
            align: "center",
            sideOffset,
            hideWhenDetached,
            ...props,
          }
        ),
      })
  ),
  Tooltip = (0, import_react47.forwardRef)((props, _ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(TooltipPrimitive.Provider, {
      children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        TooltipPrimitive.Root,
        { ...props }
      ),
    })
  ),
  TooltipTrigger = (0, import_react47.forwardRef)(
    ({ children, ...props }, ref) => {
      let firstChild = import_react47.Children.toArray(children)[0];
      return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        TooltipPrimitive.Trigger,
        {
          asChild: !0,
          ref,
          ...props,
          children:
            firstChild ??
            /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("button", {
              children: "Add button or link",
            }),
        }
      );
    }
  ),
  TooltipContent = (0, import_react47.forwardRef)(
    ({ sideOffset = 4, hideWhenDetached = !0, ...props }, ref) =>
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(TooltipPrimitive.Portal, {
        children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
          TooltipPrimitive.Content,
          {
            ref,
            hideWhenDetached,
            sideOffset,
            ...props,
          }
        ),
      })
  );
var TabsTrigger = (0, import_react48.forwardRef)(({ value, ...props }, ref) => {
    let index = getIndexWithinAncestorFromComponentProps(props);
    return /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
      import_react_tabs.Trigger,
      { ref, value: value ?? index ?? "", ...props }
    );
  }),
  TabsContent = (0, import_react48.forwardRef)(({ value, ...props }, ref) => {
    let index = getIndexWithinAncestorFromComponentProps(props);
    return /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
      import_react_tabs.Content,
      { ref, value: value ?? index ?? "", ...props }
    );
  }),
  Label2 = (0, import_react49.forwardRef)((props, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(LabelPrimitive.Root, {
      ref,
      ...props,
    })
  ),
  Accordion = (0, import_react50.forwardRef)((props, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(import_react_accordion.Root, {
      ref,
      type: "single",
      ...props,
    })
  ),
  AccordionItem = (0, import_react50.forwardRef)(({ value, ...props }, ref) => {
    let index = getIndexWithinAncestorFromComponentProps(props);
    return /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
      import_react_accordion.Item,
      { ref, value: value ?? index ?? "", ...props }
    );
  }),
  AccordionHeader = import_react_accordion.Header,
  AccordionTrigger = import_react_accordion.Trigger,
  AccordionContent = import_react_accordion.Content,
  NavigationMenu = (0, import_react51.forwardRef)(
    ({ value: propsValue, ...props }, ref) => {
      let { renderer } = (0, import_react51.useContext)(ReactSdkContext),
        value = propsValue;
      return (
        renderer === "canvas" && (value = value === "" ? "-1" : value),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
          NavigationMenuPrimitive.Root,
          { ref, value, ...props }
        )
      );
    }
  );
var NavigationMenuItem = (0, import_react51.forwardRef)(
    ({ value, ...props }, ref) => {
      let index = getIndexWithinAncestorFromComponentProps(props);
      return /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
        NavigationMenuPrimitive.Item,
        { ref, value: value ?? index, ...props }
      );
    }
  ),
  NavigationMenuLink = (0, import_react51.forwardRef)(
    ({ children, ...props }, ref) => {
      let firstChild = import_react51.Children.toArray(children)[0];
      return /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
        NavigationMenuPrimitive.Link,
        {
          asChild: !0,
          ref,
          ...props,
          children:
            firstChild ??
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("a", {
              children: "Add link component",
            }),
        }
      );
    }
  ),
  NavigationMenuTrigger = (0, import_react51.forwardRef)(
    ({ children, ...props }, ref) => {
      let firstChild = import_react51.Children.toArray(children)[0];
      return /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
        NavigationMenuPrimitive.Trigger,
        {
          asChild: !0,
          ref,
          ...props,
          children:
            firstChild ??
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("button", {
              children: "Add button or link",
            }),
        }
      );
    }
  ),
  Select2 = (0, import_react52.forwardRef)(
    ({ value, ...props }, _ref) => (
      value === "" && (value = void 0),
      /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_select.Root, {
        value,
        ...props,
      })
    )
  );
var SelectValue = (0, import_react52.forwardRef)((props, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_select.Value, {
      ref,
      ...props,
    })
  ),
  SelectContent = (0, import_react52.forwardRef)((props, ref) =>
    /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_select.Portal, {
      children: /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(
        import_react_select.Content,
        { ref, ...props, position: "popper" }
      ),
    })
  );
var Checkbox2 = (0, import_react53.forwardRef)((props, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime40.jsx)(import_react_checkbox.Root, {
    ref,
    ...props,
  })
);

// app/__generated__/[radix]._index.tsx
var components2 = new Map(
    Object.entries({
      Body,
      Text: Text2,
      Box,
      HtmlEmbed,
      "@webstudio-is/sdk-components-react-radix:Accordion": Accordion,
      "@webstudio-is/sdk-components-react-radix:AccordionItem": AccordionItem,
      "@webstudio-is/sdk-components-react-radix:AccordionHeader":
        AccordionHeader,
      "@webstudio-is/sdk-components-react-radix:AccordionTrigger":
        AccordionTrigger,
      "@webstudio-is/sdk-components-react-radix:AccordionContent":
        AccordionContent,
    })
  ),
  fontAssets2 = [],
  pageData2 = {
    build: {
      props: [
        [
          "_x-dxwbTQ-XBLRuYQE9Pm",
          {
            id: "_x-dxwbTQ-XBLRuYQE9Pm",
            instanceId: "AM9fD6dv2Ftc3Xjcsd7Uc",
            name: "collapsible",
            type: "boolean",
            value: !0,
          },
        ],
        [
          "XDeoQFsXw3NhVjns6I5HM",
          {
            id: "XDeoQFsXw3NhVjns6I5HM",
            instanceId: "AM9fD6dv2Ftc3Xjcsd7Uc",
            name: "value",
            type: "dataSource",
            value: "RR_FthRebEUcAKUJIXl0j",
          },
        ],
        [
          "UZg-1PcrNODgUo94IvnGC",
          {
            id: "UZg-1PcrNODgUo94IvnGC",
            instanceId: "AM9fD6dv2Ftc3Xjcsd7Uc",
            name: "onValueChange",
            type: "action",
            value: [
              {
                type: "execute",
                args: ["value"],
                code: "$ws$dataSource$RR_FthRebEUcAKUJIXl0j = value",
              },
            ],
          },
        ],
        [
          "XxpufvbtZ9iuhkPDDigde",
          {
            id: "XxpufvbtZ9iuhkPDDigde",
            instanceId: "d0sd_G-kHirxgjq6s6Uq1",
            name: "code",
            type: "string",
            value:
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>',
          },
        ],
        [
          "d26zsuAR2XZt1RRN6oJXk",
          {
            id: "d26zsuAR2XZt1RRN6oJXk",
            instanceId: "StPslEr81nfBISqBE2R-Y",
            name: "code",
            type: "string",
            value:
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>',
          },
        ],
        [
          "8Ar0H_oY5LOeyp2mMksps",
          {
            id: "8Ar0H_oY5LOeyp2mMksps",
            instanceId: "sO80m5u4f87jVGG91t6u8",
            name: "code",
            type: "string",
            value:
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>',
          },
        ],
      ],
      instances: [
        [
          "uKWGyE9JY3cPwY-xI9vk6",
          {
            type: "instance",
            id: "uKWGyE9JY3cPwY-xI9vk6",
            component: "Body",
            children: [{ type: "id", value: "AM9fD6dv2Ftc3Xjcsd7Uc" }],
          },
        ],
        [
          "AM9fD6dv2Ftc3Xjcsd7Uc",
          {
            type: "instance",
            id: "AM9fD6dv2Ftc3Xjcsd7Uc",
            component: "@webstudio-is/sdk-components-react-radix:Accordion",
            children: [
              { type: "id", value: "zJ927zk9txwUbYycKB7QA" },
              { type: "id", value: "C838wkvIcA1BQu30Xu2G8" },
              { type: "id", value: "65djoTmSBGemZ2L5izQ5M" },
            ],
          },
        ],
        [
          "zJ927zk9txwUbYycKB7QA",
          {
            type: "instance",
            id: "zJ927zk9txwUbYycKB7QA",
            component: "@webstudio-is/sdk-components-react-radix:AccordionItem",
            children: [
              { type: "id", value: "sMxg7xT1hwYt05hbOvoPL" },
              { type: "id", value: "IUftdfjK-ilSzfOTdIx1u" },
            ],
          },
        ],
        [
          "sMxg7xT1hwYt05hbOvoPL",
          {
            type: "instance",
            id: "sMxg7xT1hwYt05hbOvoPL",
            component:
              "@webstudio-is/sdk-components-react-radix:AccordionHeader",
            children: [{ type: "id", value: "qQSA4NoyKC88O68mBiQe2" }],
          },
        ],
        [
          "qQSA4NoyKC88O68mBiQe2",
          {
            type: "instance",
            id: "qQSA4NoyKC88O68mBiQe2",
            component:
              "@webstudio-is/sdk-components-react-radix:AccordionTrigger",
            children: [
              { type: "id", value: "q-DVI4YTNrQ1LizmEyJHI" },
              { type: "id", value: "RSk81lLj2IGXgchTuXF7V" },
            ],
          },
        ],
        [
          "q-DVI4YTNrQ1LizmEyJHI",
          {
            type: "instance",
            id: "q-DVI4YTNrQ1LizmEyJHI",
            component: "Text",
            children: [{ type: "text", value: "Is it accessible?" }],
          },
        ],
        [
          "RSk81lLj2IGXgchTuXF7V",
          {
            type: "instance",
            id: "RSk81lLj2IGXgchTuXF7V",
            component: "Box",
            label: "Icon Container",
            children: [{ type: "id", value: "d0sd_G-kHirxgjq6s6Uq1" }],
          },
        ],
        [
          "d0sd_G-kHirxgjq6s6Uq1",
          {
            type: "instance",
            id: "d0sd_G-kHirxgjq6s6Uq1",
            component: "HtmlEmbed",
            label: "Chevron Icon",
            children: [],
          },
        ],
        [
          "IUftdfjK-ilSzfOTdIx1u",
          {
            type: "instance",
            id: "IUftdfjK-ilSzfOTdIx1u",
            component:
              "@webstudio-is/sdk-components-react-radix:AccordionContent",
            children: [
              {
                type: "text",
                value: "Yes. It adheres to the WAI-ARIA design pattern.",
              },
            ],
          },
        ],
        [
          "C838wkvIcA1BQu30Xu2G8",
          {
            type: "instance",
            id: "C838wkvIcA1BQu30Xu2G8",
            component: "@webstudio-is/sdk-components-react-radix:AccordionItem",
            children: [
              { type: "id", value: "fYUOB_brm6s0Ky68lzMfU" },
              { type: "id", value: "wNRVuu0L5E8TVufKdswp1" },
            ],
          },
        ],
        [
          "fYUOB_brm6s0Ky68lzMfU",
          {
            type: "instance",
            id: "fYUOB_brm6s0Ky68lzMfU",
            component:
              "@webstudio-is/sdk-components-react-radix:AccordionHeader",
            children: [{ type: "id", value: "dfd4gonev_AX6BpuCsxjb" }],
          },
        ],
        [
          "dfd4gonev_AX6BpuCsxjb",
          {
            type: "instance",
            id: "dfd4gonev_AX6BpuCsxjb",
            component:
              "@webstudio-is/sdk-components-react-radix:AccordionTrigger",
            children: [
              { type: "id", value: "lZ7sI6Kw_0VZkURriKscB" },
              { type: "id", value: "wRw75kuvFzl5NWD8IGJoI" },
            ],
          },
        ],
        [
          "lZ7sI6Kw_0VZkURriKscB",
          {
            type: "instance",
            id: "lZ7sI6Kw_0VZkURriKscB",
            component: "Text",
            children: [{ type: "text", value: "Is it styled?" }],
          },
        ],
        [
          "wRw75kuvFzl5NWD8IGJoI",
          {
            type: "instance",
            id: "wRw75kuvFzl5NWD8IGJoI",
            component: "Box",
            label: "Icon Container",
            children: [{ type: "id", value: "StPslEr81nfBISqBE2R-Y" }],
          },
        ],
        [
          "StPslEr81nfBISqBE2R-Y",
          {
            type: "instance",
            id: "StPslEr81nfBISqBE2R-Y",
            component: "HtmlEmbed",
            label: "Chevron Icon",
            children: [],
          },
        ],
        [
          "wNRVuu0L5E8TVufKdswp1",
          {
            type: "instance",
            id: "wNRVuu0L5E8TVufKdswp1",
            component:
              "@webstudio-is/sdk-components-react-radix:AccordionContent",
            children: [
              {
                type: "text",
                value:
                  "Yes. It comes with default styles that matches the other components' aesthetic.",
              },
            ],
          },
        ],
        [
          "65djoTmSBGemZ2L5izQ5M",
          {
            type: "instance",
            id: "65djoTmSBGemZ2L5izQ5M",
            component: "@webstudio-is/sdk-components-react-radix:AccordionItem",
            children: [
              { type: "id", value: "UJYfe6kH7HqhH0YYeJwe7" },
              { type: "id", value: "mOVPnIrlt6IwVAzI_i2Fc" },
            ],
          },
        ],
        [
          "UJYfe6kH7HqhH0YYeJwe7",
          {
            type: "instance",
            id: "UJYfe6kH7HqhH0YYeJwe7",
            component:
              "@webstudio-is/sdk-components-react-radix:AccordionHeader",
            children: [{ type: "id", value: "600nGddaNxGGdsuGgpxJR" }],
          },
        ],
        [
          "600nGddaNxGGdsuGgpxJR",
          {
            type: "instance",
            id: "600nGddaNxGGdsuGgpxJR",
            component:
              "@webstudio-is/sdk-components-react-radix:AccordionTrigger",
            children: [
              { type: "id", value: "1iNKIMG91n83PzJnEdxq9" },
              { type: "id", value: "Ta70VqUb_fGJXBT_zsnxQ" },
            ],
          },
        ],
        [
          "1iNKIMG91n83PzJnEdxq9",
          {
            type: "instance",
            id: "1iNKIMG91n83PzJnEdxq9",
            component: "Text",
            children: [{ type: "text", value: "Is it animated?" }],
          },
        ],
        [
          "Ta70VqUb_fGJXBT_zsnxQ",
          {
            type: "instance",
            id: "Ta70VqUb_fGJXBT_zsnxQ",
            component: "Box",
            label: "Icon Container",
            children: [{ type: "id", value: "sO80m5u4f87jVGG91t6u8" }],
          },
        ],
        [
          "sO80m5u4f87jVGG91t6u8",
          {
            type: "instance",
            id: "sO80m5u4f87jVGG91t6u8",
            component: "HtmlEmbed",
            label: "Chevron Icon",
            children: [],
          },
        ],
        [
          "mOVPnIrlt6IwVAzI_i2Fc",
          {
            type: "instance",
            id: "mOVPnIrlt6IwVAzI_i2Fc",
            component:
              "@webstudio-is/sdk-components-react-radix:AccordionContent",
            children: [
              {
                type: "text",
                value:
                  "Yes. It's animated by default, but you can disable it if you prefer.",
              },
            ],
          },
        ],
      ],
      dataSources: [
        [
          "RR_FthRebEUcAKUJIXl0j",
          {
            type: "variable",
            id: "RR_FthRebEUcAKUJIXl0j",
            scopeInstanceId: "AM9fD6dv2Ftc3Xjcsd7Uc",
            name: "accordionValue",
            value: { type: "string", value: "0" },
          },
        ],
      ],
    },
    pages: [
      {
        id: "7Db64ZXgYiRqKSQNR-qTQ",
        name: "Home",
        title: "Home",
        meta: {},
        rootInstanceId: "On9cvWCxr5rdZtY9O1Bv0",
        path: "",
      },
      {
        id: "xfvB4UThQXmQ_OubPYrkg",
        name: "radix",
        title: "radix",
        meta: { description: "" },
        rootInstanceId: "uKWGyE9JY3cPwY-xI9vk6",
        path: "/radix",
      },
      {
        id: "szYLvBduHPmbtqQKCDY0b",
        name: "RouteWithSymbols",
        title: "RouteWithSymbols",
        meta: { description: "" },
        rootInstanceId: "EDEfpMPRqDejthtwkH7ws",
        path: "/_route_with_symbols_",
      },
      {
        id: "U1tRJl2ERr8_OFe0g9cN_",
        name: "form",
        title: "form",
        meta: { description: "" },
        rootInstanceId: "a-4nDFkaWy4px1fn38XWJ",
        path: "/form",
      },
    ],
    page: {
      id: "xfvB4UThQXmQ_OubPYrkg",
      name: "radix",
      title: "radix",
      meta: { description: "" },
      rootInstanceId: "uKWGyE9JY3cPwY-xI9vk6",
      path: "/radix",
    },
    assets: [
      {
        id: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
        name: "small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp",
        description: null,
        projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
        size: 2906,
        type: "image",
        format: "webp",
        createdAt: "2023-09-12T09:44:22.120Z",
        meta: { width: 100, height: 100 },
      },
      {
        id: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
        name: "_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg",
        description: null,
        projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
        size: 210614,
        type: "image",
        format: "jpeg",
        createdAt: "2023-09-06T11:28:43.031Z",
        meta: { width: 1024, height: 1024 },
      },
    ],
  },
  user2 = {
    email: "hello@webstudio.is",
  },
  projectId2 = "cddc1d44-af37-4cb6-a430-d300cf6f932d",
  indexesWithinAncestors2 = /* @__PURE__ */ new Map([
    ["zJ927zk9txwUbYycKB7QA", 0],
    ["C838wkvIcA1BQu30Xu2G8", 1],
    ["65djoTmSBGemZ2L5izQ5M", 2],
  ]),
  getDataSourcesLogic2 = (_getVariable, _setVariable) => {
    let accordionValue = _getVariable("RR_FthRebEUcAKUJIXl0j") ?? "0",
      set$accordionValue = (value) =>
        _setVariable("RR_FthRebEUcAKUJIXl0j", value),
      onValueChange = (value) => {
        (accordionValue = value), set$accordionValue(accordionValue);
      },
      _output = /* @__PURE__ */ new Map();
    return (
      _output.set("RR_FthRebEUcAKUJIXl0j", accordionValue),
      _output.set("UZg-1PcrNODgUo94IvnGC", onValueChange),
      _output
    );
  },
  formsProperties2 = /* @__PURE__ */ new Map([]),
  utils2 = {
    indexesWithinAncestors: indexesWithinAncestors2,
    getDataSourcesLogic: getDataSourcesLogic2,
  };

// app/routes/[radix]._index.tsx
var import_jsx_runtime41 = require("react/jsx-runtime"),
  meta2 = () => {
    let { page } = pageData2;
    return [
      {
        title: (page == null ? void 0 : page.title) || "Webstudio",
        ...(page == null ? void 0 : page.meta),
      },
    ];
  },
  links2 = () => {
    let result = [];
    result.push({
      rel: "stylesheet",
      href: generated_default,
    });
    for (let asset of fontAssets2)
      asset.type === "font" &&
        result.push({
          rel: "preload",
          href: assetBaseUrl + asset.name,
          as: "font",
          crossOrigin: "anonymous",
          // @todo add mimeType
          // type: asset.mimeType,
        });
    return result;
  },
  getRequestHost2 = (request) =>
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "",
  getMethod2 = (value) => {
    if (value === void 0) return "post";
    switch (value.toLowerCase()) {
      case "get":
        return "get";
      default:
        return "post";
    }
  },
  action2 = async ({ request, context }) => {
    var _a7;
    let formData = await request.formData(),
      formId = getFormId(formData);
    if (formId === void 0)
      throw (0, import_server_runtime2.json)("Form not found", { status: 404 });
    let formProperties = formsProperties2.get(formId),
      { action: action5, method } = formProperties ?? {},
      email = (_a7 = user2) == null ? void 0 : _a7.email;
    if (email == null) return { success: !1 };
    let pageUrl;
    try {
      (pageUrl = new URL(request.url)),
        (pageUrl.host = getRequestHost2(request));
    } catch {
      return { success: !1 };
    }
    if (action5 !== void 0)
      try {
        new URL(action5);
      } catch {
        return (0, import_server_runtime2.json)(
          {
            success: !1,
            error: "Invalid action URL, must be valid http/https protocol",
          },
          { status: 200 }
        );
      }
    let formInfo = {
      formData,
      projectId: projectId2,
      action: action5 ?? null,
      method: getMethod2(method),
      pageUrl: pageUrl.toString(),
      toEmail: email,
      fromEmail: pageUrl.hostname + "@webstudio.email",
    };
    return await n8nHandler({
      formInfo,
      hookUrl: context.N8N_FORM_EMAIL_HOOK,
    });
  },
  Outlet2 = () => {
    let pagesCanvasData = pageData2,
      page = pagesCanvasData.page;
    if (page === void 0)
      throw (0, import_server_runtime2.json)("Page not found", {
        status: 404,
      });
    let params = {
        assetBaseUrl,
        imageBaseUrl,
      },
      data = {
        build: pagesCanvasData.build,
        assets: pagesCanvasData.assets,
        page,
        pages: pagesCanvasData.pages,
        params,
      };
    return /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(InstanceRoot, {
      imageLoader,
      data,
      components: components2,
      utils: utils2,
      scripts: /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)(
        import_jsx_runtime41.Fragment,
        {
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
              import_react55.Scripts,
              {}
            ),
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
              import_react55.ScrollRestoration,
              {}
            ),
          ],
        }
      ),
    });
  },
  radix_index_default = Outlet2;

// app/routes/[form]._index.tsx
var form_index_exports = {};
__export(form_index_exports, {
  action: () => action3,
  default: () => form_index_default,
  links: () => links3,
  meta: () => meta3,
});
var import_server_runtime3 = require("@remix-run/server-runtime");
var import_react60 = require("@remix-run/react");

// ../../packages/sdk-components-react-remix/lib/components.js
var import_react56 = require("react"),
  import_react57 = require("@remix-run/react");
var import_jsx_runtime42 = require("react/jsx-runtime");
var import_react58 = require("react"),
  import_react59 = require("@remix-run/react");
var import_jsx_runtime43 = require("react/jsx-runtime"),
  wrapLinkComponent = (BaseLink3) => {
    let Component = (0, import_react56.forwardRef)((props, ref) => {
      let href = usePropUrl(getInstanceIdFromComponentProps(props), "href");
      if ((href == null ? void 0 : href.type) === "page") {
        let to = href.page.path === "" ? "/" : href.page.path,
          urlTo = new URL(to, "https://any-valid.url");
        return (
          (to = urlTo.pathname),
          href.hash !== void 0 &&
            ((urlTo.hash = encodeURIComponent(href.hash)),
            (to = `${urlTo.pathname}${urlTo.hash}`)),
          /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
            import_react57.NavLink,
            { ...props, to, ref }
          )
        );
      }
      let { prefetch, reloadDocument, replace, preventScrollReset, ...rest } =
        props;
      return /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(BaseLink3, {
        ...rest,
        ref,
      });
    });
    return (Component.displayName = BaseLink3.displayName), Component;
  },
  Link3 = wrapLinkComponent(Link),
  RichTextLink2 = wrapLinkComponent(RichTextLink),
  useOnFetchEnd = (fetcher, handler2) => {
    let latestHandler = (0, import_react58.useRef)(handler2);
    latestHandler.current = handler2;
    let prevFetcher = (0, import_react58.useRef)(fetcher);
    (0, import_react58.useEffect)(() => {
      prevFetcher.current.state !== fetcher.state &&
        fetcher.state === "idle" &&
        fetcher.data !== void 0 &&
        latestHandler.current(fetcher.data),
        (prevFetcher.current = fetcher);
    }, [fetcher]);
  },
  Form2 = (0, import_react58.forwardRef)(
    (
      {
        children,
        action: action5,
        method,
        state = "initial",
        onStateChange,
        ...rest
      },
      ref
    ) => {
      let fetcher = (0, import_react59.useFetcher)(),
        instanceId = getInstanceIdFromComponentProps(rest);
      return (
        useOnFetchEnd(fetcher, (data) => {
          let state2 =
            (data == null ? void 0 : data.success) === !0 ? "success" : "error";
          onStateChange == null || onStateChange(state2);
        }),
        /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(fetcher.Form, {
          ...rest,
          method: "post",
          "data-state": state,
          ref,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("input", {
              type: "hidden",
              name: formIdFieldName,
              value: instanceId,
            }),
            children,
          ],
        })
      );
    }
  );
Form2.displayName = "Form";

// app/__generated__/[form]._index.tsx
var components3 = new Map(
    Object.entries({
      Body,
      Box,
      Label,
      Input,
      Button,
      Heading,
      Form: Form2,
    })
  ),
  fontAssets3 = [],
  pageData3 = {
    build: {
      props: [
        [
          "OER1GvKVEE4CdEX1yrNe3",
          {
            id: "OER1GvKVEE4CdEX1yrNe3",
            instanceId: "isNSM3wXcnHFikwNPlEOL",
            name: "state",
            type: "dataSource",
            value: "KvfuNNCNslj7nAGsD69Fl",
          },
        ],
        [
          "RHHw5ACTgdDO751J8CgWB",
          {
            id: "RHHw5ACTgdDO751J8CgWB",
            instanceId: "isNSM3wXcnHFikwNPlEOL",
            name: "onStateChange",
            type: "action",
            value: [
              {
                type: "execute",
                args: ["state"],
                code: "$ws$dataSource$KvfuNNCNslj7nAGsD69Fl = state",
              },
            ],
          },
        ],
        [
          "Nyxr4ohgm_MNVtGpsGUn3",
          {
            id: "Nyxr4ohgm_MNVtGpsGUn3",
            instanceId: "a5YPRc19IJyhTrjjasA_R",
            name: "data-ws-show",
            type: "dataSource",
            value: "ezyBm7JGcDokMP8DZVzrD",
          },
        ],
        [
          "3tFb2mZpmJXG5txK78S9g",
          {
            id: "3tFb2mZpmJXG5txK78S9g",
            instanceId: "ydR5B_9uMS4PXFS76TmBh",
            name: "name",
            type: "string",
            value: "name",
          },
        ],
        [
          "7L7d7raf6WNI4_velVRy3",
          {
            id: "7L7d7raf6WNI4_velVRy3",
            instanceId: "TsqGP49hjgEW41ReCwrpZ",
            name: "name",
            type: "string",
            value: "email",
          },
        ],
        [
          "mtOiOi1u0WbNI09rVIS6T",
          {
            id: "mtOiOi1u0WbNI09rVIS6T",
            instanceId: "Gw-ta0R4FNFAGBTVRWKep",
            name: "data-ws-show",
            type: "dataSource",
            value: "_NmOL-v4PZhCcmj2vaDy_",
          },
        ],
        [
          "FTd65V4oEibesTqvAjKp0",
          {
            id: "FTd65V4oEibesTqvAjKp0",
            instanceId: "ewk_WKpu4syHLPABMmvUz",
            name: "data-ws-show",
            type: "dataSource",
            value: "VeQ-Tiya3whVhWHbJVHID",
          },
        ],
        [
          "vtsKrdjJH3YT89prj2K5T",
          {
            id: "vtsKrdjJH3YT89prj2K5T",
            instanceId: "-1RvizaBcVpHsjvnYxn1c",
            name: "state",
            type: "dataSource",
            value: "Ip0FRY7L24QrIMdtuMN5j",
          },
        ],
        [
          "E2n44qWixMBKO6m8kg1wp",
          {
            id: "E2n44qWixMBKO6m8kg1wp",
            instanceId: "-1RvizaBcVpHsjvnYxn1c",
            name: "onStateChange",
            type: "action",
            value: [
              {
                type: "execute",
                args: ["state"],
                code: "$ws$dataSource$Ip0FRY7L24QrIMdtuMN5j = state",
              },
            ],
          },
        ],
        [
          "K6DEgf4WkIDqdiuiwAS5E",
          {
            id: "K6DEgf4WkIDqdiuiwAS5E",
            instanceId: "qhnVrmYGlyrMZi3UzqSQA",
            name: "data-ws-show",
            type: "dataSource",
            value: "DUDDZM-QmYH_zBgbIODiu",
          },
        ],
        [
          "kWwLbf7GOo7-n4xOi8nZi",
          {
            id: "kWwLbf7GOo7-n4xOi8nZi",
            instanceId: "e035xi9fcwYtrn9La49Eh",
            name: "name",
            type: "string",
            value: "name",
          },
        ],
        [
          "dnX31oCvPdAPBQ1JqbnXr",
          {
            id: "dnX31oCvPdAPBQ1JqbnXr",
            instanceId: "dcHjdeW_HXPkyQlx3ZiL7",
            name: "name",
            type: "string",
            value: "email",
          },
        ],
        [
          "JbdIh72OZ8RnHXvYTsLRd",
          {
            id: "JbdIh72OZ8RnHXvYTsLRd",
            instanceId: "966cjxuqP_T99N27-mqWE",
            name: "data-ws-show",
            type: "dataSource",
            value: "F72Gu_6DnbW9CGp_747xa",
          },
        ],
        [
          "6UMH0WLK_fORElv3ffHCg",
          {
            id: "6UMH0WLK_fORElv3ffHCg",
            instanceId: "SYG5hhOz31xFJUN_v9zq6",
            name: "data-ws-show",
            type: "dataSource",
            value: "XhDObB85P8I_uDZ_CzGDt",
          },
        ],
        [
          "cpfLtqW20MR6y68u70Ta2",
          {
            id: "cpfLtqW20MR6y68u70Ta2",
            instanceId: "isNSM3wXcnHFikwNPlEOL",
            name: "method",
            type: "string",
            value: "get",
          },
        ],
        [
          "d5fWTvwp-dtCYQ0rleaQ0",
          {
            id: "d5fWTvwp-dtCYQ0rleaQ0",
            instanceId: "isNSM3wXcnHFikwNPlEOL",
            name: "action",
            type: "string",
            value: "/custom",
          },
        ],
        [
          "Oe1u15XWPgU6oBGnrmT5E",
          {
            id: "Oe1u15XWPgU6oBGnrmT5E",
            instanceId: "y4pceTmziuBRIDgUBQNLD",
            name: "tag",
            type: "string",
            value: "h3",
          },
        ],
        [
          "-QA9iF6dEVIibtNCO1EQp",
          {
            id: "-QA9iF6dEVIibtNCO1EQp",
            instanceId: "YdHHf4u3jrdbRIWpB_VfH",
            name: "tag",
            type: "string",
            value: "h3",
          },
        ],
      ],
      instances: [
        [
          "a-4nDFkaWy4px1fn38XWJ",
          {
            type: "instance",
            id: "a-4nDFkaWy4px1fn38XWJ",
            component: "Body",
            children: [
              { type: "id", value: "-1RvizaBcVpHsjvnYxn1c" },
              { type: "id", value: "isNSM3wXcnHFikwNPlEOL" },
            ],
          },
        ],
        [
          "isNSM3wXcnHFikwNPlEOL",
          {
            type: "instance",
            id: "isNSM3wXcnHFikwNPlEOL",
            component: "Form",
            label: "Form with custom props",
            children: [
              { type: "id", value: "a5YPRc19IJyhTrjjasA_R" },
              { type: "id", value: "Gw-ta0R4FNFAGBTVRWKep" },
              { type: "id", value: "ewk_WKpu4syHLPABMmvUz" },
            ],
          },
        ],
        [
          "a5YPRc19IJyhTrjjasA_R",
          {
            type: "instance",
            id: "a5YPRc19IJyhTrjjasA_R",
            component: "Box",
            label: "Form Content",
            children: [
              { type: "id", value: "y4pceTmziuBRIDgUBQNLD" },
              { type: "id", value: "_gLjS0enBOV8KW9Ykz_es" },
              { type: "id", value: "ydR5B_9uMS4PXFS76TmBh" },
              { type: "id", value: "8RU1FyL2QRyqhNUKELGrb" },
              { type: "id", value: "TsqGP49hjgEW41ReCwrpZ" },
              { type: "id", value: "5GWjwVdapuGdn443GIKDW" },
            ],
          },
        ],
        [
          "_gLjS0enBOV8KW9Ykz_es",
          {
            type: "instance",
            id: "_gLjS0enBOV8KW9Ykz_es",
            component: "Label",
            children: [{ type: "text", value: "Name" }],
          },
        ],
        [
          "ydR5B_9uMS4PXFS76TmBh",
          {
            type: "instance",
            id: "ydR5B_9uMS4PXFS76TmBh",
            component: "Input",
            children: [],
          },
        ],
        [
          "8RU1FyL2QRyqhNUKELGrb",
          {
            type: "instance",
            id: "8RU1FyL2QRyqhNUKELGrb",
            component: "Label",
            children: [{ type: "text", value: "Email" }],
          },
        ],
        [
          "TsqGP49hjgEW41ReCwrpZ",
          {
            type: "instance",
            id: "TsqGP49hjgEW41ReCwrpZ",
            component: "Input",
            children: [],
          },
        ],
        [
          "5GWjwVdapuGdn443GIKDW",
          {
            type: "instance",
            id: "5GWjwVdapuGdn443GIKDW",
            component: "Button",
            children: [{ type: "text", value: "Submit" }],
          },
        ],
        [
          "Gw-ta0R4FNFAGBTVRWKep",
          {
            type: "instance",
            id: "Gw-ta0R4FNFAGBTVRWKep",
            component: "Box",
            label: "Success Message",
            children: [
              { type: "text", value: "Thank you for getting in touch!" },
            ],
          },
        ],
        [
          "ewk_WKpu4syHLPABMmvUz",
          {
            type: "instance",
            id: "ewk_WKpu4syHLPABMmvUz",
            component: "Box",
            label: "Error Message",
            children: [{ type: "text", value: "Sorry, something went wrong." }],
          },
        ],
        [
          "-1RvizaBcVpHsjvnYxn1c",
          {
            type: "instance",
            id: "-1RvizaBcVpHsjvnYxn1c",
            component: "Form",
            label: "Default form",
            children: [
              { type: "id", value: "qhnVrmYGlyrMZi3UzqSQA" },
              { type: "id", value: "966cjxuqP_T99N27-mqWE" },
              { type: "id", value: "SYG5hhOz31xFJUN_v9zq6" },
            ],
          },
        ],
        [
          "qhnVrmYGlyrMZi3UzqSQA",
          {
            type: "instance",
            id: "qhnVrmYGlyrMZi3UzqSQA",
            component: "Box",
            label: "Form Content",
            children: [
              { type: "id", value: "YdHHf4u3jrdbRIWpB_VfH" },
              { type: "id", value: "A0RNI1WVwOGGDbwYnoZia" },
              { type: "id", value: "e035xi9fcwYtrn9La49Eh" },
              { type: "id", value: "LImtuVzw5R9yQsG4faiGV" },
              { type: "id", value: "dcHjdeW_HXPkyQlx3ZiL7" },
              { type: "id", value: "ZAtG6JgK4sbTnOAZlp2rU" },
            ],
          },
        ],
        [
          "A0RNI1WVwOGGDbwYnoZia",
          {
            type: "instance",
            id: "A0RNI1WVwOGGDbwYnoZia",
            component: "Label",
            children: [{ type: "text", value: "Name" }],
          },
        ],
        [
          "e035xi9fcwYtrn9La49Eh",
          {
            type: "instance",
            id: "e035xi9fcwYtrn9La49Eh",
            component: "Input",
            children: [],
          },
        ],
        [
          "LImtuVzw5R9yQsG4faiGV",
          {
            type: "instance",
            id: "LImtuVzw5R9yQsG4faiGV",
            component: "Label",
            children: [{ type: "text", value: "Email" }],
          },
        ],
        [
          "dcHjdeW_HXPkyQlx3ZiL7",
          {
            type: "instance",
            id: "dcHjdeW_HXPkyQlx3ZiL7",
            component: "Input",
            children: [],
          },
        ],
        [
          "ZAtG6JgK4sbTnOAZlp2rU",
          {
            type: "instance",
            id: "ZAtG6JgK4sbTnOAZlp2rU",
            component: "Button",
            children: [{ type: "text", value: "Submit" }],
          },
        ],
        [
          "966cjxuqP_T99N27-mqWE",
          {
            type: "instance",
            id: "966cjxuqP_T99N27-mqWE",
            component: "Box",
            label: "Success Message",
            children: [
              { type: "text", value: "Thank you for getting in touch!" },
            ],
          },
        ],
        [
          "SYG5hhOz31xFJUN_v9zq6",
          {
            type: "instance",
            id: "SYG5hhOz31xFJUN_v9zq6",
            component: "Box",
            label: "Error Message",
            children: [{ type: "text", value: "Sorry, something went wrong." }],
          },
        ],
        [
          "y4pceTmziuBRIDgUBQNLD",
          {
            type: "instance",
            id: "y4pceTmziuBRIDgUBQNLD",
            component: "Heading",
            children: [
              { type: "text", value: "Form with custom action and method" },
            ],
          },
        ],
        [
          "YdHHf4u3jrdbRIWpB_VfH",
          {
            type: "instance",
            id: "YdHHf4u3jrdbRIWpB_VfH",
            component: "Heading",
            children: [{ type: "text", value: "Default form" }],
          },
        ],
      ],
      dataSources: [
        [
          "KvfuNNCNslj7nAGsD69Fl",
          {
            type: "variable",
            id: "KvfuNNCNslj7nAGsD69Fl",
            scopeInstanceId: "isNSM3wXcnHFikwNPlEOL",
            name: "formState",
            value: { type: "string", value: "initial" },
          },
        ],
        [
          "ezyBm7JGcDokMP8DZVzrD",
          {
            type: "expression",
            id: "ezyBm7JGcDokMP8DZVzrD",
            scopeInstanceId: "a5YPRc19IJyhTrjjasA_R",
            name: "formInitial",
            code: "$ws$dataSource$KvfuNNCNslj7nAGsD69Fl === 'initial' || $ws$dataSource$KvfuNNCNslj7nAGsD69Fl === 'error'",
          },
        ],
        [
          "_NmOL-v4PZhCcmj2vaDy_",
          {
            type: "expression",
            id: "_NmOL-v4PZhCcmj2vaDy_",
            scopeInstanceId: "Gw-ta0R4FNFAGBTVRWKep",
            name: "formSuccess",
            code: "$ws$dataSource$KvfuNNCNslj7nAGsD69Fl === 'success'",
          },
        ],
        [
          "VeQ-Tiya3whVhWHbJVHID",
          {
            type: "expression",
            id: "VeQ-Tiya3whVhWHbJVHID",
            scopeInstanceId: "ewk_WKpu4syHLPABMmvUz",
            name: "formError",
            code: "$ws$dataSource$KvfuNNCNslj7nAGsD69Fl === 'error'",
          },
        ],
        [
          "Ip0FRY7L24QrIMdtuMN5j",
          {
            type: "variable",
            id: "Ip0FRY7L24QrIMdtuMN5j",
            scopeInstanceId: "-1RvizaBcVpHsjvnYxn1c",
            name: "formState",
            value: { type: "string", value: "initial" },
          },
        ],
        [
          "DUDDZM-QmYH_zBgbIODiu",
          {
            type: "expression",
            id: "DUDDZM-QmYH_zBgbIODiu",
            scopeInstanceId: "qhnVrmYGlyrMZi3UzqSQA",
            name: "formInitial",
            code: "$ws$dataSource$Ip0FRY7L24QrIMdtuMN5j === 'initial' || $ws$dataSource$Ip0FRY7L24QrIMdtuMN5j === 'error'",
          },
        ],
        [
          "F72Gu_6DnbW9CGp_747xa",
          {
            type: "expression",
            id: "F72Gu_6DnbW9CGp_747xa",
            scopeInstanceId: "966cjxuqP_T99N27-mqWE",
            name: "formSuccess",
            code: "$ws$dataSource$Ip0FRY7L24QrIMdtuMN5j === 'success'",
          },
        ],
        [
          "XhDObB85P8I_uDZ_CzGDt",
          {
            type: "expression",
            id: "XhDObB85P8I_uDZ_CzGDt",
            scopeInstanceId: "SYG5hhOz31xFJUN_v9zq6",
            name: "formError",
            code: "$ws$dataSource$Ip0FRY7L24QrIMdtuMN5j === 'error'",
          },
        ],
      ],
    },
    pages: [
      {
        id: "7Db64ZXgYiRqKSQNR-qTQ",
        name: "Home",
        title: "Home",
        meta: {},
        rootInstanceId: "On9cvWCxr5rdZtY9O1Bv0",
        path: "",
      },
      {
        id: "xfvB4UThQXmQ_OubPYrkg",
        name: "radix",
        title: "radix",
        meta: { description: "" },
        rootInstanceId: "uKWGyE9JY3cPwY-xI9vk6",
        path: "/radix",
      },
      {
        id: "szYLvBduHPmbtqQKCDY0b",
        name: "RouteWithSymbols",
        title: "RouteWithSymbols",
        meta: { description: "" },
        rootInstanceId: "EDEfpMPRqDejthtwkH7ws",
        path: "/_route_with_symbols_",
      },
      {
        id: "U1tRJl2ERr8_OFe0g9cN_",
        name: "form",
        title: "form",
        meta: { description: "" },
        rootInstanceId: "a-4nDFkaWy4px1fn38XWJ",
        path: "/form",
      },
    ],
    page: {
      id: "U1tRJl2ERr8_OFe0g9cN_",
      name: "form",
      title: "form",
      meta: { description: "" },
      rootInstanceId: "a-4nDFkaWy4px1fn38XWJ",
      path: "/form",
    },
    assets: [
      {
        id: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
        name: "small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp",
        description: null,
        projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
        size: 2906,
        type: "image",
        format: "webp",
        createdAt: "2023-09-12T09:44:22.120Z",
        meta: { width: 100, height: 100 },
      },
      {
        id: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
        name: "_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg",
        description: null,
        projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
        size: 210614,
        type: "image",
        format: "jpeg",
        createdAt: "2023-09-06T11:28:43.031Z",
        meta: { width: 1024, height: 1024 },
      },
    ],
  },
  user3 = {
    email: "hello@webstudio.is",
  },
  projectId3 = "cddc1d44-af37-4cb6-a430-d300cf6f932d",
  indexesWithinAncestors3 = /* @__PURE__ */ new Map([]),
  getDataSourcesLogic3 = (_getVariable, _setVariable) => {
    let formState = _getVariable("KvfuNNCNslj7nAGsD69Fl") ?? "initial",
      set$formState = (value) => _setVariable("KvfuNNCNslj7nAGsD69Fl", value),
      formState_1 = _getVariable("Ip0FRY7L24QrIMdtuMN5j") ?? "initial",
      set$formState_1 = (value) => _setVariable("Ip0FRY7L24QrIMdtuMN5j", value),
      formInitial = formState === "initial" || formState === "error",
      formSuccess = formState === "success",
      formError = formState === "error",
      formInitial_1 = formState_1 === "initial" || formState_1 === "error",
      formSuccess_1 = formState_1 === "success",
      formError_1 = formState_1 === "error",
      onStateChange = (state) => {
        (formState = state), set$formState(formState);
      },
      onStateChange_1 = (state) => {
        (formState_1 = state), set$formState_1(formState_1);
      },
      _output = /* @__PURE__ */ new Map();
    return (
      _output.set("KvfuNNCNslj7nAGsD69Fl", formState),
      _output.set("ezyBm7JGcDokMP8DZVzrD", formInitial),
      _output.set("_NmOL-v4PZhCcmj2vaDy_", formSuccess),
      _output.set("VeQ-Tiya3whVhWHbJVHID", formError),
      _output.set("Ip0FRY7L24QrIMdtuMN5j", formState_1),
      _output.set("DUDDZM-QmYH_zBgbIODiu", formInitial_1),
      _output.set("F72Gu_6DnbW9CGp_747xa", formSuccess_1),
      _output.set("XhDObB85P8I_uDZ_CzGDt", formError_1),
      _output.set("RHHw5ACTgdDO751J8CgWB", onStateChange),
      _output.set("E2n44qWixMBKO6m8kg1wp", onStateChange_1),
      _output
    );
  },
  formsProperties3 = /* @__PURE__ */ new Map([
    ["isNSM3wXcnHFikwNPlEOL", { method: "get", action: "/custom" }],
  ]),
  utils3 = {
    indexesWithinAncestors: indexesWithinAncestors3,
    getDataSourcesLogic: getDataSourcesLogic3,
  };

// app/routes/[form]._index.tsx
var import_jsx_runtime44 = require("react/jsx-runtime"),
  meta3 = () => {
    let { page } = pageData3;
    return [
      {
        title: (page == null ? void 0 : page.title) || "Webstudio",
        ...(page == null ? void 0 : page.meta),
      },
    ];
  },
  links3 = () => {
    let result = [];
    result.push({
      rel: "stylesheet",
      href: generated_default,
    });
    for (let asset of fontAssets3)
      asset.type === "font" &&
        result.push({
          rel: "preload",
          href: assetBaseUrl + asset.name,
          as: "font",
          crossOrigin: "anonymous",
          // @todo add mimeType
          // type: asset.mimeType,
        });
    return result;
  },
  getRequestHost3 = (request) =>
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "",
  getMethod3 = (value) => {
    if (value === void 0) return "post";
    switch (value.toLowerCase()) {
      case "get":
        return "get";
      default:
        return "post";
    }
  },
  action3 = async ({ request, context }) => {
    var _a7;
    let formData = await request.formData(),
      formId = getFormId(formData);
    if (formId === void 0)
      throw (0, import_server_runtime3.json)("Form not found", { status: 404 });
    let formProperties = formsProperties3.get(formId),
      { action: action5, method } = formProperties ?? {},
      email = (_a7 = user3) == null ? void 0 : _a7.email;
    if (email == null) return { success: !1 };
    let pageUrl;
    try {
      (pageUrl = new URL(request.url)),
        (pageUrl.host = getRequestHost3(request));
    } catch {
      return { success: !1 };
    }
    if (action5 !== void 0)
      try {
        new URL(action5);
      } catch {
        return (0, import_server_runtime3.json)(
          {
            success: !1,
            error: "Invalid action URL, must be valid http/https protocol",
          },
          { status: 200 }
        );
      }
    let formInfo = {
      formData,
      projectId: projectId3,
      action: action5 ?? null,
      method: getMethod3(method),
      pageUrl: pageUrl.toString(),
      toEmail: email,
      fromEmail: pageUrl.hostname + "@webstudio.email",
    };
    return await n8nHandler({
      formInfo,
      hookUrl: context.N8N_FORM_EMAIL_HOOK,
    });
  },
  Outlet3 = () => {
    let pagesCanvasData = pageData3,
      page = pagesCanvasData.page;
    if (page === void 0)
      throw (0, import_server_runtime3.json)("Page not found", {
        status: 404,
      });
    let params = {
        assetBaseUrl,
        imageBaseUrl,
      },
      data = {
        build: pagesCanvasData.build,
        assets: pagesCanvasData.assets,
        page,
        pages: pagesCanvasData.pages,
        params,
      };
    return /* @__PURE__ */ (0, import_jsx_runtime44.jsx)(InstanceRoot, {
      imageLoader,
      data,
      components: components3,
      utils: utils3,
      scripts: /* @__PURE__ */ (0, import_jsx_runtime44.jsxs)(
        import_jsx_runtime44.Fragment,
        {
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime44.jsx)(
              import_react60.Scripts,
              {}
            ),
            /* @__PURE__ */ (0, import_jsx_runtime44.jsx)(
              import_react60.ScrollRestoration,
              {}
            ),
          ],
        }
      ),
    });
  },
  form_index_default = Outlet3;

// app/routes/_index.tsx
var index_exports = {};
__export(index_exports, {
  action: () => action4,
  default: () => index_default,
  links: () => links4,
  meta: () => meta4,
});
var import_server_runtime4 = require("@remix-run/server-runtime");
var import_react61 = require("@remix-run/react");

// app/__generated__/_index.tsx
var components4 = new Map(
    Object.entries({
      Body,
      Heading,
      Box,
      Paragraph,
      Image: Image2,
      Link: Link3,
    })
  ),
  fontAssets4 = [],
  pageData4 = {
    build: {
      props: [
        [
          "rTRZFZEd03RBH4gUWj9LW",
          {
            id: "rTRZFZEd03RBH4gUWj9LW",
            instanceId: "pX1ovPI7NdC0HRjkw6Kpw",
            name: "src",
            type: "asset",
            value: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
          },
        ],
        [
          "SYK4hpLQ9tHnESKDtPvI9",
          {
            id: "SYK4hpLQ9tHnESKDtPvI9",
            instanceId: "l9AI_pShC-BH4ibxK6kNT",
            name: "href",
            type: "string",
            value: "https://github.com/",
          },
        ],
        [
          "tUn-hTQ0dKjsaRZ4q3m21",
          {
            id: "tUn-hTQ0dKjsaRZ4q3m21",
            instanceId: "9I4GRU1sev48hREkQcKQ-",
            name: "href",
            type: "page",
            value: "szYLvBduHPmbtqQKCDY0b",
          },
        ],
      ],
      instances: [
        [
          "On9cvWCxr5rdZtY9O1Bv0",
          {
            type: "instance",
            id: "On9cvWCxr5rdZtY9O1Bv0",
            component: "Body",
            children: [
              { type: "id", value: "nVMWvMsaLCcb0o1wuNQgg" },
              { type: "id", value: "f0kF-WmL7DQg7MSyRvqY1" },
            ],
          },
        ],
        [
          "nVMWvMsaLCcb0o1wuNQgg",
          {
            type: "instance",
            id: "nVMWvMsaLCcb0o1wuNQgg",
            component: "Heading",
            children: [
              {
                type: "text",
                value: "DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES",
              },
            ],
          },
        ],
        [
          "f0kF-WmL7DQg7MSyRvqY1",
          {
            type: "instance",
            id: "f0kF-WmL7DQg7MSyRvqY1",
            component: "Box",
            children: [
              { type: "id", value: "5XDbqPrZDeCwq4YJ3CHsc" },
              { type: "id", value: "qPnkiFGDj8dITWb1kmpGl" },
            ],
          },
        ],
        [
          "5XDbqPrZDeCwq4YJ3CHsc",
          {
            type: "instance",
            id: "5XDbqPrZDeCwq4YJ3CHsc",
            component: "Box",
            children: [
              { type: "id", value: "oLXYe1UQiVMhVnZGvJSMr" },
              { type: "id", value: "p34JHWcU6UNrd9FVnY80Q" },
              { type: "id", value: "l9AI_pShC-BH4ibxK6kNT" },
              { type: "id", value: "82HYqzxZeahPxSDFNWem5" },
              { type: "id", value: "9I4GRU1sev48hREkQcKQ-" },
            ],
          },
        ],
        [
          "qPnkiFGDj8dITWb1kmpGl",
          {
            type: "instance",
            id: "qPnkiFGDj8dITWb1kmpGl",
            component: "Box",
            children: [{ type: "id", value: "pX1ovPI7NdC0HRjkw6Kpw" }],
          },
        ],
        [
          "oLXYe1UQiVMhVnZGvJSMr",
          {
            type: "instance",
            id: "oLXYe1UQiVMhVnZGvJSMr",
            component: "Heading",
            children: [{ type: "text", value: "Heading" }],
          },
        ],
        [
          "p34JHWcU6UNrd9FVnY80Q",
          {
            type: "instance",
            id: "p34JHWcU6UNrd9FVnY80Q",
            component: "Paragraph",
            children: [
              {
                type: "text",
                value:
                  "a little kitten painted in black and white gouache with a thick brush",
              },
            ],
          },
        ],
        [
          "pX1ovPI7NdC0HRjkw6Kpw",
          {
            type: "instance",
            id: "pX1ovPI7NdC0HRjkw6Kpw",
            component: "Image",
            children: [],
          },
        ],
        [
          "l9AI_pShC-BH4ibxK6kNT",
          {
            type: "instance",
            id: "l9AI_pShC-BH4ibxK6kNT",
            component: "Link",
            children: [
              { type: "text", value: "Click here to adore more kittens" },
            ],
          },
        ],
        [
          "9I4GRU1sev48hREkQcKQ-",
          {
            type: "instance",
            id: "9I4GRU1sev48hREkQcKQ-",
            component: "Link",
            children: [{ type: "text", value: "Symbols in path" }],
          },
        ],
        [
          "82HYqzxZeahPxSDFNWem5",
          {
            type: "instance",
            id: "82HYqzxZeahPxSDFNWem5",
            component: "Box",
            children: [],
          },
        ],
      ],
      dataSources: [],
    },
    pages: [
      {
        id: "7Db64ZXgYiRqKSQNR-qTQ",
        name: "Home",
        title: "Home",
        meta: {},
        rootInstanceId: "On9cvWCxr5rdZtY9O1Bv0",
        path: "",
      },
      {
        id: "xfvB4UThQXmQ_OubPYrkg",
        name: "radix",
        title: "radix",
        meta: { description: "" },
        rootInstanceId: "uKWGyE9JY3cPwY-xI9vk6",
        path: "/radix",
      },
      {
        id: "szYLvBduHPmbtqQKCDY0b",
        name: "RouteWithSymbols",
        title: "RouteWithSymbols",
        meta: { description: "" },
        rootInstanceId: "EDEfpMPRqDejthtwkH7ws",
        path: "/_route_with_symbols_",
      },
      {
        id: "U1tRJl2ERr8_OFe0g9cN_",
        name: "form",
        title: "form",
        meta: { description: "" },
        rootInstanceId: "a-4nDFkaWy4px1fn38XWJ",
        path: "/form",
      },
    ],
    page: {
      id: "7Db64ZXgYiRqKSQNR-qTQ",
      name: "Home",
      title: "Home",
      meta: {},
      rootInstanceId: "On9cvWCxr5rdZtY9O1Bv0",
      path: "",
    },
    assets: [
      {
        id: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
        name: "small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp",
        description: null,
        projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
        size: 2906,
        type: "image",
        format: "webp",
        createdAt: "2023-09-12T09:44:22.120Z",
        meta: { width: 100, height: 100 },
      },
      {
        id: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
        name: "_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg",
        description: null,
        projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
        size: 210614,
        type: "image",
        format: "jpeg",
        createdAt: "2023-09-06T11:28:43.031Z",
        meta: { width: 1024, height: 1024 },
      },
    ],
  },
  user4 = {
    email: "hello@webstudio.is",
  },
  projectId4 = "cddc1d44-af37-4cb6-a430-d300cf6f932d",
  indexesWithinAncestors4 = /* @__PURE__ */ new Map([]),
  getDataSourcesLogic4 = (_getVariable, _setVariable) =>
    /* @__PURE__ */ new Map(),
  formsProperties4 = /* @__PURE__ */ new Map([]),
  utils4 = {
    indexesWithinAncestors: indexesWithinAncestors4,
    getDataSourcesLogic: getDataSourcesLogic4,
  };

// app/routes/_index.tsx
var import_jsx_runtime45 = require("react/jsx-runtime"),
  meta4 = () => {
    let { page } = pageData4;
    return [
      {
        title: (page == null ? void 0 : page.title) || "Webstudio",
        ...(page == null ? void 0 : page.meta),
      },
    ];
  },
  links4 = () => {
    let result = [];
    result.push({
      rel: "stylesheet",
      href: generated_default,
    });
    for (let asset of fontAssets4)
      asset.type === "font" &&
        result.push({
          rel: "preload",
          href: assetBaseUrl + asset.name,
          as: "font",
          crossOrigin: "anonymous",
          // @todo add mimeType
          // type: asset.mimeType,
        });
    return result;
  },
  getRequestHost4 = (request) =>
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "",
  getMethod4 = (value) => {
    if (value === void 0) return "post";
    switch (value.toLowerCase()) {
      case "get":
        return "get";
      default:
        return "post";
    }
  },
  action4 = async ({ request, context }) => {
    var _a7;
    let formData = await request.formData(),
      formId = getFormId(formData);
    if (formId === void 0)
      throw (0, import_server_runtime4.json)("Form not found", { status: 404 });
    let formProperties = formsProperties4.get(formId),
      { action: action5, method } = formProperties ?? {},
      email = (_a7 = user4) == null ? void 0 : _a7.email;
    if (email == null) return { success: !1 };
    let pageUrl;
    try {
      (pageUrl = new URL(request.url)),
        (pageUrl.host = getRequestHost4(request));
    } catch {
      return { success: !1 };
    }
    if (action5 !== void 0)
      try {
        new URL(action5);
      } catch {
        return (0, import_server_runtime4.json)(
          {
            success: !1,
            error: "Invalid action URL, must be valid http/https protocol",
          },
          { status: 200 }
        );
      }
    let formInfo = {
      formData,
      projectId: projectId4,
      action: action5 ?? null,
      method: getMethod4(method),
      pageUrl: pageUrl.toString(),
      toEmail: email,
      fromEmail: pageUrl.hostname + "@webstudio.email",
    };
    return await n8nHandler({
      formInfo,
      hookUrl: context.N8N_FORM_EMAIL_HOOK,
    });
  },
  Outlet4 = () => {
    let pagesCanvasData = pageData4,
      page = pagesCanvasData.page;
    if (page === void 0)
      throw (0, import_server_runtime4.json)("Page not found", {
        status: 404,
      });
    let params = {
        assetBaseUrl,
        imageBaseUrl,
      },
      data = {
        build: pagesCanvasData.build,
        assets: pagesCanvasData.assets,
        page,
        pages: pagesCanvasData.pages,
        params,
      };
    return /* @__PURE__ */ (0, import_jsx_runtime45.jsx)(InstanceRoot, {
      imageLoader,
      data,
      components: components4,
      utils: utils4,
      scripts: /* @__PURE__ */ (0, import_jsx_runtime45.jsxs)(
        import_jsx_runtime45.Fragment,
        {
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime45.jsx)(
              import_react61.Scripts,
              {}
            ),
            /* @__PURE__ */ (0, import_jsx_runtime45.jsx)(
              import_react61.ScrollRestoration,
              {}
            ),
          ],
        }
      ),
    });
  },
  index_default = Outlet4;

// server-assets-manifest:@remix-run/dev/assets-manifest
var assets_manifest_default = {
  entry: {
    module: "/build/entry.client-TPZSZGBF.js",
    imports: [
      "/build/_shared/chunk-LAENJLUA.js",
      "/build/_shared/chunk-PECUTBBM.js",
    ],
  },
  routes: {
    root: {
      id: "root",
      parentId: void 0,
      path: "",
      index: void 0,
      caseSensitive: void 0,
      module: "/build/root-MWARCXAG.js",
      imports: ["/build/_shared/chunk-Y6EBYKLY.js"],
      hasAction: !1,
      hasLoader: !1,
      hasCatchBoundary: !1,
      hasErrorBoundary: !1,
    },
    "routes/[_route_with_symbols_]._index": {
      id: "routes/[_route_with_symbols_]._index",
      parentId: "root",
      path: "_route_with_symbols_",
      index: !0,
      caseSensitive: void 0,
      module: "/build/routes/[_route_with_symbols_]._index-BVH57FZG.js",
      imports: ["/build/_shared/chunk-LD6KJIH6.js"],
      hasAction: !0,
      hasLoader: !1,
      hasCatchBoundary: !1,
      hasErrorBoundary: !1,
    },
    "routes/[form]._index": {
      id: "routes/[form]._index",
      parentId: "root",
      path: "form",
      index: !0,
      caseSensitive: void 0,
      module: "/build/routes/[form]._index-UKEURDXV.js",
      imports: [
        "/build/_shared/chunk-IIMDVTQ4.js",
        "/build/_shared/chunk-LD6KJIH6.js",
      ],
      hasAction: !0,
      hasLoader: !1,
      hasCatchBoundary: !1,
      hasErrorBoundary: !1,
    },
    "routes/[radix]._index": {
      id: "routes/[radix]._index",
      parentId: "root",
      path: "radix",
      index: !0,
      caseSensitive: void 0,
      module: "/build/routes/[radix]._index-GYTLP6S5.js",
      imports: ["/build/_shared/chunk-LD6KJIH6.js"],
      hasAction: !0,
      hasLoader: !1,
      hasCatchBoundary: !1,
      hasErrorBoundary: !1,
    },
    "routes/_index": {
      id: "routes/_index",
      parentId: "root",
      path: void 0,
      index: !0,
      caseSensitive: void 0,
      module: "/build/routes/_index-SUTHIZUM.js",
      imports: [
        "/build/_shared/chunk-IIMDVTQ4.js",
        "/build/_shared/chunk-LD6KJIH6.js",
      ],
      hasAction: !0,
      hasLoader: !1,
      hasCatchBoundary: !1,
      hasErrorBoundary: !1,
    },
  },
  version: "50de6405",
  hmr: void 0,
  url: "/build/manifest-50DE6405.js",
};

// server-entry-module:@remix-run/dev/server-build
var assetsBuildDirectory = "public/build",
  future = {
    v2_dev: !0,
    unstable_postcss: !1,
    unstable_tailwind: !1,
    v2_errorBoundary: !0,
    v2_headers: !0,
    v2_meta: !0,
    v2_normalizeFormMethod: !0,
    v2_routeConvention: !0,
  },
  publicPath = "/build/",
  entry = { module: entry_server_exports },
  routes = {
    root: {
      id: "root",
      parentId: void 0,
      path: "",
      index: void 0,
      caseSensitive: void 0,
      module: root_exports,
    },
    "routes/[_route_with_symbols_]._index": {
      id: "routes/[_route_with_symbols_]._index",
      parentId: "root",
      path: "_route_with_symbols_",
      index: !0,
      caseSensitive: void 0,
      module: route_with_symbols_index_exports,
    },
    "routes/[radix]._index": {
      id: "routes/[radix]._index",
      parentId: "root",
      path: "radix",
      index: !0,
      caseSensitive: void 0,
      module: radix_index_exports,
    },
    "routes/[form]._index": {
      id: "routes/[form]._index",
      parentId: "root",
      path: "form",
      index: !0,
      caseSensitive: void 0,
      module: form_index_exports,
    },
    "routes/_index": {
      id: "routes/_index",
      parentId: "root",
      path: void 0,
      index: !0,
      caseSensitive: void 0,
      module: index_exports,
    },
  };

// server.js
var handler = (0, import_remix_adapter.createRequestHandler)({
  build: server_build_exports,
  mode: "production",
});
// Annotate the CommonJS export names for ESM import in node:
0 &&
  (module.exports = {
    handler,
  });
