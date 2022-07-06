var __create = Object.create;
var __defProp = Object.defineProperty, __defProps = Object.defineProperties, __getOwnPropDesc = Object.getOwnPropertyDescriptor, __getOwnPropDescs = Object.getOwnPropertyDescriptors, __getOwnPropNames = Object.getOwnPropertyNames, __getOwnPropSymbols = Object.getOwnPropertySymbols, __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty, __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value, __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b))
      __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
  return a;
}, __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b)), __markAsModule = (target) => __defProp(target, "__esModule", { value: !0 });
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    __hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0 && (target[prop] = source[prop]);
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source))
      exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop) && (target[prop] = source[prop]);
  return target;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: !0 });
}, __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 == "object" || typeof module2 == "function")
    for (let key of __getOwnPropNames(module2))
      !__hasOwnProp.call(target, key) && (copyDefault || key !== "default") && __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  return target;
}, __toESM = (module2, isNodeMode) => __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", !isNodeMode && module2 && module2.__esModule ? { get: () => module2.default, enumerable: !0 } : { value: module2, enumerable: !0 })), module2), __toCommonJS = /* @__PURE__ */ ((cache) => (module2, temp) => cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp))(typeof WeakMap != "undefined" ? /* @__PURE__ */ new WeakMap() : 0);

// <stdin>
var stdin_exports = {};
__export(stdin_exports, {
  assets: () => assets_manifest_default,
  entry: () => entry,
  routes: () => routes
});

// ../../node_modules/@remix-run/dev/dist/compiler/shims/react.ts
var React = __toESM(require("react"));

// app/entry.server.tsx
var entry_server_exports = {};
__export(entry_server_exports, {
  default: () => handleRequest
});
var import_server = require("react-dom/server"), import_react16 = require("@remix-run/react");

// app/critical-css.ts
var import_sdk = require("@webstudio-is/sdk");

// app/shared/design-system/stitches.config.ts
var import_react = require("@stitches/react"), import_colors = require("@radix-ui/colors"), {
  styled,
  css,
  theme,
  createTheme,
  getCssText,
  globalCss,
  keyframes,
  config,
  reset
} = (0, import_react.createStitches)({
  theme: {
    colors: __spreadProps(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, import_colors.gray), import_colors.mauve), import_colors.slate), import_colors.sage), import_colors.olive), import_colors.sand), import_colors.tomato), import_colors.red), import_colors.crimson), import_colors.pink), import_colors.plum), import_colors.purple), import_colors.violet), import_colors.indigo), import_colors.blue), import_colors.sky), import_colors.mint), import_colors.cyan), import_colors.teal), import_colors.green), import_colors.grass), import_colors.lime), import_colors.yellow), import_colors.amber), import_colors.orange), import_colors.brown), import_colors.bronze), import_colors.gold), import_colors.grayA), import_colors.mauveA), import_colors.slateA), import_colors.sageA), import_colors.oliveA), import_colors.sandA), import_colors.tomatoA), import_colors.redA), import_colors.crimsonA), import_colors.pinkA), import_colors.plumA), import_colors.purpleA), import_colors.violetA), import_colors.indigoA), import_colors.blueA), import_colors.skyA), import_colors.mintA), import_colors.cyanA), import_colors.tealA), import_colors.greenA), import_colors.grassA), import_colors.limeA), import_colors.yellowA), import_colors.amberA), import_colors.orangeA), import_colors.brownA), import_colors.bronzeA), import_colors.goldA), import_colors.whiteA), import_colors.blackA), {
      hiContrast: "$slate12",
      loContrast: "$slate1",
      muted: "$slate6",
      primary: "$blue12",
      canvas: "hsl(0 0% 93%)",
      panel: "white",
      transparentPanel: "hsl(0 0% 0% / 97%)",
      shadowLight: "hsl(206 22% 7% / 35%)",
      shadowDark: "hsl(206 22% 7% / 20%)",
      background: "$slate1",
      text: "$slate12"
    }),
    fonts: {
      sans: "Inter, -apple-system, system-ui, sans-serif",
      mono: "S\xF6hne Mono, menlo, monospace"
    },
    space: {
      1: "5px",
      2: "10px",
      3: "15px",
      4: "20px",
      5: "25px",
      6: "35px",
      7: "45px",
      8: "65px",
      9: "80px"
    },
    sizes: {
      1: "5px",
      2: "10px",
      3: "15px",
      4: "20px",
      5: "25px",
      6: "35px",
      7: "45px",
      8: "65px",
      9: "80px"
    },
    fontSizes: {
      1: "12px",
      2: "13px",
      3: "15px",
      4: "17px",
      5: "19px",
      6: "21px",
      7: "27px",
      8: "35px",
      9: "59px"
    },
    radii: {
      1: "4px",
      2: "6px",
      3: "8px",
      4: "12px",
      round: "50%",
      pill: "9999px"
    },
    zIndices: {
      1: "100",
      2: "200",
      3: "300",
      4: "400",
      max: "999"
    }
  },
  media: {
    bp1: "(min-width: 520px)",
    bp2: "(min-width: 900px)",
    bp3: "(min-width: 1200px)",
    bp4: "(min-width: 1800px)",
    motion: "(prefers-reduced-motion)",
    hover: "(any-hover: hover)",
    dark: "(prefers-color-scheme: dark)",
    light: "(prefers-color-scheme: light)"
  },
  utils: {
    p: (value) => ({
      padding: value
    }),
    pt: (value) => ({
      paddingTop: value
    }),
    pr: (value) => ({
      paddingRight: value
    }),
    pb: (value) => ({
      paddingBottom: value
    }),
    pl: (value) => ({
      paddingLeft: value
    }),
    px: (value) => ({
      paddingLeft: value,
      paddingRight: value
    }),
    py: (value) => ({
      paddingTop: value,
      paddingBottom: value
    }),
    m: (value) => ({
      margin: value
    }),
    mt: (value) => ({
      marginTop: value
    }),
    mr: (value) => ({
      marginRight: value
    }),
    mb: (value) => ({
      marginBottom: value
    }),
    ml: (value) => ({
      marginLeft: value
    }),
    mx: (value) => ({
      marginLeft: value,
      marginRight: value
    }),
    my: (value) => ({
      marginTop: value,
      marginBottom: value
    }),
    ta: (value) => ({ textAlign: value }),
    fd: (value) => ({
      flexDirection: value
    }),
    fw: (value) => ({ flexWrap: value }),
    ai: (value) => ({
      alignItems: value
    }),
    ac: (value) => ({
      alignContent: value
    }),
    jc: (value) => ({
      justifyContent: value
    }),
    as: (value) => ({ alignSelf: value }),
    fg: (value) => ({ flexGrow: value }),
    fs: (value) => ({
      flexShrink: value
    }),
    fb: (value) => ({ flexBasis: value }),
    bc: (value) => ({
      backgroundColor: value
    }),
    br: (value) => ({
      borderRadius: value
    }),
    btrr: (value) => ({
      borderTopRightRadius: value
    }),
    bbrr: (value) => ({
      borderBottomRightRadius: value
    }),
    bblr: (value) => ({
      borderBottomLeftRadius: value
    }),
    btlr: (value) => ({
      borderTopLeftRadius: value
    }),
    bs: (value) => ({ boxShadow: value }),
    lh: (value) => ({
      lineHeight: value
    }),
    ox: (value) => ({ overflowX: value }),
    oy: (value) => ({ overflowY: value }),
    pe: (value) => ({
      pointerEvents: value
    }),
    us: (value) => ({
      WebkitUserSelect: value,
      userSelect: value
    }),
    userSelect: (value) => ({
      WebkitUserSelect: value,
      userSelect: value
    }),
    size: (value) => ({
      width: value,
      height: value
    }),
    appearance: (value) => ({
      WebkitAppearance: value,
      appearance: value
    }),
    backgroundClip: (value) => ({
      WebkitBackgroundClip: value,
      backgroundClip: value
    })
  }
}), darkTheme = createTheme("dark-theme", {
  colors: __spreadProps(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, import_colors.grayDark), import_colors.mauveDark), import_colors.slateDark), import_colors.sageDark), import_colors.oliveDark), import_colors.sandDark), import_colors.tomatoDark), import_colors.redDark), import_colors.crimsonDark), import_colors.pinkDark), import_colors.plumDark), import_colors.purpleDark), import_colors.violetDark), import_colors.indigoDark), import_colors.blueDark), import_colors.skyDark), import_colors.mintDark), import_colors.cyanDark), import_colors.tealDark), import_colors.greenDark), import_colors.grassDark), import_colors.limeDark), import_colors.yellowDark), import_colors.amberDark), import_colors.orangeDark), import_colors.brownDark), import_colors.bronzeDark), import_colors.goldDark), import_colors.grayDarkA), import_colors.mauveDarkA), import_colors.slateDarkA), import_colors.sageDarkA), import_colors.oliveDarkA), import_colors.sandDarkA), import_colors.tomatoDarkA), import_colors.redDarkA), import_colors.crimsonDarkA), import_colors.pinkDarkA), import_colors.plumDarkA), import_colors.purpleDarkA), import_colors.violetDarkA), import_colors.indigoDarkA), import_colors.blueDarkA), import_colors.skyDarkA), import_colors.mintDarkA), import_colors.cyanDarkA), import_colors.tealDarkA), import_colors.greenDarkA), import_colors.grassDarkA), import_colors.limeDarkA), import_colors.yellowDarkA), import_colors.amberDarkA), import_colors.orangeDarkA), import_colors.brownDarkA), import_colors.bronzeDarkA), import_colors.goldDarkA), {
    muted: "$slate8",
    primary: "$blue9",
    hiContrast: "$slate12",
    loContrast: "$slate1",
    canvas: "hsl(0 0% 15%)",
    panel: "$slate3",
    transparentPanel: "hsl(0 100% 100% / 97%)",
    shadowLight: "hsl(206 22% 7% / 35%)",
    shadowDark: "hsl(206 22% 7% / 20%)",
    background: "$slate12",
    text: "$slate1"
  })
});

// app/shared/design-system/index.ts
var Collapsible = __toESM(require("@radix-ui/react-collapsible")), import_react_accessible_icon = require("@radix-ui/react-accessible-icon"), Portal = __toESM(require("@radix-ui/react-portal"));

// app/shared/design-system/components/label.tsx
var LabelPrimitive = __toESM(require("@radix-ui/react-label"));

// app/shared/design-system/components/text.tsx
var Text = styled("div", {
  lineHeight: "1",
  margin: "0",
  fontWeight: 400,
  fontVariantNumeric: "tabular-nums",
  display: "block",
  variants: {
    size: {
      "1": {
        fontSize: "$1"
      },
      "2": {
        fontSize: "$2"
      },
      "3": {
        fontSize: "$3"
      },
      "4": {
        fontSize: "$4"
      },
      "5": {
        fontSize: "$5",
        letterSpacing: "-.015em"
      },
      "6": {
        fontSize: "$6",
        letterSpacing: "-.016em"
      },
      "7": {
        fontSize: "$7",
        letterSpacing: "-.031em",
        textIndent: "-.005em"
      },
      "8": {
        fontSize: "$8",
        letterSpacing: "-.034em",
        textIndent: "-.018em"
      },
      "9": {
        fontSize: "$9",
        letterSpacing: "-.055em",
        textIndent: "-.025em"
      }
    },
    variant: {
      red: {
        color: "$red11"
      },
      crimson: {
        color: "$crimson11"
      },
      pink: {
        color: "$pink11"
      },
      purple: {
        color: "$purple11"
      },
      violet: {
        color: "$violet11"
      },
      indigo: {
        color: "$indigo11"
      },
      blue: {
        color: "$blue11"
      },
      cyan: {
        color: "$cyan11"
      },
      teal: {
        color: "$teal11"
      },
      green: {
        color: "$green11"
      },
      lime: {
        color: "$lime11"
      },
      yellow: {
        color: "$yellow11"
      },
      orange: {
        color: "$orange11"
      },
      gold: {
        color: "$gold11"
      },
      bronze: {
        color: "$bronze11"
      },
      gray: {
        color: "$slate11"
      },
      contrast: {
        color: "$hiContrast"
      },
      loContrast: {
        color: "$loContrast"
      }
    },
    gradient: {
      true: {
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }
    }
  },
  compoundVariants: [
    {
      variant: "red",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $red11, $crimson11)"
      }
    },
    {
      variant: "crimson",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $crimson11, $pink11)"
      }
    },
    {
      variant: "pink",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $pink11, $purple11)"
      }
    },
    {
      variant: "purple",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $purple11, $violet11)"
      }
    },
    {
      variant: "violet",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $violet11, $indigo11)"
      }
    },
    {
      variant: "indigo",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $indigo11, $blue11)"
      }
    },
    {
      variant: "blue",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $blue11, $cyan11)"
      }
    },
    {
      variant: "cyan",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $cyan11, $teal11)"
      }
    },
    {
      variant: "teal",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $teal11, $green11)"
      }
    },
    {
      variant: "green",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $green11, $lime11)"
      }
    },
    {
      variant: "lime",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $lime11, $yellow11)"
      }
    },
    {
      variant: "yellow",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $yellow11, $orange11)"
      }
    },
    {
      variant: "orange",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $orange11, $red11)"
      }
    },
    {
      variant: "gold",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $gold11, $gold9)"
      }
    },
    {
      variant: "bronze",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $bronze11, $bronze9)"
      }
    },
    {
      variant: "gray",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $gray11, $gray12)"
      }
    },
    {
      variant: "contrast",
      gradient: "true",
      css: {
        background: "linear-gradient(to right, $hiContrast, $gray12)"
      }
    }
  ],
  defaultVariants: {
    size: "3",
    variant: "contrast"
  }
});

// app/shared/design-system/components/label.tsx
var Label = styled(LabelPrimitive.Root, Text, {
  display: "inline-block",
  verticalAlign: "middle",
  cursor: "default",
  lineHeight: 1.5
});

// app/shared/design-system/components/toggle-group.tsx
var toggle_group_exports = {};
__export(toggle_group_exports, {
  Item: () => Item2,
  Root: () => Root3
});
var ToggleGroupPrimitive = __toESM(require("@radix-ui/react-toggle-group")), Root3 = styled(ToggleGroupPrimitive.Root, {
  display: "inline-flex",
  backgroundColor: "$slate5",
  borderRadius: 4,
  boxShadow: "0 2px 10px $blackA7"
}), Item2 = styled(ToggleGroupPrimitive.Item, {
  all: "unset",
  backgroundColor: "$panel",
  color: "$hiContrast",
  display: "flex",
  whiteSpace: "nowrap",
  fontSize: 15,
  lineHeight: 1,
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 1,
  "&": {
    px: "$2",
    py: "$1"
  },
  "&:first-child": {
    marginLeft: 0,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4
  },
  "&:last-child": { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  "&:hover": { backgroundColor: "$slateA3" },
  "&[data-state=on]": {
    backgroundColor: "$slateA5"
  },
  "&:focus": {
    position: "relative",
    boxShadow: "0 0 0 2px black"
  }
});

// app/shared/design-system/components/select.tsx
var SelectPrimitive = __toESM(require("@radix-ui/react-select")), import_lodash = __toESM(require("lodash.noop")), import_react2 = __toESM(require("react"));

// app/shared/icons/index.ts
var icons_exports = {};
__export(icons_exports, {
  BrushIcon: () => BrushIcon,
  DevicesIcon: () => DevicesIcon,
  FormIcon: () => FormIcon,
  GithubIcon: () => GithubIcon,
  GoogleIcon: () => GoogleIcon,
  ListNestedIcon: () => ListNestedIcon,
  RedoIcon: () => RedoIcon,
  TabletIcon: () => TabletIcon,
  UndoIcon: () => UndoIcon
});
__reExport(icons_exports, require("@radix-ui/react-icons"));

// app/shared/icons/list-nested.tsx
var React2 = __toESM(require("react")), ListNestedIcon = React2.forwardRef((_a, forwardedRef) => {
  var _b = _a, { color = "currentColor" } = _b, props2 = __objRest(_b, ["color"]);
  return /* @__PURE__ */ React2.createElement("svg", __spreadProps(__spreadValues({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ React2.createElement("path", {
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M4.5 11.5A.5.5 0 0 1 5 11h10a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm-2-4A.5.5 0 0 1 3 7h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm-2-4A.5.5 0 0 1 1 3h10a.5.5 0 0 1 0 1H1a.5.5 0 0 1-.5-.5z"
  }));
});
ListNestedIcon.displayName = "ListNestedIcon";

// app/shared/icons/brush.tsx
var React3 = __toESM(require("react")), BrushIcon = React3.forwardRef((_a, forwardedRef) => {
  var _b = _a, { color = "currentColor" } = _b, props2 = __objRest(_b, ["color"]);
  return /* @__PURE__ */ React3.createElement("svg", __spreadProps(__spreadValues({
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ React3.createElement("path", {
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37-1.34-1.34a.9959.9959 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"
  }));
});
BrushIcon.displayName = "BrushIcon";

// app/shared/icons/form.tsx
var React4 = __toESM(require("react")), FormIcon = React4.forwardRef((_a, forwardedRef) => {
  var _b = _a, { color = "currentColor" } = _b, props2 = __objRest(_b, ["color"]);
  return /* @__PURE__ */ React4.createElement("svg", __spreadProps(__spreadValues({
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ React4.createElement("path", {
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M13 11H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h9v7zM4 9h7V6H4v3zm11 11H4c-1.1 0-2-.9-2-2v-3c0-1.1.9-2 2-2h11v7zM4 18h9v-3H4v3zm18-9h-2l2-5h-7v7h2v9l5-11zM4.75 17.25h1.5v-1.5h-1.5v1.5zm0-9h1.5v-1.5h-1.5v1.5z"
  }));
});
FormIcon.displayName = "FormIcon";

// app/shared/icons/undo.tsx
var React5 = __toESM(require("react")), UndoIcon = React5.forwardRef((_a, forwardedRef) => {
  var _b = _a, { color = "currentColor" } = _b, props2 = __objRest(_b, ["color"]);
  return /* @__PURE__ */ React5.createElement("svg", __spreadProps(__spreadValues({
    xmlns: "http://www.w3.org/2000/svg",
    height: "15",
    width: "15",
    viewBox: "0 0 24 24",
    fill: color
  }, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ React5.createElement("path", {
    d: "M0 0h24v24H0z",
    fill: "none"
  }), /* @__PURE__ */ React5.createElement("path", {
    d: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
  }));
});
UndoIcon.displayName = "UndoIcon";

// app/shared/icons/redo.tsx
var React6 = __toESM(require("react")), RedoIcon = React6.forwardRef((_a, forwardedRef) => {
  var _b = _a, { color = "currentColor" } = _b, props2 = __objRest(_b, ["color"]);
  return /* @__PURE__ */ React6.createElement("svg", __spreadProps(__spreadValues({
    xmlns: "http://www.w3.org/2000/svg",
    height: "15",
    width: "15",
    viewBox: "0 0 24 24",
    fill: color
  }, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ React6.createElement("path", {
    d: "M0 0h24v24H0z",
    fill: "none"
  }), /* @__PURE__ */ React6.createElement("path", {
    d: "M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"
  }));
});
RedoIcon.displayName = "RedoIcon";

// app/shared/icons/google.tsx
var React7 = __toESM(require("react")), GoogleIcon = React7.forwardRef((_a, forwardedRef) => {
  var _b = _a, { color = "currentColor" } = _b, props2 = __objRest(_b, ["color"]);
  return /* @__PURE__ */ React7.createElement("svg", __spreadProps(__spreadValues({
    role: "img",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg"
  }, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ React7.createElement("title", null, "Google"), /* @__PURE__ */ React7.createElement("path", {
    d: "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z",
    fill: color
  }));
});
GoogleIcon.displayName = "GoogleIcon";

// app/shared/icons/github.tsx
var React8 = __toESM(require("react")), GithubIcon = React8.forwardRef((_a, forwardedRef) => {
  var _b = _a, { color = "currentColor" } = _b, props2 = __objRest(_b, ["color"]);
  return /* @__PURE__ */ React8.createElement("svg", __spreadProps(__spreadValues({
    role: "img",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg"
  }, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ React8.createElement("title", null, "GitHub"), /* @__PURE__ */ React8.createElement("path", {
    d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
    fill: color
  }));
});
GithubIcon.displayName = "GithubIcon";

// app/shared/icons/devices.tsx
var React9 = __toESM(require("react")), DevicesIcon = React9.forwardRef((_a, forwardedRef) => {
  var _b = _a, { color = "currentColor" } = _b, props2 = __objRest(_b, ["color"]);
  return /* @__PURE__ */ React9.createElement("svg", __spreadProps(__spreadValues({
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ React9.createElement("path", {
    fill: color,
    d: "M22.265 9.51L17.265 9.5C16.715 9.5 16.265 9.95 16.265 10.5V19.5C16.265 20.05 16.715 20.5 17.265 20.5H22.265C22.815 20.5 23.265 20.05 23.265 19.5V10.5C23.265 9.95 22.815 9.51 22.265 9.51ZM22.265 19.5H17.265V10.5H19.5H22.265V19.5ZM20.265 1.5H2.26499C1.15499 1.5 0.264988 2.39 0.264988 3.5V15.5C0.264988 16.6 1.15499 17.5 2.26499 17.5H10.5V19.5H7.26499V20.5H15.265V19.5H12.5V17.5H15.265V16.5H1.26499V2.5H21.265V8.5H22.265V3.5C22.265 2.39 21.365 1.5 20.265 1.5Z"
  }));
});
DevicesIcon.displayName = "DevicesIcon";

// app/shared/icons/tablet.tsx
var React10 = __toESM(require("react")), TabletIcon = React10.forwardRef((_a, forwardedRef) => {
  var _b = _a, { color = "currentColor" } = _b, props2 = __objRest(_b, ["color"]);
  return /* @__PURE__ */ React10.createElement("svg", __spreadProps(__spreadValues({
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ React10.createElement("path", {
    fill: color,
    d: "M20 0H6C4.34 0 4 0.84 4 2.5V20.5C4 22.16 5.34 23.5 7 23.5H19C20.66 23.5 22 22.16 22 20.5V2.5C22 0.84 21.66 0 20 0ZM15 22.5H13H11V22H13H15V22.5ZM21 21H13H5V10.5V1H13H21V21Z"
  }));
});
TabletIcon.displayName = "TabletIcon";

// app/shared/design-system/components/select.tsx
var StyledTrigger = styled(SelectPrimitive.SelectTrigger, {
  all: "unset",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontVariantNumeric: "tabular-nums",
  gap: "$2",
  flexShrink: 0,
  borderRadius: "$1",
  backgroundColor: "$loContrast",
  color: "$hiContrast",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  "&:hover": {
    backgroundColor: "$slateA3"
  },
  "&:focus": {
    boxShadow: "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8"
  },
  variants: {
    size: {
      1: { padding: "0 $1 0 $2", fontSize: "$1", height: "$5" },
      2: { padding: "0 $2 0 $3", height: "$6", fontSize: "$3" }
    },
    ghost: {
      true: {
        backgroundColor: "transparent",
        boxShadow: "none"
      }
    },
    fullWidth: {
      true: {
        width: "100%"
      }
    }
  },
  defaultVariants: {
    size: 1
  }
}), StyledIcon = styled(SelectPrimitive.Icon, {
  display: "inline-flex",
  alignItems: "center"
}), StyledContent = styled(SelectPrimitive.Content, {
  overflow: "hidden",
  backgroundColor: "$muted",
  borderRadius: "$1",
  boxShadow: "0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)"
}), StyledViewport = styled(SelectPrimitive.Viewport, {
  py: "$1"
}), StyledItem = styled(SelectPrimitive.Item, {
  all: "unset",
  fontSize: "$1",
  lineHeight: 1,
  color: "$hiContrast",
  display: "flex",
  alignItems: "center",
  height: "$5",
  padding: "0 $6 0 $5",
  position: "relative",
  userSelect: "none",
  "&[data-disabled]": {
    color: "$muted",
    pointerEvents: "none"
  },
  "&:focus": {
    backgroundColor: "$primary",
    color: "$hiContrast"
  }
}), StyledItemIndicator = styled(SelectPrimitive.ItemIndicator, {
  position: "absolute",
  left: 0,
  width: 25,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center"
}), scrollButtonStyles = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 25,
  color: "$text",
  cursor: "default"
}, SelectScrollUpButton = styled(SelectPrimitive.ScrollUpButton, scrollButtonStyles), SelectScrollDownButton = styled(SelectPrimitive.ScrollDownButton, scrollButtonStyles), SelectItemBase = (_a, forwardedRef) => {
  var _b = _a, { children: children6 } = _b, props2 = __objRest(_b, ["children"]);
  return /* @__PURE__ */ import_react2.default.createElement(StyledItem, __spreadProps(__spreadValues({}, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ import_react2.default.createElement(SelectPrimitive.ItemText, null, children6), /* @__PURE__ */ import_react2.default.createElement(StyledItemIndicator, null, /* @__PURE__ */ import_react2.default.createElement(icons_exports.CheckIcon, null)));
}, SelectItem = import_react2.default.forwardRef(SelectItemBase), SelectBase = (_a, forwardedRef) => {
  var _b = _a, {
    options: options2,
    value,
    defaultValue,
    placeholder = "Select an option",
    onChange = import_lodash.default,
    getLabel = (option) => option,
    name
  } = _b, props2 = __objRest(_b, [
    "options",
    "value",
    "defaultValue",
    "placeholder",
    "onChange",
    "getLabel",
    "name"
  ]);
  return /* @__PURE__ */ import_react2.default.createElement(SelectPrimitive.Root, {
    name,
    value,
    defaultValue,
    onValueChange: onChange
  }, /* @__PURE__ */ import_react2.default.createElement(StyledTrigger, __spreadValues({
    ref: forwardedRef
  }, props2), /* @__PURE__ */ import_react2.default.createElement(SelectPrimitive.Value, null, value ? getLabel(value) : placeholder), /* @__PURE__ */ import_react2.default.createElement(StyledIcon, null, /* @__PURE__ */ import_react2.default.createElement(icons_exports.CaretSortIcon, null))), /* @__PURE__ */ import_react2.default.createElement(StyledContent, null, /* @__PURE__ */ import_react2.default.createElement(SelectScrollUpButton, null, /* @__PURE__ */ import_react2.default.createElement(icons_exports.ChevronUpIcon, null)), /* @__PURE__ */ import_react2.default.createElement(StyledViewport, null, options2.map((option) => /* @__PURE__ */ import_react2.default.createElement(SelectItem, {
    key: option,
    value: option,
    textValue: option
  }, getLabel(option)))), /* @__PURE__ */ import_react2.default.createElement(SelectScrollDownButton, null, /* @__PURE__ */ import_react2.default.createElement(icons_exports.ChevronDownIcon, null))));
}, Select = import_react2.default.forwardRef(SelectBase);
Select.displayName = "Select";

// app/shared/design-system/components/text-field.tsx
var TextField = styled("input", {
  appearance: "none",
  borderWidth: "0",
  boxSizing: "border-box",
  fontFamily: "inherit",
  margin: "0",
  outline: "none",
  padding: "0",
  width: "100%",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  "&::before": {
    boxSizing: "border-box"
  },
  "&::after": {
    boxSizing: "border-box"
  },
  backgroundColor: "$loContrast",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  color: "$hiContrast",
  fontVariantNumeric: "tabular-nums",
  "&:-webkit-autofill": {
    boxShadow: "inset 0 0 0 1px $colors$blue6, inset 0 0 0 100px $colors$blue3"
  },
  "&:-webkit-autofill::first-line": {
    fontFamily: "$untitled",
    color: "$hiContrast"
  },
  "&:focus": {
    boxShadow: "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
    "&:-webkit-autofill": {
      boxShadow: "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8, inset 0 0 0 100px $colors$blue3"
    }
  },
  "&::placeholder": {
    color: "$slate9"
  },
  "&:disabled": {
    pointerEvents: "none",
    backgroundColor: "$slate2",
    color: "$slate8",
    cursor: "not-allowed",
    "&::placeholder": {
      color: "$slate7"
    }
  },
  "&:read-only": {
    backgroundColor: "$slate2",
    "&:focus": {
      boxShadow: "inset 0px 0px 0px 1px $colors$slate7"
    }
  },
  '&[type="number"]': {
    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
      WebkitAppearance: "none",
      MozAppearance: "textfield",
      margin: 0,
      display: "none"
    }
  },
  variants: {
    size: {
      "1": {
        borderRadius: "$1",
        height: "$5",
        fontSize: "$1",
        px: "$1",
        lineHeight: "$sizes$5",
        "&:-webkit-autofill::first-line": {
          fontSize: "$1"
        }
      },
      "2": {
        borderRadius: "$2",
        height: "$6",
        fontSize: "$3",
        px: "$2",
        lineHeight: "$sizes$6",
        "&:-webkit-autofill::first-line": {
          fontSize: "$3"
        }
      }
    },
    variant: {
      ghost: {
        boxShadow: "none",
        backgroundColor: "transparent",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px $colors$slateA7"
          }
        },
        "&:focus": {
          backgroundColor: "$loContrast",
          boxShadow: "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8"
        },
        "&:disabled": {
          backgroundColor: "transparent"
        },
        "&:read-only": {
          backgroundColor: "transparent"
        }
      }
    },
    state: {
      invalid: {
        boxShadow: "inset 0 0 0 1px $colors$red7",
        "&:focus": {
          boxShadow: "inset 0px 0px 0px 1px $colors$red8, 0px 0px 0px 1px $colors$red8"
        }
      },
      valid: {
        boxShadow: "inset 0 0 0 1px $colors$green7",
        "&:focus": {
          boxShadow: "inset 0px 0px 0px 1px $colors$green8, 0px 0px 0px 1px $colors$green8"
        }
      }
    },
    cursor: {
      default: {
        cursor: "default",
        "&:focus": {
          cursor: "text"
        }
      },
      text: {
        cursor: "text"
      }
    }
  },
  defaultVariants: {
    size: "1"
  }
});

// app/shared/design-system/components/flex.tsx
var Flex = styled("div", {
  boxSizing: "border-box",
  display: "flex",
  variants: {
    direction: {
      row: {
        flexDirection: "row"
      },
      column: {
        flexDirection: "column"
      },
      rowReverse: {
        flexDirection: "row-reverse"
      },
      columnReverse: {
        flexDirection: "column-reverse"
      }
    },
    align: {
      start: {
        alignItems: "flex-start"
      },
      center: {
        alignItems: "center"
      },
      end: {
        alignItems: "flex-end"
      },
      stretch: {
        alignItems: "stretch"
      },
      baseline: {
        alignItems: "baseline"
      }
    },
    justify: {
      start: {
        justifyContent: "flex-start"
      },
      center: {
        justifyContent: "center"
      },
      end: {
        justifyContent: "flex-end"
      },
      between: {
        justifyContent: "space-between"
      }
    },
    wrap: {
      noWrap: {
        flexWrap: "nowrap"
      },
      wrap: {
        flexWrap: "wrap"
      },
      wrapReverse: {
        flexWrap: "wrap-reverse"
      }
    },
    gap: {
      1: {
        gap: "$1"
      },
      2: {
        gap: "$2"
      },
      3: {
        gap: "$3"
      },
      4: {
        gap: "$4"
      },
      5: {
        gap: "$5"
      },
      6: {
        gap: "$6"
      },
      7: {
        gap: "$7"
      },
      8: {
        gap: "$8"
      },
      9: {
        gap: "$9"
      }
    }
  },
  defaultVariants: {
    direction: "row",
    align: "stretch",
    justify: "start",
    wrap: "noWrap"
  }
});

// app/shared/design-system/components/grid.tsx
var Grid = styled("div", {
  boxSizing: "border-box",
  display: "grid",
  variants: {
    align: {
      start: {
        alignItems: "start"
      },
      center: {
        alignItems: "center"
      },
      end: {
        alignItems: "end"
      },
      stretch: {
        alignItems: "stretch"
      },
      baseline: {
        alignItems: "baseline"
      }
    },
    justify: {
      start: {
        justifyContent: "start"
      },
      center: {
        justifyContent: "center"
      },
      end: {
        justifyContent: "end"
      },
      between: {
        justifyContent: "space-between"
      }
    },
    flow: {
      row: {
        gridAutoFlow: "row"
      },
      column: {
        gridAutoFlow: "column"
      },
      dense: {
        gridAutoFlow: "dense"
      },
      rowDense: {
        gridAutoFlow: "row dense"
      },
      columnDense: {
        gridAutoFlow: "column dense"
      }
    },
    columns: {
      1: {
        gridTemplateColumns: "repeat(1, 1fr)"
      },
      2: {
        gridTemplateColumns: "repeat(2, 1fr)"
      },
      3: {
        gridTemplateColumns: "repeat(3, 1fr)"
      },
      4: {
        gridTemplateColumns: "repeat(4, 1fr)"
      }
    },
    gap: {
      1: {
        gap: "$1"
      },
      2: {
        gap: "$2"
      },
      3: {
        gap: "$3"
      },
      4: {
        gap: "$4"
      },
      5: {
        gap: "$5"
      },
      6: {
        gap: "$6"
      },
      7: {
        gap: "$7"
      },
      8: {
        gap: "$8"
      },
      9: {
        gap: "$9"
      }
    },
    gapX: {
      1: {
        columnGap: "$1"
      },
      2: {
        columnGap: "$2"
      },
      3: {
        columnGap: "$3"
      },
      4: {
        columnGap: "$4"
      },
      5: {
        columnGap: "$5"
      },
      6: {
        columnGap: "$6"
      },
      7: {
        columnGap: "$7"
      },
      8: {
        columnGap: "$8"
      },
      9: {
        columnGap: "$9"
      }
    },
    gapY: {
      1: {
        rowGap: "$1"
      },
      2: {
        rowGap: "$2"
      },
      3: {
        rowGap: "$3"
      },
      4: {
        rowGap: "$4"
      },
      5: {
        rowGap: "$5"
      },
      6: {
        rowGap: "$6"
      },
      7: {
        rowGap: "$7"
      },
      8: {
        rowGap: "$8"
      },
      9: {
        rowGap: "$9"
      }
    }
  }
});

// app/shared/design-system/components/tabs.tsx
var import_react3 = __toESM(require("react"));
var TabsPrimitive = __toESM(require("@radix-ui/react-tabs")), Tabs = styled(TabsPrimitive.Root, {
  display: "flex",
  '&[data-orientation="horizontal"]': {
    flexDirection: "column"
  }
}), TabsTrigger = styled(TabsPrimitive.Trigger, {
  flexShrink: 0,
  size: "$6",
  display: "inline-flex",
  lineHeight: 1,
  fontFamily: "inherit",
  fontSize: "$1",
  px: "$2",
  userSelect: "none",
  outline: "none",
  alignItems: "center",
  justifyContent: "center",
  color: "$slate11",
  border: "none",
  borderBottom: "1px solid transparent",
  borderTopLeftRadius: "$2",
  borderTopRightRadius: "$2",
  zIndex: "10",
  backgroundColor: "transparent",
  "@hover": {
    "&:hover": {
      color: "$hiContrast"
    }
  },
  '&[data-state="active"]': {
    color: "$hiContrast",
    borderColor: "$slate6"
  },
  '&[data-orientation="vertical"]': {
    justifyContent: "flex-start",
    borderTopRightRadius: 0,
    borderBottomLeftRadius: "$2",
    borderBottomColor: "transparent",
    '&[data-state="active"]': {
      borderBottomColor: "$slate6",
      borderRightColor: "transparent"
    }
  }
}), StyledTabsList = styled(TabsPrimitive.List, {
  flexShrink: 0,
  display: "flex",
  "&:focus": {
    outline: "none",
    boxShadow: "inset 0 0 0 1px $slate8, 0 0 0 1px $slate8"
  },
  '&[data-orientation="vertical"]': {
    flexDirection: "column",
    boxShadow: "inset -1px 0 0 $slate6"
  }
}), TabsList = import_react3.default.forwardRef((props2, forwardedRef) => /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(StyledTabsList, __spreadProps(__spreadValues({}, props2), {
  ref: forwardedRef
}))));
TabsList.displayName = "TabsList";
var TabsContent = styled(TabsPrimitive.Content, {
  flexGrow: 1,
  "&:focus": {
    outline: "none",
    boxShadow: "inset 0 0 0 1px $slate8, 0 0 0 1px $slate8"
  },
  '&[data-state="inactive"]': {
    display: "none"
  }
});

// app/shared/design-system/components/sidebar-tabs.tsx
var import_react4 = __toESM(require("react"));
var TabsPrimitive2 = __toESM(require("@radix-ui/react-tabs")), SidebarTabs = styled(TabsPrimitive2.Root, {
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
}), SidebarTabsTrigger = styled(TabsPrimitive2.Trigger, {
  flexShrink: 0,
  display: "flex",
  size: "$6",
  m: 0,
  userSelect: "none",
  outline: "none",
  alignItems: "center",
  justifyContent: "center",
  color: "$slate11",
  border: "1px solid transparent",
  zIndex: "10",
  backgroundColor: "transparent",
  "@hover": {
    "&:hover": {
      backgroundColor: "$slateA3",
      color: "$hiContrast"
    }
  },
  '&[data-state="active"]': {
    color: "$hiContrast",
    backgroundColor: "$slateA4",
    borderColor: "$slate6"
  }
}), StyledTabsList2 = styled(TabsPrimitive2.List, {
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  "&:focus": {
    outline: "none",
    boxShadow: "inset 0 0 0 1px $slate8, 0 0 0 1px $slate8"
  },
  '&[data-orientation="vertical"]': {
    boxShadow: "inset -1px 0 0 $slate6"
  }
}), SidebarTabsList = import_react4.default.forwardRef((props2, forwardedRef) => /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, /* @__PURE__ */ import_react4.default.createElement(StyledTabsList2, __spreadProps(__spreadValues({}, props2), {
  ref: forwardedRef
}))));
SidebarTabsList.displayName = "SidebarTabsList";
var SidebarTabsContent = styled(TabsPrimitive2.Content, {
  flexGrow: 1,
  position: "absolute",
  top: 0,
  left: "100%",
  width: 400,
  height: "100%",
  bc: "$loContrast",
  outline: "1px solid $slate6",
  "&:focus": {
    outline: "none",
    boxShadow: "inset 0 0 0 1px $slate8, 0 0 0 1px $slate8"
  }
});

// app/shared/design-system/components/card.tsx
var Card = styled("div", {
  appearance: "none",
  border: "none",
  boxSizing: "border-box",
  font: "inherit",
  lineHeight: "1",
  outline: "none",
  textAlign: "inherit",
  verticalAlign: "middle",
  WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",
  backgroundColor: "$panel",
  display: "block",
  textDecoration: "none",
  color: "inherit",
  flexShrink: 0,
  borderRadius: "$3",
  position: "relative",
  "&::before": {
    boxSizing: "border-box",
    content: '""',
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.1)",
    borderRadius: "$3",
    pointerEvents: "none"
  },
  variants: {
    size: {
      1: {
        width: "$10",
        padding: "$5"
      },
      2: {
        width: "$12",
        padding: "$7"
      }
    },
    variant: {
      interactive: {
        "@hover": {
          "&:hover": {
            "&::before": {
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,.2)"
            }
          }
        },
        "&:focus": {
          "&::before": {
            boxShadow: "inset 0 0 0 1px $colors$blue8, 0 0 0 1px $colors$blue8"
          }
        }
      },
      ghost: {
        backgroundColor: "transparent",
        transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), background-color 25ms linear",
        willChange: "transform",
        "&::before": {
          boxShadow: "0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)",
          opacity: "0",
          transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)"
        },
        "@hover": {
          "&:hover": {
            backgroundColor: "$panel",
            transform: "translateY(-2px)",
            "&::before": {
              opacity: "1"
            }
          }
        },
        "&:active": {
          transform: "translateY(0)",
          transition: "none",
          "&::before": {
            boxShadow: "0px 5px 16px -5px rgba(22, 23, 24, 0.35), 0px 5px 10px -7px rgba(22, 23, 24, 0.2)",
            opacity: "1"
          }
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$blue8, 0 0 0 1px $colors$blue8"
        }
      },
      active: {
        transform: "translateY(0)",
        transition: "none",
        "&::before": {
          boxShadow: "0px 5px 16px -5px rgba(22, 23, 24, 0.35), 0px 5px 10px -7px rgba(22, 23, 24, 0.2)",
          opacity: "1"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$blue8, 0 0 0 1px $colors$blue8"
        }
      }
    }
  },
  defaultVariants: {
    size: "1"
  }
});

// app/shared/design-system/components/simple-toggle.tsx
var TogglePrimitive = __toESM(require("@radix-ui/react-toggle")), SimpleToggle = styled(TogglePrimitive.Root, {
  alignItems: "center",
  appearance: "none",
  borderWidth: "0",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: 0,
  fontFamily: "inherit",
  fontSize: "14px",
  justifyContent: "center",
  lineHeight: "1",
  outline: "none",
  padding: "0",
  textDecoration: "none",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  color: "$hiContrast",
  "&::before": {
    boxSizing: "border-box"
  },
  "&::after": {
    boxSizing: "border-box"
  },
  height: "$5",
  width: "$5",
  backgroundColor: "transparent",
  "@hover": {
    "&:hover": {
      backgroundColor: "$slateA3"
    }
  },
  "&:active": {
    backgroundColor: "$slateA4"
  },
  "&:focus": {
    boxShadow: "inset 0 0 0 1px $slateA8, 0 0 0 1px $slateA8",
    zIndex: 1
  },
  '&[data-state="on"]': {
    backgroundColor: "$slateA5",
    "@hover": {
      "&:hover": {
        backgroundColor: "$slateA5"
      }
    },
    "&:active": {
      backgroundColor: "$slateA7"
    }
  },
  variants: {
    shape: {
      circle: {
        borderRadius: "$round"
      },
      square: {
        borderRadius: "$1"
      }
    }
  }
});

// app/shared/design-system/components/box.tsx
var Box = styled("div", {
  boxSizing: "border-box"
});

// app/shared/design-system/components/tooltip.tsx
var import_react5 = __toESM(require("react"));
var TooltipPrimitive = __toESM(require("@radix-ui/react-tooltip"));
var Content5 = styled(TooltipPrimitive.Content, {
  backgroundColor: "$loContrast",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  color: "$hiContrast",
  borderRadius: "$1",
  padding: "$1 $2",
  variants: {
    multiline: {
      true: {
        maxWidth: 250,
        pb: 7
      }
    }
  }
}), Tooltip = (_a) => {
  var _b = _a, {
    children: children6,
    content,
    open,
    defaultOpen,
    onOpenChange,
    multiline,
    delayDuration
  } = _b, props2 = __objRest(_b, [
    "children",
    "content",
    "open",
    "defaultOpen",
    "onOpenChange",
    "multiline",
    "delayDuration"
  ]);
  return /* @__PURE__ */ import_react5.default.createElement(TooltipPrimitive.Root, {
    open,
    defaultOpen,
    onOpenChange,
    delayDuration
  }, /* @__PURE__ */ import_react5.default.createElement(TooltipPrimitive.Trigger, {
    asChild: !0
  }, children6), /* @__PURE__ */ import_react5.default.createElement(Content5, __spreadProps(__spreadValues({
    side: "top",
    align: "center",
    sideOffset: 5
  }, props2), {
    multiline
  }), /* @__PURE__ */ import_react5.default.createElement(Text, {
    size: "1",
    as: "p",
    css: {
      color: "currentColor",
      lineHeight: multiline ? "$5" : void 0
    }
  }, content), /* @__PURE__ */ import_react5.default.createElement(Box, {
    css: { color: "$transparentExtreme" }
  }, /* @__PURE__ */ import_react5.default.createElement(TooltipPrimitive.Arrow, {
    offset: 5,
    width: 11,
    height: 5,
    style: {
      fill: "$loContrast"
    }
  }))));
};

// app/shared/design-system/components/button.tsx
var Button = styled("button", {
  all: "unset",
  alignItems: "center",
  boxSizing: "border-box",
  userSelect: "none",
  "&::before": {
    boxSizing: "border-box"
  },
  "&::after": {
    boxSizing: "border-box"
  },
  display: "inline-flex",
  flexShrink: 0,
  justifyContent: "center",
  lineHeight: "1",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  height: "$5",
  px: "$2",
  fontFamily: "$untitled",
  fontSize: "$2",
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",
  "&:disabled": {
    backgroundColor: "$slate2",
    boxShadow: "inset 0 0 0 1px $colors$slate7",
    color: "$slate8",
    pointerEvents: "none"
  },
  variants: {
    size: {
      "1": {
        borderRadius: "$1",
        height: "$5",
        px: "$2",
        fontSize: "$1",
        lineHeight: "$sizes$5"
      },
      "2": {
        borderRadius: "$2",
        height: "$6",
        px: "$3",
        fontSize: "$3",
        lineHeight: "$sizes$6"
      },
      "3": {
        borderRadius: "$2",
        height: "$7",
        px: "$4",
        fontSize: "$4",
        lineHeight: "$sizes$7"
      }
    },
    variant: {
      gray: {
        backgroundColor: "$loContrast",
        boxShadow: "inset 0 0 0 1px $colors$slate7",
        color: "$hiContrast",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px $colors$slate8"
          }
        },
        "&:active": {
          backgroundColor: "$slate2",
          boxShadow: "inset 0 0 0 1px $colors$slate8"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$slate8, 0 0 0 1px $colors$slate8"
        },
        '&[data-state="open"]': {
          backgroundColor: "$slate4",
          boxShadow: "inset 0 0 0 1px $colors$slate8"
        }
      },
      blue: {
        backgroundColor: "$blue2",
        boxShadow: "inset 0 0 0 1px $colors$blue7",
        color: "$blue11",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px $colors$blue8"
          }
        },
        "&:active": {
          backgroundColor: "$blue3",
          boxShadow: "inset 0 0 0 1px $colors$blue8"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$blue8, 0 0 0 1px $colors$blue8"
        },
        '&[data-state="open"]': {
          backgroundColor: "$blue4",
          boxShadow: "inset 0 0 0 1px $colors$blue8"
        }
      },
      green: {
        backgroundColor: "$green2",
        boxShadow: "inset 0 0 0 1px $colors$green7",
        color: "$green11",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px $colors$green8"
          }
        },
        "&:active": {
          backgroundColor: "$green3",
          boxShadow: "inset 0 0 0 1px $colors$green8"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$green8, 0 0 0 1px $colors$green8"
        },
        '&[data-state="open"]': {
          backgroundColor: "$green4",
          boxShadow: "inset 0 0 0 1px $colors$green8"
        }
      },
      red: {
        backgroundColor: "$loContrast",
        boxShadow: "inset 0 0 0 1px $colors$slate7",
        color: "$red11",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px $colors$slate8"
          }
        },
        "&:active": {
          backgroundColor: "$red3",
          boxShadow: "inset 0 0 0 1px $colors$red8"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$red8, 0 0 0 1px $colors$red8"
        },
        '&[data-state="open"]': {
          backgroundColor: "$red4",
          boxShadow: "inset 0 0 0 1px $colors$red8"
        }
      },
      transparentWhite: {
        backgroundColor: "hsla(0,100%,100%,.2)",
        color: "white",
        "@hover": {
          "&:hover": {
            backgroundColor: "hsla(0,100%,100%,.25)"
          }
        },
        "&:active": {
          backgroundColor: "hsla(0,100%,100%,.3)"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px hsla(0,100%,100%,.35), 0 0 0 1px hsla(0,100%,100%,.35)"
        }
      },
      raw: {
        background: "transparent",
        color: "inherit",
        padding: 0,
        borderRadius: 0,
        height: "auto"
      },
      transparentBlack: {
        backgroundColor: "hsla(0,0%,0%,.2)",
        color: "black",
        "@hover": {
          "&:hover": {
            backgroundColor: "hsla(0,0%,0%,.25)"
          }
        },
        "&:active": {
          backgroundColor: "hsla(0,0%,0%,.3)"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px hsla(0,0%,0%,.35), 0 0 0 1px hsla(0,0%,0%,.35)"
        }
      }
    },
    state: {
      active: {
        backgroundColor: "$slate4",
        boxShadow: "inset 0 0 0 1px $colors$slate8",
        color: "$slate11",
        "@hover": {
          "&:hover": {
            backgroundColor: "$slate5",
            boxShadow: "inset 0 0 0 1px $colors$slate8"
          }
        },
        "&:active": {
          backgroundColor: "$slate5"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$slate8, 0 0 0 1px $colors$slate8"
        }
      },
      waiting: {
        backgroundColor: "$slate4",
        boxShadow: "inset 0 0 0 1px $colors$slate8",
        color: "transparent",
        pointerEvents: "none",
        "@hover": {
          "&:hover": {
            backgroundColor: "$slate5",
            boxShadow: "inset 0 0 0 1px $colors$slate8"
          }
        },
        "&:active": {
          backgroundColor: "$slate5"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$slate8"
        }
      }
    },
    ghost: {
      true: {
        backgroundColor: "transparent",
        boxShadow: "none"
      }
    }
  },
  compoundVariants: [
    {
      variant: "gray",
      ghost: "true",
      css: {
        backgroundColor: "transparent",
        color: "$hiContrast",
        "@hover": {
          "&:hover": {
            backgroundColor: "$slateA3",
            boxShadow: "none"
          }
        },
        "&:active": {
          backgroundColor: "$slateA4"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$slateA8, 0 0 0 1px $colors$slateA8"
        },
        '&[data-state="open"]': {
          backgroundColor: "$slateA4",
          boxShadow: "none"
        }
      }
    },
    {
      variant: "blue",
      ghost: "true",
      css: {
        backgroundColor: "transparent",
        "@hover": {
          "&:hover": {
            backgroundColor: "$blueA3",
            boxShadow: "none"
          }
        },
        "&:active": {
          backgroundColor: "$blueA4"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$blueA8, 0 0 0 1px $colors$blueA8"
        },
        '&[data-state="open"]': {
          backgroundColor: "$blueA4",
          boxShadow: "none"
        }
      }
    },
    {
      variant: "green",
      ghost: "true",
      css: {
        backgroundColor: "transparent",
        "@hover": {
          "&:hover": {
            backgroundColor: "$greenA3",
            boxShadow: "none"
          }
        },
        "&:active": {
          backgroundColor: "$greenA4"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$greenA8, 0 0 0 1px $colors$greenA8"
        },
        '&[data-state="open"]': {
          backgroundColor: "$greenA4",
          boxShadow: "none"
        }
      }
    },
    {
      variant: "red",
      ghost: "true",
      css: {
        backgroundColor: "transparent",
        "@hover": {
          "&:hover": {
            backgroundColor: "$redA3",
            boxShadow: "none"
          }
        },
        "&:active": {
          backgroundColor: "$redA4"
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$redA8, 0 0 0 1px $colors$redA8"
        },
        '&[data-state="open"]': {
          backgroundColor: "$redA4",
          boxShadow: "none"
        }
      }
    }
  ],
  defaultVariants: {
    size: "1",
    variant: "gray"
  }
});

// app/shared/design-system/components/icon-button.tsx
var IconButton = styled("button", {
  alignItems: "center",
  appearance: "none",
  borderWidth: "0",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: 0,
  fontFamily: "inherit",
  fontSize: "14px",
  justifyContent: "center",
  lineHeight: "1",
  outline: "none",
  padding: "0",
  textDecoration: "none",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  color: "$hiContrast",
  "&::before": {
    boxSizing: "border-box"
  },
  "&::after": {
    boxSizing: "border-box"
  },
  backgroundColor: "$loContrast",
  border: "1px solid $slate7",
  "@hover": {
    "&:hover": {
      borderColor: "$slate8"
    }
  },
  "&:active": {
    backgroundColor: "$slate2"
  },
  "&:focus": {
    borderColor: "$slate8",
    boxShadow: "0 0 0 1px $colors$slate8"
  },
  "&:disabled": {
    pointerEvents: "none",
    backgroundColor: "transparent",
    color: "$slate6"
  },
  variants: {
    size: {
      "1": {
        borderRadius: "$1",
        height: "$5",
        width: "$5"
      },
      "2": {
        borderRadius: "$2",
        height: "$6",
        width: "$6"
      },
      "3": {
        borderRadius: "$2",
        height: "$7",
        width: "$7"
      },
      "4": {
        borderRadius: "$3",
        height: "$8",
        width: "$8"
      }
    },
    variant: {
      ghost: {
        backgroundColor: "transparent",
        borderWidth: "0",
        "@hover": {
          "&:hover": {
            backgroundColor: "$slateA3"
          }
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$slateA8, 0 0 0 1px $colors$slateA8"
        },
        "&:active": {
          backgroundColor: "$slateA4"
        },
        '&[data-state="open"]': {
          backgroundColor: "$slateA4"
        }
      },
      raised: {
        boxShadow: "0 0 transparent, 0 16px 32px hsl(206deg 12% 5% / 25%), 0 3px 5px hsl(0deg 0% 0% / 10%)",
        "@hover": {
          "&:hover": {
            boxShadow: "0 0 transparent, 0 16px 32px hsl(206deg 12% 5% / 25%), 0 3px 5px hsl(0deg 0% 0% / 10%)"
          }
        },
        "&:focus": {
          borderColor: "$slate8",
          boxShadow: "0 0 0 1px $colors$slate8, 0 16px 32px hsl(206deg 12% 5% / 25%), 0 3px 5px hsl(0deg 0% 0% / 10%)"
        },
        "&:active": {
          backgroundColor: "$slate4"
        }
      }
    },
    state: {
      active: {
        backgroundColor: "$slate4",
        boxShadow: "inset 0 0 0 1px hsl(206,10%,76%)",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px hsl(206,10%,76%)"
          }
        },
        "&:active": {
          backgroundColor: "$slate4"
        }
      },
      waiting: {
        backgroundColor: "$slate4",
        boxShadow: "inset 0 0 0 1px hsl(206,10%,76%)",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px hsl(206,10%,76%)"
          }
        },
        "&:active": {
          backgroundColor: "$slate4"
        }
      }
    }
  },
  defaultVariants: {
    size: "1",
    variant: "ghost"
  }
});

// app/shared/design-system/components/popover.tsx
var import_react6 = __toESM(require("react"));
var PopoverPrimitive = __toESM(require("@radix-ui/react-popover"));

// app/shared/design-system/components/panel.tsx
var panelStyles = css({
  backgroundColor: "$panel",
  borderRadius: "$3",
  boxShadow: "$colors$shadowLight 0px 10px 38px -10px, $colors$shadowDark 0px 10px 20px -15px"
}), Panel = styled("div", panelStyles);

// app/shared/design-system/components/popover.tsx
var Popover = (_a) => {
  var _b = _a, { children: children6 } = _b, props2 = __objRest(_b, ["children"]);
  return /* @__PURE__ */ import_react6.default.createElement(PopoverPrimitive.Root, __spreadValues({}, props2), children6);
}, StyledContent2 = styled(PopoverPrimitive.Content, panelStyles, {
  minWidth: 200,
  minHeight: "$6",
  maxWidth: 265,
  "&:focus": {
    outline: "none"
  }
}), PopoverContent = import_react6.default.forwardRef((_a, fowardedRef) => {
  var _b = _a, { children: children6, hideArrow } = _b, props2 = __objRest(_b, ["children", "hideArrow"]);
  return /* @__PURE__ */ import_react6.default.createElement(StyledContent2, __spreadProps(__spreadValues({
    sideOffset: 0
  }, props2), {
    ref: fowardedRef
  }), children6, !hideArrow && /* @__PURE__ */ import_react6.default.createElement(Box, {
    css: { color: "$panel" }
  }, /* @__PURE__ */ import_react6.default.createElement(PopoverPrimitive.Arrow, {
    width: 11,
    height: 5,
    offset: 5,
    style: { fill: "currentColor" }
  })));
});
PopoverContent.displayName = "PopoverContent";
var PopoverTrigger = PopoverPrimitive.Trigger;

// app/shared/design-system/components/heading.tsx
var import_react7 = __toESM(require("react"));
var import_lodash2 = __toESM(require("lodash.merge")), DEFAULT_TAG = "h1", Heading = import_react7.default.forwardRef((props2, forwardedRef) => {
  let _a = props2, { size = "1" } = _a, textProps = __objRest(_a, ["size"]), textSize = {
    1: { "@initial": "4", "@bp2": "5" },
    2: { "@initial": "6", "@bp2": "7" },
    3: { "@initial": "7", "@bp2": "8" },
    4: { "@initial": "8", "@bp2": "9" }
  }, textCss2 = {
    1: { fontWeight: 500, lineHeight: "20px", "@bp2": { lineHeight: "23px" } },
    2: { fontWeight: 500, lineHeight: "25px", "@bp2": { lineHeight: "30px" } },
    3: { fontWeight: 500, lineHeight: "33px", "@bp2": { lineHeight: "41px" } },
    4: { fontWeight: 500, lineHeight: "35px", "@bp2": { lineHeight: "55px" } }
  };
  return /* @__PURE__ */ import_react7.default.createElement(Text, __spreadProps(__spreadValues({
    as: DEFAULT_TAG
  }, textProps), {
    ref: forwardedRef,
    size: textSize[size],
    css: __spreadValues({
      fontVariantNumeric: "proportional-nums"
    }, (0, import_lodash2.default)(textCss2[size], props2.css))
  }));
});
Heading.displayName = "Heading";

// app/shared/design-system/components/menu.tsx
var import_react8 = __toESM(require("react")), MenuPrimitive = __toESM(require("@radix-ui/react-menu"));
var baseItemCss = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontFamily: "$untitled",
  fontSize: "$1",
  fontVariantNumeric: "tabular-nums",
  lineHeight: "1",
  cursor: "default",
  userSelect: "none",
  whiteSpace: "nowrap",
  height: "$5",
  px: "$5"
}), itemCss = css(baseItemCss, {
  position: "relative",
  color: "$hiContrast",
  "&:focus, &[data-found]": {
    outline: "none",
    backgroundColor: "$blue9",
    color: "white"
  },
  "&[data-disabled]": {
    color: "$slate9"
  }
}), labelCss = css(baseItemCss, {
  color: "$slate11"
}), menuCss = css({
  boxSizing: "border-box",
  minWidth: 120,
  py: "$1"
}), separatorCss = css({
  height: 1,
  my: "$1",
  backgroundColor: "$slate6"
}), Menu = styled(MenuPrimitive.Root, menuCss), MenuContent = styled(MenuPrimitive.Content, panelStyles), MenuSeparator = styled(MenuPrimitive.Separator, separatorCss), MenuItem = styled(MenuPrimitive.Item, itemCss), StyledMenuRadioItem = styled(MenuPrimitive.RadioItem, itemCss), MenuRadioItem = import_react8.default.forwardRef((_a, forwardedRef) => {
  var _b = _a, { children: children6 } = _b, props2 = __objRest(_b, ["children"]);
  return /* @__PURE__ */ import_react8.default.createElement(StyledMenuRadioItem, __spreadProps(__spreadValues({}, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ import_react8.default.createElement(Box, {
    as: "span",
    css: { position: "absolute", left: "$1" }
  }, /* @__PURE__ */ import_react8.default.createElement(MenuPrimitive.ItemIndicator, null, /* @__PURE__ */ import_react8.default.createElement(Flex, {
    css: {
      width: "$3",
      height: "$3",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /* @__PURE__ */ import_react8.default.createElement(Box, {
    css: {
      width: "$1",
      height: "$1",
      backgroundColor: "currentColor",
      borderRadius: "$round"
    }
  })))), children6);
});
MenuRadioItem.displayName = "MenuRadioItem";
var StyledMenuCheckboxItem = styled(MenuPrimitive.CheckboxItem, itemCss), MenuCheckboxItem = import_react8.default.forwardRef((_a, forwardedRef) => {
  var _b = _a, { children: children6 } = _b, props2 = __objRest(_b, ["children"]);
  return /* @__PURE__ */ import_react8.default.createElement(StyledMenuCheckboxItem, __spreadProps(__spreadValues({}, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ import_react8.default.createElement(Box, {
    as: "span",
    css: { position: "absolute", left: "$1" }
  }, /* @__PURE__ */ import_react8.default.createElement(MenuPrimitive.ItemIndicator, null, /* @__PURE__ */ import_react8.default.createElement(icons_exports.CheckIcon, null))), children6);
});
MenuCheckboxItem.displayName = "MenuCheckboxItem";
var MenuLabel = styled(MenuPrimitive.Label, labelCss), MenuRadioGroup = styled(MenuPrimitive.RadioGroup, {}), MenuGroup = styled(MenuPrimitive.Group, {}), MenuAnchor2 = MenuPrimitive.MenuAnchor;

// app/shared/design-system/components/paragraph.tsx
var import_react9 = __toESM(require("react"));
var import_lodash3 = __toESM(require("lodash.merge")), DEFAULT_TAG2 = "p", Paragraph = import_react9.default.forwardRef((props2, forwardedRef) => {
  let _a = props2, { size = "1" } = _a, textProps = __objRest(_a, ["size"]), textSize = {
    1: { "@initial": "2", "@bp2": "4" },
    2: { "@initial": "5", "@bp2": "6" }
  }, textCss2 = {
    1: { lineHeight: "25px", "@bp2": { lineHeight: "27px" } },
    2: {
      color: "$slate11",
      lineHeight: "27px",
      "@bp2": { lineHeight: "30px" }
    }
  };
  return /* @__PURE__ */ import_react9.default.createElement(Text, __spreadProps(__spreadValues({
    as: DEFAULT_TAG2
  }, textProps), {
    ref: forwardedRef,
    size: textSize[size],
    css: __spreadValues({}, (0, import_lodash3.default)(textCss2[size], props2.css))
  }));
});
Paragraph.displayName = "Paragraph";

// app/shared/design-system/components/link.tsx
var Link = styled("a", {
  alignItems: "center",
  gap: "$1",
  flexShrink: 0,
  outline: "none",
  textDecorationLine: "none",
  textUnderlineOffset: "3px",
  textDecorationColor: "$slate4",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  lineHeight: "inherit",
  "@hover": {
    "&:hover": {
      textDecorationLine: "underline"
    }
  },
  "&:focus": {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineOffset: "2px",
    textDecorationLine: "none"
  },
  [`& ${Text}`]: {
    color: "inherit"
  },
  variants: {
    variant: {
      blue: {
        color: "$blue11",
        textDecorationColor: "$blue4",
        "&:focus": {
          outlineColor: "$blue8"
        }
      },
      subtle: {
        color: "$slate11",
        textDecorationColor: "$slate4",
        "&:focus": {
          outlineColor: "$slate8"
        }
      },
      contrast: {
        color: "$hiContrast",
        textDecoration: "underline",
        textDecorationColor: "$slate4",
        "@hover": {
          "&:hover": {
            textDecorationColor: "$slate7"
          }
        },
        "&:focus": {
          outlineColor: "$slate8"
        }
      }
    }
  },
  defaultVariants: {
    variant: "contrast"
  }
});

// app/shared/design-system/components/dropdown-menu.tsx
var import_react10 = __toESM(require("react"));
var DropdownMenuPrimitive = __toESM(require("@radix-ui/react-dropdown-menu"));
var DropdownMenu = DropdownMenuPrimitive.Root, DropdownMenuArrow = styled(DropdownMenuPrimitive.Arrow, {
  fill: "$panel"
}), DropdownMenuTrigger = DropdownMenuPrimitive.Trigger, DropdownMenuContent = styled(DropdownMenuPrimitive.Content, menuCss, panelStyles), DropdownMenuSeparator = styled(DropdownMenuPrimitive.Separator, separatorCss), DropdownMenuItem = styled(DropdownMenuPrimitive.Item, itemCss), StyledDropdownMenuRadioItem = styled(DropdownMenuPrimitive.RadioItem, itemCss), DropdownMenuRadioItem = import_react10.default.forwardRef((_a, forwardedRef) => {
  var _b = _a, { children: children6 } = _b, props2 = __objRest(_b, ["children"]);
  return /* @__PURE__ */ import_react10.default.createElement(StyledDropdownMenuRadioItem, __spreadProps(__spreadValues({}, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ import_react10.default.createElement(Box, {
    as: "span",
    css: { position: "absolute", left: "$1" }
  }, /* @__PURE__ */ import_react10.default.createElement(DropdownMenuPrimitive.ItemIndicator, null, /* @__PURE__ */ import_react10.default.createElement(Flex, {
    css: {
      width: "$3",
      height: "$3",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /* @__PURE__ */ import_react10.default.createElement(Box, {
    css: {
      width: "$1",
      height: "$1",
      backgroundColor: "currentColor",
      borderRadius: "$round"
    }
  })))), children6);
});
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";
var StyledDropdownMenuCheckboxItem = styled(DropdownMenuPrimitive.CheckboxItem, itemCss), DropdownMenuCheckboxItem = import_react10.default.forwardRef((_a, forwardedRef) => {
  var _b = _a, { children: children6 } = _b, props2 = __objRest(_b, ["children"]);
  return /* @__PURE__ */ import_react10.default.createElement(StyledDropdownMenuCheckboxItem, __spreadProps(__spreadValues({}, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ import_react10.default.createElement(Box, {
    as: "span",
    css: { position: "absolute", left: "$1" }
  }, /* @__PURE__ */ import_react10.default.createElement(DropdownMenuPrimitive.ItemIndicator, null, /* @__PURE__ */ import_react10.default.createElement(icons_exports.CheckIcon, null))), children6);
});
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";
var DropdownMenuLabel = styled(DropdownMenuPrimitive.Label, labelCss), DropdownMenuRadioGroup = styled(DropdownMenuPrimitive.RadioGroup, {}), DropdownMenuGroup = styled(DropdownMenuPrimitive.Group, {});

// app/shared/design-system/components/switch.tsx
var import_react11 = __toESM(require("react"));
var SwitchPrimitive = __toESM(require("@radix-ui/react-switch")), StyledThumb = styled(SwitchPrimitive.Thumb, {
  position: "absolute",
  left: 0,
  width: 13,
  height: 13,
  backgroundColor: "white",
  borderRadius: "$round",
  boxShadow: "rgba(0, 0, 0, 0.3) 0px 0px 1px, rgba(0, 0, 0, 0.2) 0px 1px 2px;",
  transition: "transform 100ms cubic-bezier(0.22, 1, 0.36, 1)",
  transform: "translateX(1px)",
  willChange: "transform",
  '&[data-state="checked"]': {
    transform: "translateX(11px)"
  }
}), StyledSwitch = styled(SwitchPrimitive.Root, {
  all: "unset",
  boxSizing: "border-box",
  userSelect: "none",
  flexShrink: 0,
  "&::before": {
    boxSizing: "border-box"
  },
  "&::after": {
    boxSizing: "border-box"
  },
  alignItems: "center",
  display: "inline-flex",
  justifyContent: "center",
  lineHeight: "1",
  margin: "0",
  outline: "none",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  backgroundColor: "$slate5",
  borderRadius: "$pill",
  position: "relative",
  "&:focus": {
    boxShadow: "0 0 0 2px $colors$slate8"
  },
  '&[data-state="checked"]': {
    backgroundColor: "$blue9",
    "&:focus": {
      boxShadow: "0 0 0 2px $colors$blue8"
    }
  },
  variants: {
    size: {
      "1": {
        width: "$5",
        height: "$3"
      },
      "2": {
        width: "$7",
        height: "$5",
        [`& ${StyledThumb}`]: {
          width: 21,
          height: 21,
          transform: "translateX(2px)",
          '&[data-state="checked"]': {
            transform: "translateX(22px)"
          }
        }
      }
    }
  },
  defaultVariants: {
    size: "1"
  }
}), Switch = import_react11.default.forwardRef((props2, forwardedRef) => /* @__PURE__ */ import_react11.default.createElement(StyledSwitch, __spreadProps(__spreadValues({}, props2), {
  ref: forwardedRef
}), /* @__PURE__ */ import_react11.default.createElement(StyledThumb, null)));
Switch.displayName = "Switch";

// app/shared/design-system/components/slider.tsx
var import_react12 = __toESM(require("react"));
var SliderPrimitive = __toESM(require("@radix-ui/react-slider")), SliderTrack = styled(SliderPrimitive.Track, {
  position: "relative",
  flexGrow: 1,
  backgroundColor: "$slate7",
  borderRadius: "$pill",
  '&[data-orientation="horizontal"]': {
    height: 2
  },
  '&[data-orientation="vertical"]': {
    width: 2,
    height: 100
  }
}), SliderRange = styled(SliderPrimitive.Range, {
  position: "absolute",
  background: "$blue9",
  borderRadius: "inherit",
  '&[data-orientation="horizontal"]': {
    height: "100%"
  },
  '&[data-orientation="vertical"]': {
    width: "100%"
  }
}), SliderThumb = styled(SliderPrimitive.Thumb, {
  position: "relative",
  display: "block",
  width: 15,
  height: 15,
  outline: "none",
  backgroundColor: "white",
  boxShadow: "0 0 1px rgba(0,0,0,.3), 0 1px 4px rgba(0,0,0,.15)",
  borderRadius: "$round",
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: -2,
    backgroundColor: "hsla(0,0%,0%,.035)",
    transform: "scale(1)",
    borderRadius: "$round",
    transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)"
  },
  "&:focus": {
    "&::after": {
      transform: "scale(2)"
    }
  }
}), StyledSlider = styled(SliderPrimitive.Root, {
  position: "relative",
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  userSelect: "none",
  touchAction: "none",
  height: 15,
  flexGrow: 1,
  '&[data-orientation="vertical"]': {
    flexDirection: "column",
    width: 15
  },
  "@hover": {
    "&:hover": {
      [`& ${SliderTrack}`]: {
        backgroundColor: "$slate8"
      }
    }
  }
}), Slider = import_react12.default.forwardRef((_a, forwardedRef) => {
  var _b = _a, { value, defaultValue } = _b, props2 = __objRest(_b, ["value", "defaultValue"]);
  let realValue = value || defaultValue || 0, thumbsArray = Array.isArray(realValue) ? realValue : [realValue];
  return /* @__PURE__ */ import_react12.default.createElement(StyledSlider, __spreadProps(__spreadValues({}, props2), {
    ref: forwardedRef
  }), /* @__PURE__ */ import_react12.default.createElement(SliderTrack, null, /* @__PURE__ */ import_react12.default.createElement(SliderRange, null)), thumbsArray == null ? void 0 : thumbsArray.map((_, i) => /* @__PURE__ */ import_react12.default.createElement(SliderThumb, {
    key: i
  })));
});
Slider.displayName = "Slider";

// app/shared/design-system/components/radio.tsx
var import_react13 = __toESM(require("react"));
var RadioGroupPrimitive = __toESM(require("@radix-ui/react-radio-group")), RadioGroup3 = styled(RadioGroupPrimitive.Root, {
  display: "flex"
}), StyledIndicator = styled(RadioGroupPrimitive.Indicator, {
  alignItems: "center",
  display: "flex",
  height: "100%",
  justifyContent: "center",
  width: "100%",
  position: "relative",
  "&::after": {
    content: '""',
    display: "block",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "$blue9"
  }
}), StyledRadio = styled(RadioGroupPrimitive.Item, {
  all: "unset",
  boxSizing: "border-box",
  userSelect: "none",
  "&::before": {
    boxSizing: "border-box"
  },
  "&::after": {
    boxSizing: "border-box"
  },
  alignItems: "center",
  appearance: "none",
  display: "inline-flex",
  justifyContent: "center",
  lineHeight: "1",
  margin: "0",
  outline: "none",
  padding: "0",
  textDecoration: "none",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  borderRadius: "50%",
  color: "$hiContrast",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  overflow: "hidden",
  "@hover": {
    "&:hover": {
      boxShadow: "inset 0 0 0 1px $colors$slate8"
    }
  },
  "&:focus": {
    outline: "none",
    borderColor: "$red7",
    boxShadow: "inset 0 0 0 1px $colors$blue9, 0 0 0 1px $colors$blue9"
  },
  variants: {
    size: {
      "1": {
        width: "$3",
        height: "$3"
      },
      "2": {
        width: "$5",
        height: "$5",
        [`& ${StyledIndicator}`]: {
          "&::after": {
            width: "$3",
            height: "$3"
          }
        }
      }
    }
  },
  defaultVariants: {
    size: "1"
  }
}), Radio = import_react13.default.forwardRef((props2, forwardedRef) => /* @__PURE__ */ import_react13.default.createElement(StyledRadio, __spreadProps(__spreadValues({}, props2), {
  ref: forwardedRef
}), /* @__PURE__ */ import_react13.default.createElement(StyledIndicator, null)));
Radio.displayName = "Radio";

// app/shared/design-system/components/combobox.tsx
var import_react14 = require("react");
var Combobox = (_a) => {
  var _b = _a, {
    items,
    onValueSelect,
    onValueEnter,
    onItemEnter,
    onItemLeave,
    value,
    css: css2
  } = _b, rest = __objRest(_b, [
    "items",
    "onValueSelect",
    "onValueEnter",
    "onItemEnter",
    "onItemLeave",
    "value",
    "css"
  ]);
  let [isOpen, setIsOpen] = (0, import_react14.useState)(!1), [currentValue, setCurrentValue] = (0, import_react14.useState)(value);
  return (0, import_react14.useEffect)(() => {
    setCurrentValue(value);
  }, [value]), /* @__PURE__ */ React.createElement(Menu, {
    open: isOpen,
    modal: !0,
    onOpenChange: setIsOpen
  }, /* @__PURE__ */ React.createElement(MenuAnchor2, {
    asChild: !0
  }, /* @__PURE__ */ React.createElement(TextField, __spreadProps(__spreadValues({}, rest), {
    value: currentValue,
    autoComplete: "off",
    css: __spreadProps(__spreadValues({}, css2), { paddingRight: 30 }),
    onChange: (event) => {
      setCurrentValue(event.target.value);
    },
    onKeyDown: (event) => {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp": {
          setIsOpen(!0);
          break;
        }
        case "Enter": {
          onValueEnter(event.currentTarget.value);
          break;
        }
      }
    }
  }))), /* @__PURE__ */ React.createElement(IconButton, {
    variant: "ghost",
    size: "1",
    css: { marginLeft: -32 },
    onClick: () => {
      setIsOpen(!0);
    }
  }, /* @__PURE__ */ React.createElement(icons_exports.ChevronDownIcon, null)), /* @__PURE__ */ React.createElement(MenuContent, {
    loop: !0,
    portalled: !0,
    asChild: !0
  }, /* @__PURE__ */ React.createElement("div", null, items.map(({ label: label11 }, index) => /* @__PURE__ */ React.createElement(MenuItem, {
    key: index,
    onMouseEnter: () => {
      onItemEnter(label11);
    },
    onMouseLeave: () => {
      onItemLeave(label11);
    },
    onFocus: () => {
      onItemEnter(label11);
    },
    onSelect: () => {
      onValueSelect(label11);
    }
  }, label11)))));
};

// app/config.ts
var config2 = {
  previewPath: "/preview",
  canvasPath: "/canvas",
  designerPath: "/designer",
  dashboardPath: "/dashboard",
  loginPath: "/login",
  logoutPath: "/logout",
  googleCallbackPath: "/google/callback",
  githubCallbackPath: "/github/callback",
  authPath: "/auth"
}, config_default = config2;

// app/critical-css.ts
var getCssTextFunctions = {
  [config_default.previewPath]: import_sdk.getCssText,
  [config_default.canvasPath]: import_sdk.getCssText,
  [config_default.designerPath]: getCssText,
  [config_default.dashboardPath]: getCssText,
  [config_default.loginPath]: getCssText
}, getCssTextFunction = (url2) => {
  let { pathname } = new URL(url2), path;
  for (path in getCssTextFunctions)
    if (pathname.indexOf(path) === 0)
      return getCssTextFunctions[path];
  return import_sdk.getCssText;
}, insertCriticalCss = (markup, url2) => (0, import_sdk.insertCriticalCss)(markup, getCssTextFunction(url2));

// app/entry.server.tsx
var Sentry2 = __toESM(require("@sentry/remix"));

// app/shared/sentry.ts
var Sentry = __toESM(require("@sentry/remix"));

// app/shared/env/namespace.ts
var namespace = "__webstudioEnv";

// app/shared/env/env.tsx
var import_react15 = require("@remix-run/react");
var Env = () => {
  let data = (0, import_react15.useLoaderData)();
  return /* @__PURE__ */ React.createElement("script", {
    dangerouslySetInnerHTML: {
      __html: `window["${namespace}"] = ${JSON.stringify(data.env)}`
    }
  });
};

// app/shared/env/env-getter.ts
var env_getter_default = new Proxy({}, {
  get(_target, prop) {
    if (typeof window > "u")
      return prop in process.env ? process.env[prop] : void 0;
    let env2 = window[namespace] ?? {};
    return prop in env2 ? env2[prop] : void 0;
  }
});

// app/shared/sentry.ts
var initSentry = ({
  integrations = []
} = {}) => env_getter_default.SENTRY_DSN ? Sentry.init({
  dsn: env_getter_default.SENTRY_DSN,
  tracesSampleRate: 1,
  environment: env_getter_default.VERCEL_ENV || "development",
  integrations
}) : () => null;
var sentryException = ({
  message,
  extra,
  skipLogging = !1
}) => {
  env_getter_default.SENTRY_DSN && Sentry.withScope((scope) => {
    extra && scope.setExtras(extra), Sentry.captureException(message);
  }), skipLogging !== !0 && console.error(message);
};

// app/shared/db/prisma.server.ts
var import_client = require("@prisma/client"), import_runtime = require("@prisma/client/runtime"), prisma = global.prisma || new import_client.PrismaClient();
global.prisma = prisma;

// app/entry.server.tsx
initSentry({
  integrations: [new Sentry2.Integrations.Prisma({ client: prisma })]
});
function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  let markup = (0, import_server.renderToString)(/* @__PURE__ */ React.createElement(import_react16.RemixServer, {
    context: remixContext,
    url: request.url
  }));
  return markup = insertCriticalCss(markup, request.url), responseHeaders.set("Content-Type", "text/html"), new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders
  });
}

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/root.tsx
var root_exports = {};
__export(root_exports, {
  default: () => root_default
});
var import_react17 = require("@remix-run/react"), import_remix = require("@sentry/remix"), import_remix2 = require("@sentry/remix"), RootWithErrorBoundary = (props2) => /* @__PURE__ */ React.createElement(import_remix2.ErrorBoundary, null, /* @__PURE__ */ React.createElement(import_react17.Outlet, __spreadValues({}, props2))), root_default = (0, import_remix.withSentryRouteTracing)(RootWithErrorBoundary);

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/rest/breakpoints.$projectId.ts
var breakpoints_projectId_exports = {};
__export(breakpoints_projectId_exports, {
  loader: () => loader
});

// app/shared/db/tree.server.ts
var tree_server_exports = {};
__export(tree_server_exports, {
  clone: () => clone,
  create: () => create,
  createRootInstance: () => createRootInstance,
  loadById: () => loadById,
  loadByProject: () => loadByProject,
  patchRoot: () => patchRoot
});
var import_immer2 = require("immer");

// app/shared/tree-utils/create-instance.ts
var import_bson_objectid = __toESM(require("bson-objectid"));

// app/shared/canvas-components/primitives/index.ts
var primitives_exports = {};
__export(primitives_exports, {
  Bold: () => bold_exports,
  Box: () => box_exports,
  Button: () => button_exports,
  Form: () => form_exports,
  Heading: () => heading_exports,
  Input: () => input_exports,
  Italic: () => italic_exports,
  Link: () => link_exports,
  Paragraph: () => paragraph_exports,
  TextBlock: () => text_block_exports
});

// app/shared/canvas-components/primitives/box.tsx
var box_exports = {};
__export(box_exports, {
  Component: () => Component,
  Icon: () => icons_exports.SquareIcon,
  canAcceptChild: () => canAcceptChild,
  defaultStyle: () => defaultStyle,
  isContentEditable: () => isContentEditable,
  isInlineOnly: () => isInlineOnly,
  label: () => label
});
var import_sdk2 = require("@webstudio-is/sdk"), defaultStyle = {
  boxSizing: {
    type: "keyword",
    value: "border-box"
  }
}, canAcceptChild = () => !0, isContentEditable = !1, isInlineOnly = !1, Component = import_sdk2.components.Box, label = "Box";

// app/shared/canvas-components/primitives/text-block.tsx
var text_block_exports = {};
__export(text_block_exports, {
  Component: () => Component2,
  Icon: () => icons_exports.TextIcon,
  canAcceptChild: () => canAcceptChild2,
  children: () => children,
  defaultStyle: () => defaultStyle2,
  isContentEditable: () => isContentEditable2,
  isInlineOnly: () => isInlineOnly2,
  label: () => label2
});
var import_sdk3 = require("@webstudio-is/sdk"), defaultStyle2 = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1
  }
}, children = ["Block of text you can edit"], canAcceptChild2 = () => !1, isContentEditable2 = !0, isInlineOnly2 = !1, label2 = "Text Block", Component2 = import_sdk3.components.TextBlock;

// app/shared/canvas-components/primitives/heading.tsx
var heading_exports = {};
__export(heading_exports, {
  Component: () => Component3,
  Icon: () => icons_exports.HeadingIcon,
  canAcceptChild: () => canAcceptChild3,
  children: () => children2,
  defaultStyle: () => defaultStyle3,
  isContentEditable: () => isContentEditable3,
  isInlineOnly: () => isInlineOnly3,
  label: () => label3
});
var import_sdk4 = require("@webstudio-is/sdk"), defaultStyle3 = {}, children2 = ["Heading you can edit"], canAcceptChild3 = () => !1, isContentEditable3 = !0, isInlineOnly3 = !1, label3 = "Heading", Component3 = import_sdk4.components.Heading;

// app/shared/canvas-components/primitives/paragraph.tsx
var paragraph_exports = {};
__export(paragraph_exports, {
  Component: () => Component4,
  Icon: () => icons_exports.TextAlignLeftIcon,
  canAcceptChild: () => canAcceptChild4,
  children: () => children3,
  defaultStyle: () => defaultStyle4,
  isContentEditable: () => isContentEditable4,
  isInlineOnly: () => isInlineOnly4,
  label: () => label4
});
var import_sdk5 = require("@webstudio-is/sdk"), defaultStyle4 = {}, children3 = ["Pragraph you can edit"], canAcceptChild4 = () => !1, isContentEditable4 = !0, isInlineOnly4 = !1, label4 = "Paragraph", Component4 = import_sdk5.components.Paragraph;

// app/shared/canvas-components/primitives/link.tsx
var link_exports = {};
__export(link_exports, {
  Component: () => Component5,
  Icon: () => icons_exports.Link2Icon,
  canAcceptChild: () => canAcceptChild5,
  children: () => children4,
  defaultStyle: () => defaultStyle5,
  isContentEditable: () => isContentEditable5,
  isInlineOnly: () => isInlineOnly5,
  label: () => label5
});
var import_sdk6 = require("@webstudio-is/sdk"), defaultStyle5 = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1
  },
  display: {
    type: "keyword",
    value: "inline-block"
  }
}, children4 = ["Link text you can edit"], canAcceptChild5 = () => !1, isContentEditable5 = !0, isInlineOnly5 = !1, label5 = "Link", Component5 = import_sdk6.components.Link;

// app/shared/canvas-components/primitives/bold.tsx
var bold_exports = {};
__export(bold_exports, {
  Component: () => Component6,
  Icon: () => icons_exports.FontBoldIcon,
  canAcceptChild: () => canAcceptChild6,
  isContentEditable: () => isContentEditable6,
  isInlineOnly: () => isInlineOnly6,
  label: () => label6
});
var import_sdk7 = require("@webstudio-is/sdk"), canAcceptChild6 = () => !1, isContentEditable6 = !1, label6 = "Bold Text", isInlineOnly6 = !0, Component6 = import_sdk7.components.Bold;

// app/shared/canvas-components/primitives/italic.tsx
var italic_exports = {};
__export(italic_exports, {
  Component: () => Component7,
  Icon: () => icons_exports.FontBoldIcon,
  canAcceptChild: () => canAcceptChild7,
  isContentEditable: () => isContentEditable7,
  isInlineOnly: () => isInlineOnly7,
  label: () => label7
});
var import_sdk8 = require("@webstudio-is/sdk"), canAcceptChild7 = () => !1, isContentEditable7 = !1, label7 = "Italic Text", isInlineOnly7 = !0, Component7 = import_sdk8.components.Italic;

// app/shared/canvas-components/primitives/button.tsx
var button_exports = {};
__export(button_exports, {
  Component: () => Component8,
  Icon: () => icons_exports.ButtonIcon,
  canAcceptChild: () => canAcceptChild8,
  children: () => children5,
  defaultStyle: () => defaultStyle6,
  isContentEditable: () => isContentEditable8,
  isInlineOnly: () => isInlineOnly8,
  label: () => label8
});
var import_sdk9 = require("@webstudio-is/sdk"), defaultStyle6 = {}, canAcceptChild8 = () => !1, isContentEditable8 = !0, isInlineOnly8 = !1, children5 = ["Button text you can edit"], Component8 = import_sdk9.components.Button, label8 = "Button";

// app/shared/canvas-components/primitives/input.tsx
var input_exports = {};
__export(input_exports, {
  Component: () => Component9,
  Icon: () => icons_exports.InputIcon,
  canAcceptChild: () => canAcceptChild9,
  defaultStyle: () => defaultStyle7,
  isContentEditable: () => isContentEditable9,
  isInlineOnly: () => isInlineOnly9,
  label: () => label9
});
var import_sdk10 = require("@webstudio-is/sdk"), defaultStyle7 = {}, canAcceptChild9 = () => !1, isContentEditable9 = !1, isInlineOnly9 = !1, Component9 = import_sdk10.components.Input, label9 = "Input";

// app/shared/canvas-components/primitives/form.tsx
var form_exports = {};
__export(form_exports, {
  Component: () => Component10,
  Icon: () => FormIcon,
  canAcceptChild: () => canAcceptChild10,
  defaultStyle: () => defaultStyle8,
  isContentEditable: () => isContentEditable10,
  isInlineOnly: () => isInlineOnly10,
  label: () => label10
});
var import_sdk11 = require("@webstudio-is/sdk"), defaultStyle8 = {
  minHeight: {
    type: "unit",
    unit: "px",
    value: 20
  },
  boxSizing: {
    type: "keyword",
    value: "border-box"
  }
}, canAcceptChild10 = () => !0, isContentEditable10 = !1, isInlineOnly10 = !1, Component10 = import_sdk11.components.Form, label10 = "Form";

// app/shared/tree-utils/create-instance.ts
var createInstance = ({
  component,
  id,
  children: children6,
  cssRules
}) => {
  let primitive = primitives_exports[component];
  return {
    component,
    id: id === void 0 ? (0, import_bson_objectid.default)().toString() : id,
    cssRules: cssRules ?? [],
    children: children6 === void 0 ? "children" in primitive ? primitive.children : [] : children6
  };
};

// app/shared/tree-utils/delete-instance.ts
var deleteInstanceMutable = (instance, instanceId) => {
  if (instance.id === instanceId)
    return !0;
  for (let child of instance.children) {
    if (typeof child == "string")
      continue;
    if (deleteInstanceMutable(child, instanceId) === !0) {
      let index = instance.children.indexOf(child);
      return instance.children.splice(index, 1), !1;
    }
  }
  return !1;
};

// app/shared/tree-utils/insert-instance.ts
var insertInstanceMutable = (rootInstance, instance, spec) => {
  if (spec.parentId !== rootInstance.id) {
    for (let child of rootInstance.children) {
      if (typeof child == "string")
        continue;
      if (insertInstanceMutable(child, instance, spec) === !0)
        return !0;
    }
    return !1;
  }
  return typeof spec.position == "number" ? (rootInstance.children.splice(spec.position, 0, instance), !0) : (spec.position === "end" && rootInstance.children.push(instance), !0);
};

// app/shared/tree-utils/populate.ts
var populateInstance = (instance) => {
  let populatedInstance = __spreadValues({}, instance), primitive = primitives_exports[instance.component];
  if (primitive !== void 0 && "defaultStyle" in primitive) {
    let cssRule = {
      breakpoint: "",
      style: primitive.defaultStyle
    };
    populatedInstance.cssRules.push(cssRule);
  }
  return populatedInstance;
};

// app/shared/tree-utils/find-instance.ts
var findInstanceById = (instance, id) => {
  if (instance.id === id)
    return instance;
  if (instance.children !== void 0)
    for (let child of instance.children) {
      if (typeof child == "string")
        continue;
      let foundInstance = findInstanceById(child, id);
      if (foundInstance !== void 0)
        return foundInstance;
    }
};

// app/shared/tree-utils/index.ts
var import_sdk12 = require("@webstudio-is/sdk");

// app/shared/tree-utils/set-instance-style.ts
var setInstanceStyleMutable = (rootInstance, id, updates, breakpoint) => {
  let instance = findInstanceById(rootInstance, id);
  if (instance === void 0)
    return !1;
  let cssRule = instance.cssRules.find((cssRule2) => cssRule2.breakpoint === breakpoint.id);
  cssRule === void 0 && (cssRule = { style: {}, breakpoint: breakpoint.id }, instance.cssRules.push(cssRule));
  for (let update2 of updates)
    cssRule.style[update2.property] = update2.value;
  return !0;
};

// app/shared/tree-utils/set-instance-children.ts
var setInstanceChildrenMutable = (id, updates, rootInstance) => {
  let instance = findInstanceById(rootInstance, id);
  if (instance === void 0)
    return !1;
  let children6 = [];
  for (let update2 of updates) {
    if (typeof update2 == "string") {
      children6.push(update2);
      continue;
    }
    if ("createInstance" in update2) {
      let childInstance = createInstance({
        id: update2.id,
        component: update2.component,
        children: [update2.text]
      });
      children6.push(childInstance);
      continue;
    }
    if ("text" in update2) {
      let childInstance = findInstanceById(instance, update2.id);
      if (childInstance === void 0)
        continue;
      children6.push(__spreadProps(__spreadValues({}, childInstance), { children: [update2.text] }));
      continue;
    }
    children6.push(update2);
  }
  return instance.children = children6, !0;
};

// app/shared/tree-utils/get-instance-path.ts
var getInstancePath = (instance, instanceId) => {
  let path = [], find = (instance2) => {
    if (instance2.id === instanceId)
      return !0;
    for (let child of instance2.children) {
      if (typeof child == "string")
        continue;
      if (find(child))
        return path.push(child), !0;
    }
  };
  return find(instance) && path.push(instance), path.reverse();
};

// app/shared/tree-utils/find-closest-sibling-instance.ts
var findClosestSiblingInstance = (instance, instanceId) => {
  if (instance.children.length === 0)
    return;
  let children6 = instance.children.filter((instance2) => typeof instance2 == "object"), index = children6.findIndex((instance2) => instance2.id === instanceId);
  if (index === -1)
    return;
  let nextInstance = children6[index + 1];
  return nextInstance !== void 0 ? nextInstance : children6[index - 1];
};

// app/shared/tree-utils/find-parent-instance.ts
var findParentInstance = (instance, instanceId) => {
  let find = (childInstance, parentInstance) => {
    if (childInstance.id === instanceId)
      return parentInstance;
    for (let child of childInstance.children) {
      if (typeof child == "string")
        continue;
      let foundInstance = find(child, childInstance);
      if (foundInstance !== void 0)
        return foundInstance;
    }
  };
  return find(instance);
};

// app/shared/tree-utils/clone-instance.ts
var import_bson_objectid2 = __toESM(require("bson-objectid")), import_immer = __toESM(require("immer")), updateIds = (instance) => {
  instance.id = (0, import_bson_objectid2.default)().toString();
  for (let child of instance.children)
    typeof child != "string" && updateIds(child);
}, cloneInstance = (instance) => (0, import_immer.default)(updateIds)(instance);

// app/shared/breakpoints/sort.ts
var sort = (breakpoints) => [...breakpoints].sort((breakpointA, breakpointB) => breakpointA.minWidth - breakpointB.minWidth);

// app/shared/db/tree.server.ts
var createRootInstance = (breakpoints) => {
  let defaultBreakpoint = sort(breakpoints)[0];
  if (defaultBreakpoint === void 0)
    throw new Error("A breakpoint with minWidth 0 is required");
  let rootConfig = {
    component: "Box",
    cssRules: [
      {
        breakpoint: defaultBreakpoint.id,
        style: {
          backgroundColor: {
            type: "keyword",
            value: "white"
          },
          fontFamily: {
            type: "keyword",
            value: "Arial"
          },
          fontSize: {
            type: "unit",
            unit: "px",
            value: 14
          },
          lineHeight: {
            type: "unit",
            unit: "number",
            value: 1.5
          },
          color: {
            type: "keyword",
            value: "#232323"
          },
          minHeight: {
            type: "unit",
            unit: "vh",
            value: 100
          },
          flexDirection: {
            type: "keyword",
            value: "column"
          }
        }
      }
    ]
  };
  return createInstance(rootConfig);
}, create = async (root) => {
  let newRoot = JSON.stringify(root);
  return await prisma.tree.create({
    data: { root: newRoot }
  });
}, loadById = async (treeId) => {
  let tree = await prisma.tree.findUnique({
    where: { id: treeId }
  });
  return tree === null ? null : __spreadProps(__spreadValues({}, tree), {
    root: JSON.parse(tree.root)
  });
}, loadByProject = async (project, env2 = "development") => {
  if (project === null)
    throw new Error("Project required");
  let treeId = env2 === "production" ? project.prodTreeId : project.devTreeId;
  if (treeId === null)
    throw new Error("Site needs to be published, production tree ID is null.");
  return await loadById(treeId);
}, clone = async (treeId) => {
  let tree = await loadById(treeId);
  if (tree === null)
    throw new Error(`Tree ${treeId} not found`);
  return await create(tree.root);
}, patchRoot = async ({ treeId }, patches) => {
  let tree = await loadById(treeId);
  if (tree === null)
    throw new Error(`Tree ${treeId} not found`);
  let root = (0, import_immer2.applyPatches)(tree.root, patches);
  await prisma.tree.update({
    data: { root: JSON.stringify(root) },
    where: { id: treeId }
  });
};

// app/shared/db/project.server.ts
var project_server_exports = {};
__export(project_server_exports, {
  clone: () => clone2,
  create: () => create2,
  loadByDomain: () => loadByDomain,
  loadById: () => loadById2,
  loadManyByUserId: () => loadManyByUserId,
  update: () => update
});
var import_slugify = __toESM(require("slugify")), import_nanoid = require("nanoid");
var parseProject = (project) => project ? __spreadProps(__spreadValues({}, project), {
  prodTreeIdHistory: JSON.parse(project.prodTreeIdHistory)
}) : null, loadById2 = async (projectId) => {
  if (typeof projectId != "string")
    throw new Error("Project ID required");
  let project = await prisma.project.findUnique({
    where: { id: projectId }
  });
  return parseProject(project);
}, loadByDomain = async (domain) => {
  let project = await prisma.project.findUnique({ where: { domain } });
  return parseProject(project);
}, loadManyByUserId = async (userId) => (await prisma.project.findMany({
  where: {
    User: {
      id: userId
    }
  }
})).map(parseProject), slugifyOptions = { lower: !0, strict: !0 }, MIN_DOMAIN_LENGTH = 10, MIN_TITLE_LENGTH = 2, generateDomain = (title) => {
  let slugifiedTitle = (0, import_slugify.default)(title, slugifyOptions);
  return `${slugifiedTitle}-${(0, import_nanoid.nanoid)(Math.max(MIN_DOMAIN_LENGTH - slugifiedTitle.length - 1, 5))}`;
}, create2 = async ({
  userId,
  title
}) => {
  if (title.length < MIN_TITLE_LENGTH)
    throw new Error(`Minimum ${MIN_TITLE_LENGTH} characters required`);
  let domain = generateDomain(title), breakpoints = breakpoints_server_exports.getBreakpointsWithId(), tree = await tree_server_exports.create(tree_server_exports.createRootInstance(breakpoints)), project = await prisma.project.create({
    data: {
      userId,
      title,
      domain,
      devTreeId: tree.id
    }
  });
  return await breakpoints_server_exports.create(tree.id, breakpoints), parseProject(project);
}, clone2 = async (clonableDomain, userId) => {
  let clonableProject = await loadByDomain(clonableDomain);
  if (clonableProject === null)
    throw new Error(`Not found project "${clonableDomain}"`);
  if (clonableProject.prodTreeId === null)
    throw new Error("Expected project to be published first");
  let tree = await tree_server_exports.clone(clonableProject.prodTreeId), domain = generateDomain(clonableProject.title), [project] = await Promise.all([
    prisma.project.create({
      data: {
        userId,
        title: clonableProject.title,
        domain,
        devTreeId: tree.id
      }
    }),
    props_server_exports.clone({
      previousTreeId: clonableProject.prodTreeId,
      nextTreeId: tree.id
    }),
    breakpoints_server_exports.clone({
      previousTreeId: clonableProject.prodTreeId,
      nextTreeId: tree.id
    })
  ]), parsedProject = parseProject(project);
  if (parsedProject === null)
    throw new Error(`Not found project "${clonableDomain}"`);
  return parsedProject;
}, update = async (_a) => {
  var _b = _a, {
    id
  } = _b, data = __objRest(_b, [
    "id"
  ]);
  if (data.domain && (data.domain = (0, import_slugify.default)(data.domain, slugifyOptions), data.domain.length < MIN_DOMAIN_LENGTH))
    throw new Error(`Minimum ${MIN_DOMAIN_LENGTH} characters required`);
  try {
    return await prisma.project.update({
      data: __spreadProps(__spreadValues({}, data), {
        prodTreeIdHistory: JSON.stringify(data.prodTreeIdHistory)
      }),
      where: { id }
    });
  } catch (error) {
    throw error instanceof import_client.Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? new Error(`Domain "${data.domain}" is already used`) : error;
  }
};

// app/shared/db/props.server.ts
var props_server_exports = {};
__export(props_server_exports, {
  clone: () => clone3,
  loadByProject: () => loadByProject2,
  loadByTreeId: () => loadByTreeId,
  patch: () => patch
});
var import_immer3 = require("immer");
var loadByProject2 = async (project, env2 = "development") => {
  if (project === null)
    throw new Error("Project required");
  let treeId = env2 === "production" ? project.prodTreeId : project.devTreeId;
  if (treeId === null)
    throw new Error("Site needs to be published, production tree ID is null.");
  return loadByTreeId(treeId);
}, loadByTreeId = async (treeId) => (await prisma.instanceProps.findMany({
  where: { treeId }
})).map((tree) => __spreadProps(__spreadValues({}, tree), {
  props: JSON.parse(tree.props)
})), clone3 = async ({
  previousTreeId,
  nextTreeId
}) => {
  let props2 = await prisma.instanceProps.findMany({
    where: { treeId: previousTreeId }
  });
  if (props2.length === 0)
    return;
  let data = props2.map((_a) => {
    var _b = _a, { id: _id, treeId: _treeId } = _b, rest = __objRest(_b, ["id", "treeId"]);
    return __spreadProps(__spreadValues({}, rest), {
      treeId: nextTreeId
    });
  });
  await prisma.$transaction(data.map((prop) => prisma.instanceProps.create({
    data: prop
  })));
}, patch = async ({ treeId }, patches) => {
  let allPropsMapByInstanceId = (await loadByTreeId(treeId)).reduce((acc, prop) => (acc[prop.instanceId] = prop, acc), {}), nextProps = (0, import_immer3.applyPatches)(allPropsMapByInstanceId, patches);
  await Promise.all(Object.values(nextProps).map(({ id, instanceId, treeId: treeId2, props: props2 }) => prisma.instanceProps.upsert({
    where: { id },
    create: { id, instanceId, treeId: treeId2, props: JSON.stringify(props2) },
    update: {
      props: JSON.stringify(props2)
    }
  })));
};

// app/shared/db/misc.server.ts
var misc_server_exports = {};
__export(misc_server_exports, {
  publish: () => publish
});
var publish = async ({
  projectId,
  domain
}) => {
  if (projectId === null)
    throw new Error("Project ID required");
  if (domain === null)
    throw new Error("Domain required");
  let project = await project_server_exports.loadById(projectId);
  if (project === null)
    throw new Error(`Project "${projectId}" not found`);
  let tree = await tree_server_exports.clone(project.devTreeId);
  await props_server_exports.clone({
    previousTreeId: project.devTreeId,
    nextTreeId: tree.id
  }), await breakpoints_server_exports.clone({
    previousTreeId: project.devTreeId,
    nextTreeId: tree.id
  });
  let prodTreeIdHistory = project.prodTreeIdHistory;
  return project.prodTreeId && prodTreeIdHistory.push(project.prodTreeId), await project_server_exports.update({
    id: projectId,
    domain,
    prodTreeId: tree.id,
    prodTreeIdHistory
  });
};

// app/shared/db/canvas.server.ts
var loadData = async (projectId) => {
  let project = await project_server_exports.loadById(projectId);
  if (project === null)
    throw new Error(`Project "${projectId}" not found`);
  let [tree, props2, breakpoints] = await Promise.all([
    tree_server_exports.loadByProject(project, "development"),
    props_server_exports.loadByProject(project, "development"),
    breakpoints_server_exports.load(project.devTreeId)
  ]);
  if (tree === null)
    throw new Error(`Tree ${project.devTreeId} not found for project ${projectId}`);
  if (breakpoints === null)
    throw new Error(`Breakpoints not found for project ${projectId}`);
  return {
    tree,
    props: props2,
    project,
    breakpoints: breakpoints.values
  };
}, loadCanvasData = async ({
  projectId
}) => await loadData(projectId), loadPreviewData = async ({
  projectId
}) => {
  let { tree, props: props2, breakpoints } = await loadData(projectId);
  return { tree, props: props2, breakpoints };
};

// app/shared/db/breakpoints.server.ts
var breakpoints_server_exports = {};
__export(breakpoints_server_exports, {
  clone: () => clone4,
  create: () => create3,
  getBreakpointsWithId: () => getBreakpointsWithId,
  load: () => load,
  patch: () => patch2
});
var import_sdk13 = require("@webstudio-is/sdk"), import_bson_objectid3 = __toESM(require("bson-objectid")), import_immer4 = require("immer");
var load = async (treeId) => {
  if (typeof treeId != "string")
    throw new Error("Tree ID required");
  let breakpoint = await prisma.breakpoints.findUnique({
    where: { treeId }
  });
  if (breakpoint === null)
    throw new Error("Breakpoint not found");
  return __spreadProps(__spreadValues({}, breakpoint), {
    values: JSON.parse(breakpoint.values)
  });
}, getBreakpointsWithId = () => import_sdk13.initialBreakpoints.map((breakpoint) => __spreadProps(__spreadValues({}, breakpoint), {
  id: (0, import_bson_objectid3.default)().toString()
})), create3 = async (treeId, breakpoints) => {
  let data = {
    treeId,
    values: JSON.stringify(breakpoints)
  };
  return await prisma.breakpoints.create({ data }), __spreadProps(__spreadValues({}, data), {
    breakpoints
  });
}, clone4 = async ({
  previousTreeId,
  nextTreeId
}) => {
  let breakpoints = await load(previousTreeId);
  if (breakpoints === null)
    throw new Error(`Didn't find breakpoints with tree id "${previousTreeId}"`);
  await create3(nextTreeId, breakpoints.values);
}, patch2 = async ({ treeId }, patches) => {
  let breakpoints = await load(treeId);
  if (breakpoints === null)
    return;
  let nextBreakpoints = (0, import_immer4.applyPatches)(breakpoints.values, patches);
  await prisma.breakpoints.update({
    where: { treeId },
    data: { values: nextBreakpoints }
  });
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/rest/breakpoints.$projectId.ts
var loader = async ({
  params
}) => {
  try {
    let project = await project_server_exports.loadById(params.projectId);
    if (project === null)
      throw new Error(`Project ${params.projectId} not found`);
    if (project.prodTreeId === null)
      throw new Error(`Project ${params.projectId} needs to be published first`);
    let data = await breakpoints_server_exports.load(project.prodTreeId);
    if (data === null)
      throw new Error(`Breakpoints not found for project ${params.projectId} and tree ID ${project.prodTreeId}`);
    return data.values;
  } catch (error) {
    if (error instanceof Error)
      return {
        errors: error.message
      };
  }
  return { errors: "Unexpected error" };
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/rest/project/clone.$domain.ts
var clone_domain_exports = {};
__export(clone_domain_exports, {
  loader: () => loader2
});
var import_node2 = require("@remix-run/node");

// app/shared/session/user.server.ts
var import_bson_objectid4 = __toESM(require("bson-objectid")), import_node = require("@remix-run/node"), userIdParser = (0, import_node.createCookie)("user-id", {
  maxAge: 604800
}), ensureUserCookie = async (request) => {
  let cookieString = request.headers.get("Cookie"), userId = await userIdParser.parse(cookieString);
  if (userId !== null)
    return { userId };
  let generatedUserId = (0, import_bson_objectid4.default)().toString();
  return {
    headers: {
      "Set-Cookie": await userIdParser.serialize(generatedUserId)
    },
    userId: userId || generatedUserId
  };
};

// app/shared/session/use-login-error-message.ts
var import_isNil = __toESM(require("lodash/isNil")), import_react18 = require("react"), import_react_router_dom = require("react-router-dom");
var AUTH_PROVIDERS = {
  LOGIN_DEV: "login_dev",
  LOGIN_GITHUB: "login_github",
  LOGIN_GOOGLE: "login_google"
}, LOGIN_ERROR_MESSAGES = {
  [AUTH_PROVIDERS.LOGIN_DEV]: "There has been an issue logging you in with dev",
  [AUTH_PROVIDERS.LOGIN_GITHUB]: "There has been an issue logging you in with Github",
  [AUTH_PROVIDERS.LOGIN_GOOGLE]: "There has been an issue logging you in with Google"
}, useLoginErrorMessage = () => {
  let [searchParams, setSearchParams] = (0, import_react_router_dom.useSearchParams)(), [messageToReturn, setMessageToReturn] = (0, import_react18.useState)("");
  return (0, import_react18.useEffect)(() => {
    let error = searchParams.get("error"), message = searchParams.get("message");
    if (error !== null && !(0, import_isNil.default)(message) && message !== "") {
      sentryException({
        message
      }), setMessageToReturn(message), setSearchParams({});
      return;
    }
    switch (error) {
      case AUTH_PROVIDERS.LOGIN_DEV:
        setMessageToReturn(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_DEV]);
        break;
      case AUTH_PROVIDERS.LOGIN_GITHUB:
        setMessageToReturn(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_GITHUB]);
        break;
      case AUTH_PROVIDERS.LOGIN_GOOGLE:
        setMessageToReturn(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_GOOGLE]);
        break;
      default:
        break;
    }
    setSearchParams({});
  }, [searchParams, setSearchParams]), messageToReturn;
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/rest/project/clone.$domain.ts
var ensureProject = async ({
  userId,
  domain
}) => {
  let projects = await project_server_exports.loadManyByUserId(userId);
  return projects.length !== 0 ? projects[0] : await project_server_exports.clone(domain, userId);
}, loader2 = async ({ request, params }) => {
  if (params.domain === void 0)
    return { errors: "Domain required" };
  let { headers, userId } = await ensureUserCookie(request);
  try {
    let project = await ensureProject({ userId, domain: params.domain });
    return (0, import_node2.redirect)(`${config_default.designerPath}/${project == null ? void 0 : project.id}`, { headers });
  } catch (error) {
    if (error instanceof Error)
      return { errors: error.message };
  }
  return { errors: "Unexpected error" };
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/rest/props.$projectId.ts
var props_projectId_exports = {};
__export(props_projectId_exports, {
  loader: () => loader3
});
var loader3 = async ({
  params
}) => {
  try {
    let project = await project_server_exports.loadById(params.projectId);
    return await props_server_exports.loadByProject(project, "production");
  } catch (error) {
    if (error instanceof Error)
      return {
        errors: error.message
      };
  }
  return { errors: "Unexpected error" };
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/rest/tree.$projectId.ts
var tree_projectId_exports = {};
__export(tree_projectId_exports, {
  loader: () => loader4
});
var loader4 = async ({
  params
}) => {
  try {
    let project = await project_server_exports.loadById(params.projectId);
    return await tree_server_exports.loadByProject(project, "production");
  } catch (error) {
    if (error instanceof Error)
      return {
        errors: error.message
      };
  }
  return { errors: "Unexpected error" };
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/rest/publish.ts
var publish_exports = {};
__export(publish_exports, {
  action: () => action
});
var action = async ({ request }) => {
  let formData = await request.formData(), domain = formData.get("domain"), projectId = formData.get("projectId");
  try {
    return { domain: (await misc_server_exports.publish({ projectId, domain })).domain };
  } catch (error) {
    if (error instanceof Error)
      return {
        errors: error.message
      };
  }
  return { errors: "Unexpected error" };
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/auth/github.tsx
var github_exports = {};
__export(github_exports, {
  action: () => action2,
  default: () => GH
});
var import_node4 = require("@remix-run/node");

// app/services/auth.server.ts
var import_remix_auth = require("remix-auth"), import_remix_auth_form = require("remix-auth-form"), import_remix_auth_github = require("remix-auth-github"), import_remix_auth_google = require("remix-auth-google");

// app/services/session.server.ts
var import_node3 = require("@remix-run/node"), sessionStorage = (0, import_node3.createCookieSessionStorage)({
  cookie: {
    maxAge: 60 * 60 * 24 * 30,
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: !0,
    secrets: process.env.AUTH_SECRET ? [process.env.AUTH_SECRET] : void 0,
    secure: !1
  }
}), { getSession, commitSession, destroySession } = sessionStorage;

// app/shared/db/user.server.ts
var genericCreateAccount = async (userData, userId) => {
  if (await prisma.user.findUnique({
    where: {
      id: userId
    }
  })) {
    let connectedUser = await prisma.user.update({
      where: {
        id: userId
      },
      data: userData
    });
    return connectedUser.teamId || await prisma.team.create({
      data: {
        users: {
          connect: {
            id: connectedUser.id
          }
        }
      }
    }), connectedUser;
  }
  let existingUserWithEmail = await prisma.user.findUnique({
    where: {
      email: userData.email
    }
  });
  return existingUserWithEmail ? (existingUserWithEmail.teamId || await prisma.team.create({
    data: {
      users: {
        connect: {
          id: existingUserWithEmail.id
        }
      }
    }
  }), existingUserWithEmail) : (await prisma.team.create({
    data: {
      users: {
        create: __spreadValues({
          id: userId
        }, userData)
      }
    },
    include: {
      users: {
        where: {
          id: userId
        }
      }
    }
  })).users[0];
}, createOrLoginWithGithub = async (profile, userId) => {
  let userData = {
    email: profile._json.email,
    username: profile.displayName,
    image: profile._json.avatar_url,
    provider: profile.provider
  };
  return await genericCreateAccount(userData, userId);
}, createOrLoginWithGoogle = async (profile, userId) => {
  let userData = {
    email: profile._json.email,
    username: profile.displayName,
    image: profile._json.picture,
    provider: profile.provider
  };
  return await genericCreateAccount(userData, userId);
}, createOrLoginWithDev = async (userId) => await genericCreateAccount({
  email: "hello@webstudio.is",
  username: "admin",
  image: "",
  provider: "dev"
}, userId);

// app/services/auth.server.ts
var url = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3e3}`}${config_default.authPath}`, github = new import_remix_auth_github.GitHubStrategy({
  clientID: process.env.GH_CLIENT_ID,
  clientSecret: process.env.GH_CLIENT_SECRET,
  callbackURL: `${url}${config_default.githubCallbackPath}`
}, async ({ profile, context }) => await createOrLoginWithGithub(profile, context == null ? void 0 : context.userId)), google = new import_remix_auth_google.GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${url}${config_default.googleCallbackPath}`
}, async ({ profile, context }) => await createOrLoginWithGoogle(profile, context == null ? void 0 : context.userId)), authenticator = new import_remix_auth.Authenticator(sessionStorage);
process.env.GH_CLIENT_ID && process.env.GH_CLIENT_SECRET && authenticator.use(github, "github");
process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && authenticator.use(google, "google");
process.env.DEV_LOGIN === "true" && authenticator.use(new import_remix_auth_form.FormStrategy(async ({ form }) => {
  let secret = form.get("secret");
  if (secret === process.env.AUTH_SECRET)
    try {
      return await createOrLoginWithDev(secret);
    } catch (error) {
      error instanceof Error && sentryException({
        message: error.message,
        extra: {
          loginMethod: AUTH_PROVIDERS.LOGIN_DEV
        }
      });
    }
  throw new Error("The dev login code is incorrect");
}), "dev");

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/auth/github.tsx
function GH() {
  return null;
}
var action2 = async ({ request }) => {
  try {
    let { userId } = await ensureUserCookie(request);
    return await authenticator.authenticate("github", request, {
      context: {
        userId
      },
      successRedirect: config_default.dashboardPath,
      throwOnError: !0
    });
  } catch (error) {
    if (error instanceof Response)
      return error;
    if (error instanceof Error)
      return sentryException({
        message: error.message,
        extra: {
          loginMethod: AUTH_PROVIDERS.LOGIN_GITHUB
        }
      }), (0, import_node4.redirect)(`${config_default.loginPath}?error=${AUTH_PROVIDERS.LOGIN_GITHUB}&message=${(error == null ? void 0 : error.message) || ""}`);
  }
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/auth/github/callback.tsx
var callback_exports = {};
__export(callback_exports, {
  loader: () => loader5
});
var import_node5 = require("@remix-run/node");
var loader5 = async ({ request }) => {
  let { userId } = await ensureUserCookie(request), url2 = new URL(request.url), error = url2.searchParams.get("error"), error_description = url2.searchParams.get("error_description");
  return error ? (0, import_node5.redirect)(`${config_default.loginPath}?error=${AUTH_PROVIDERS.LOGIN_GITHUB}&message=${error_description || error}`) : authenticator.authenticate("github", request, {
    context: {
      userId
    },
    successRedirect: config_default.dashboardPath,
    failureRedirect: config_default.loginPath
  });
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/auth/google.tsx
var google_exports = {};
__export(google_exports, {
  action: () => action3,
  default: () => Google,
  loader: () => loader6
});
var import_node6 = require("@remix-run/node");
function Google() {
  return null;
}
var loader6 = () => (0, import_node6.redirect)("/login"), action3 = async ({ request }) => {
  try {
    let { userId } = await ensureUserCookie(request);
    return await authenticator.authenticate("google", request, {
      context: {
        userId
      },
      successRedirect: config_default.dashboardPath,
      throwOnError: !0
    });
  } catch (error) {
    if (error instanceof Response)
      return error;
    if (error instanceof Error)
      return sentryException({
        message: error.message,
        extra: {
          loginMethod: AUTH_PROVIDERS.LOGIN_GOOGLE
        }
      }), (0, import_node6.redirect)(`${config_default.loginPath}?error=${AUTH_PROVIDERS.LOGIN_GOOGLE}&message=${(error == null ? void 0 : error.message) || ""}`);
  }
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/auth/google/callback.tsx
var callback_exports2 = {};
__export(callback_exports2, {
  loader: () => loader7
});
var loader7 = async ({ request }) => {
  let { userId } = await ensureUserCookie(request);
  return authenticator.authenticate("google", request, {
    successRedirect: config_default.dashboardPath,
    failureRedirect: config_default.loginPath,
    context: {
      userId
    }
  });
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/rest/patch.ts
var patch_exports = {};
__export(patch_exports, {
  action: () => action4
});
var updaters = {
  root: tree_server_exports.patchRoot,
  props: props_server_exports.patch,
  breakpoints: breakpoints_server_exports.patch
}, action4 = async ({ request }) => {
  let { treeId, projectId, transactions } = await request.json();
  if (treeId === void 0)
    return { errors: "Tree id required" };
  if (projectId === void 0)
    return { errors: "Project id required" };
  for await (let transaction of transactions)
    for await (let change of transaction.changes) {
      let { namespace: namespace2, patches } = change;
      if (!(namespace2 in updaters))
        return { errors: `Unknown namespace "${namespace2}"` };
      await updaters[namespace2]({ treeId, projectId }, patches);
    }
  return { status: "ok" };
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/dashboard.tsx
var dashboard_exports = {};
__export(dashboard_exports, {
  default: () => dashboard_default,
  loader: () => loader8,
  meta: () => meta
});

// app/shared/documents/designer.tsx
var import_react19 = require("@remix-run/react"), import_sdk14 = require("@webstudio-is/sdk");
var Designer = () => /* @__PURE__ */ React.createElement("html", {
  lang: "en"
}, /* @__PURE__ */ React.createElement("head", null, /* @__PURE__ */ React.createElement("meta", {
  charSet: "utf-8"
}), /* @__PURE__ */ React.createElement("meta", {
  name: "viewport",
  content: "width=device-width,initial-scale=1"
}), /* @__PURE__ */ React.createElement(import_react19.Meta, null), /* @__PURE__ */ React.createElement(import_react19.Links, null), /* @__PURE__ */ React.createElement(import_sdk14.CriticalCss, null)), /* @__PURE__ */ React.createElement("body", {
  className: darkTheme
}, /* @__PURE__ */ React.createElement(import_react19.Outlet, null), /* @__PURE__ */ React.createElement(Env, null), /* @__PURE__ */ React.createElement(import_react19.Scripts, null), /* @__PURE__ */ React.createElement(import_react19.LiveReload, null)));

// app/env.server.ts
var env = {
  SENTRY_DSN: process.env.SENTRY_DSN,
  VERCEL_ENV: process.env.VERCEL_ENV
}, env_server_default = env;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/dashboard.tsx
var loader8 = () => ({
  env: env_server_default
}), meta = () => ({ title: "Webstudio Dashboard" }), dashboard_default = Designer;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/dashboard/index.tsx
var dashboard_exports2 = {};
__export(dashboard_exports2, {
  action: () => action5,
  default: () => dashboard_default3,
  links: () => links,
  loader: () => loader9
});
var import_react24 = require("@remix-run/react"), import_node7 = require("@remix-run/node");

// app/dashboard/dashboard.tsx
var import_react23 = require("@remix-run/react");

// app/shared/font-faces/inter.css
var inter_default = "/build/_assets/inter-775NUFJE.css";

// app/dashboard/dashboard.css
var dashboard_default2 = "/build/_assets/dashboard-XMYFQPQX.css";

// app/dashboard/components/header.tsx
var import_react_icons = require("@radix-ui/react-icons");

// app/shared/design-system/components/avatar.tsx
var import_react20 = __toESM(require("react"));
var AvatarPrimitive = __toESM(require("@radix-ui/react-avatar"));

// app/shared/design-system/components/status.tsx
var Status = styled("div", {
  borderRadius: "50%",
  flexShrink: 0,
  variants: {
    size: {
      "1": {
        width: 5,
        height: 5
      },
      "2": {
        width: 9,
        height: 9
      }
    },
    variant: {
      gray: {
        backgroundColor: "$slate7"
      },
      blue: {
        backgroundColor: "$blue9"
      },
      green: {
        backgroundColor: "$green9"
      },
      yellow: {
        backgroundColor: "$yellow9"
      },
      red: {
        backgroundColor: "$red9"
      }
    }
  },
  defaultVariants: {
    size: "2",
    variant: "gray"
  }
});

// app/shared/design-system/components/avatar.tsx
var StyledAvatar = styled(AvatarPrimitive.Root, {
  alignItems: "center",
  justifyContent: "center",
  verticalAlign: "middle",
  overflow: "hidden",
  userSelect: "none",
  boxSizing: "border-box",
  display: "flex",
  flexShrink: 0,
  position: "relative",
  border: "none",
  fontFamily: "inherit",
  lineHeight: "1",
  margin: "0",
  outline: "none",
  padding: "0",
  fontWeight: "500",
  color: "$hiContrast",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: "inherit",
    boxShadow: "inset 0px 0px 1px rgba(0, 0, 0, 0.12)"
  },
  variants: {
    size: {
      "1": {
        width: "$3",
        height: "$3"
      },
      "2": {
        width: "$5",
        height: "$5"
      },
      "3": {
        width: "$6",
        height: "$6"
      },
      "4": {
        width: "$7",
        height: "$7"
      },
      "5": {
        width: "$8",
        height: "$8"
      },
      "6": {
        width: "$9",
        height: "$9"
      }
    },
    variant: {
      hiContrast: {
        backgroundColor: "$hiContrast",
        color: "$loContrast"
      },
      gray: {
        backgroundColor: "$slate5"
      },
      tomato: {
        backgroundColor: "$tomato5"
      },
      red: {
        backgroundColor: "$red5"
      },
      crimson: {
        backgroundColor: "$crimson5"
      },
      pink: {
        backgroundColor: "$pink5"
      },
      plum: {
        backgroundColor: "$plum5"
      },
      purple: {
        backgroundColor: "$purple5"
      },
      violet: {
        backgroundColor: "$violet5"
      },
      indigo: {
        backgroundColor: "$indigo5"
      },
      blue: {
        backgroundColor: "$blue5"
      },
      cyan: {
        backgroundColor: "$cyan5"
      },
      teal: {
        backgroundColor: "$teal5"
      },
      green: {
        backgroundColor: "$green5"
      },
      grass: {
        backgroundColor: "$grass5"
      },
      brown: {
        backgroundColor: "$brown5"
      },
      bronze: {
        backgroundColor: "$bronze5"
      },
      gold: {
        backgroundColor: "$gold5"
      },
      sky: {
        backgroundColor: "$sky5"
      },
      mint: {
        backgroundColor: "$mint5"
      },
      lime: {
        backgroundColor: "$lime5"
      },
      yellow: {
        backgroundColor: "$yellow5"
      },
      amber: {
        backgroundColor: "$amber5"
      },
      orange: {
        backgroundColor: "$orange5"
      }
    },
    shape: {
      square: {
        borderRadius: "$2"
      },
      circle: {
        borderRadius: "50%"
      }
    },
    inactive: {
      true: {
        opacity: ".3"
      }
    },
    interactive: {
      true: {
        "&::after": {
          content: '""',
          position: "absolute",
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
          backgroundColor: "rgba(0,0,0,.08)",
          opacity: "0",
          pointerEvents: "none",
          transition: "opacity 25ms linear"
        },
        "@hover": {
          "&:hover": {
            "&::after": {
              opacity: "1"
            }
          }
        },
        '&[data-state="open"]': {
          "&::after": {
            backgroundColor: "rgba(0,0,0,.12)",
            opacity: "1"
          }
        }
      }
    }
  },
  defaultVariants: {
    size: "2",
    variant: "gray",
    shape: "circle"
  }
}), StyledAvatarImage = styled(AvatarPrimitive.Image, {
  display: "flex",
  objectFit: "cover",
  boxSizing: "border-box",
  height: "100%",
  verticalAlign: "middle",
  width: "100%"
}), StyledAvatarFallback = styled(AvatarPrimitive.Fallback, {
  textTransform: "uppercase",
  borderRadius: "50%",
  variants: {
    size: {
      "1": {
        fontSize: "10px",
        lineHeight: "15px"
      },
      "2": {
        fontSize: "$3"
      },
      "3": {
        fontSize: "$6"
      },
      "4": {
        fontSize: "$7"
      },
      "5": {
        fontSize: "$8"
      },
      "6": {
        fontSize: "$9"
      }
    }
  },
  defaultVariants: {
    size: "2"
  }
}), AvatarNestedItem = styled("div", {
  boxShadow: "0 0 0 2px $colors$loContrast",
  borderRadius: "50%"
}), AvatarGroup = styled("div", {
  display: "flex",
  flexDirection: "row-reverse",
  [`& ${AvatarNestedItem}:nth-child(n+2)`]: {
    marginRight: "-$1"
  }
}), Avatar = import_react20.default.forwardRef((_a, forwardedRef) => {
  var _b = _a, { alt, src, fallback, size, variant, shape, css: css2, status } = _b, props2 = __objRest(_b, ["alt", "src", "fallback", "size", "variant", "shape", "css", "status"]);
  return /* @__PURE__ */ import_react20.default.createElement(Box, {
    css: __spreadProps(__spreadValues({}, css2), {
      position: "relative",
      height: "fit-content",
      width: "fit-content"
    })
  }, /* @__PURE__ */ import_react20.default.createElement(StyledAvatar, __spreadProps(__spreadValues({}, props2), {
    ref: forwardedRef,
    size,
    variant,
    shape
  }), /* @__PURE__ */ import_react20.default.createElement(StyledAvatarImage, {
    alt,
    src
  }), /* @__PURE__ */ import_react20.default.createElement(StyledAvatarFallback, {
    size
  }, fallback)), status && /* @__PURE__ */ import_react20.default.createElement(Box, {
    css: {
      position: "absolute",
      bottom: "0",
      right: "0",
      boxShadow: "0 0 0 3px $colors$loContrast",
      borderRadius: "$round",
      mr: "-3px",
      mb: "-3px"
    }
  }, /* @__PURE__ */ import_react20.default.createElement(Status, {
    size: size && size > 2 ? "2" : "1",
    variant: status
  })));
});
Avatar.displayName = "Avatar";

// app/dashboard/components/header.tsx
var import_react_router_dom2 = require("react-router-dom"), DashboardHeader = ({ user }) => {
  let navigate = (0, import_react_router_dom2.useNavigate)(), userNameFallback = ((user == null ? void 0 : user.username) || (user == null ? void 0 : user.email) || "X").charAt(0).toLocaleUpperCase();
  return /* @__PURE__ */ React.createElement(Flex, {
    as: "header",
    align: "center",
    justify: "end",
    css: {
      p: "$1",
      bc: "$loContrast",
      borderBottom: "1px solid $slate8"
    }
  }, /* @__PURE__ */ React.createElement(Flex, {
    gap: "1",
    align: "center"
  }, /* @__PURE__ */ React.createElement(DropdownMenu, null, /* @__PURE__ */ React.createElement(DropdownMenuTrigger, {
    asChild: !0
  }, /* @__PURE__ */ React.createElement(Button, {
    variant: "raw",
    "aria-label": "Menu Button"
  }, /* @__PURE__ */ React.createElement(Flex, {
    gap: "1",
    align: "center",
    css: { height: "$5" }
  }, /* @__PURE__ */ React.createElement(Avatar, {
    src: (user == null ? void 0 : user.image) || void 0,
    fallback: userNameFallback
  }), /* @__PURE__ */ React.createElement(import_react_icons.ChevronDownIcon, {
    width: 15,
    height: 15,
    color: "white"
  })))), /* @__PURE__ */ React.createElement(DropdownMenuContent, null, /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    onSelect: () => navigate("/logout")
  }, /* @__PURE__ */ React.createElement(Text, null, "Logout"))))));
};

// app/dashboard/components/card.tsx
var import_react21 = require("react"), import_react22 = require("@remix-run/react"), import_react_router_dom3 = require("react-router-dom");
var SelectProjectCard = ({
  projects,
  config: config4,
  errors
}) => {
  let [selectedProject, setSelectedProject] = (0, import_react21.useState)(""), [newProject, setNewProject] = (0, import_react21.useState)("My awesome project"), navigate = (0, import_react_router_dom3.useNavigate)(), transition = (0, import_react22.useTransition)(), handleOpen = () => {
    navigate(`${config4.designerPath}/${selectedProject}`);
  }, options2 = ["", ...projects.map((project) => project.id)];
  return /* @__PURE__ */ React.createElement(Card, {
    size: 2
  }, /* @__PURE__ */ React.createElement(Flex, {
    direction: "column",
    gap: "4"
  }, /* @__PURE__ */ React.createElement(Heading, {
    size: "2",
    css: { textAlign: "center" }
  }, "Select a project"), /* @__PURE__ */ React.createElement(Select, {
    size: 2,
    name: "project",
    options: options2,
    onChange: setSelectedProject,
    value: selectedProject,
    placeholder: "Create new project",
    getLabel: (option) => {
      var _a;
      return ((_a = projects.find((project) => project.id === option)) == null ? void 0 : _a.title) || "Create new project";
    }
  }), selectedProject === "" ? /* @__PURE__ */ React.createElement(import_react22.Form, {
    method: "post"
  }, /* @__PURE__ */ React.createElement(Flex, {
    gap: "1"
  }, /* @__PURE__ */ React.createElement(TextField, {
    size: 2,
    state: errors ? "invalid" : void 0,
    name: "project",
    defaultValue: newProject,
    onFocus: (event) => {
      event.target.select();
    },
    onChange: (event) => {
      setNewProject(event.target.value);
    }
  }), /* @__PURE__ */ React.createElement(Button, {
    size: 2,
    disabled: newProject.length === 0 || transition.state === "submitting",
    type: "submit"
  }, transition.state === "submitting" ? "Creating..." : "Create")), errors ? /* @__PURE__ */ React.createElement(Text, {
    variant: "red",
    css: { marginTop: "$1" }
  }, errors) : null) : /* @__PURE__ */ React.createElement(Button, {
    onClick: handleOpen,
    size: 2
  }, "Open")));
};

// app/dashboard/dashboard.tsx
var links = () => [
  {
    rel: "stylesheet",
    href: inter_default
  },
  {
    rel: "stylesheet",
    href: dashboard_default2
  }
], Dashboard = ({ projects = [], config: config4, user }) => {
  let actionData = (0, import_react23.useActionData)();
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(DashboardHeader, {
    user
  }), /* @__PURE__ */ React.createElement(Flex, {
    css: { height: "100vh" },
    direction: "column",
    align: "center",
    justify: "center"
  }, /* @__PURE__ */ React.createElement(SelectProjectCard, {
    projects,
    config: config4,
    errors: actionData == null ? void 0 : actionData.errors
  })));
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/dashboard/index.tsx
var action5 = async ({ request }) => {
  let title = (await request.formData()).get("project");
  if (typeof title != "string")
    return { errors: "Title required" };
  let { userId, headers } = await ensureUserCookie(request), authenticatedUser = await authenticator.isAuthenticated(request);
  try {
    let project = await project_server_exports.create({
      title,
      userId: (authenticatedUser == null ? void 0 : authenticatedUser.id) || userId
    });
    return (0, import_node7.redirect)(`${config_default.designerPath}/${project == null ? void 0 : project.id}`, { headers });
  } catch (error) {
    if (error instanceof Error)
      return { errors: error.message };
  }
  return { errors: "Unexpected error" };
}, loader9 = async ({ request }) => {
  let user = await authenticator.isAuthenticated(request);
  if (!user)
    return (0, import_node7.redirect)(config_default.loginPath);
  let { headers } = await ensureUserCookie(request), projects = await project_server_exports.loadManyByUserId(user.id);
  return (0, import_node7.json)({ config: config_default, projects, user }, headers);
}, DashboardRoute = () => {
  let { config: config4, projects, user } = (0, import_react24.useLoaderData)();
  return /* @__PURE__ */ React.createElement(Dashboard, {
    config: config4,
    user,
    projects
  });
}, dashboard_default3 = DashboardRoute;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/auth/dev.tsx
var dev_exports = {};
__export(dev_exports, {
  action: () => action6,
  default: () => Dev
});
var import_node8 = require("@remix-run/node");
function Dev() {
  return null;
}
var action6 = async ({ request }) => {
  try {
    return await authenticator.authenticate("dev", request, {
      successRedirect: config_default.dashboardPath,
      throwOnError: !0
    });
  } catch (error) {
    if (error instanceof Response)
      return error;
    if (error instanceof Error)
      return (0, import_node8.redirect)(`${config_default.loginPath}?error=${AUTH_PROVIDERS.LOGIN_DEV}&message=${(error == null ? void 0 : error.message) || ""}`);
  }
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/designer.tsx
var designer_exports = {};
__export(designer_exports, {
  default: () => designer_default,
  loader: () => loader10,
  meta: () => meta2
});
var loader10 = () => ({
  env: env_server_default
}), meta2 = () => ({ title: "Webstudio" }), designer_default = Designer;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/designer/$id.tsx
var id_exports = {};
__export(id_exports, {
  default: () => id_default,
  links: () => links2,
  loader: () => loader11
});
var import_react59 = require("@remix-run/react");

// app/designer/designer.tsx
var import_react58 = require("react"), import_react_dnd3 = require("react-dnd"), import_react_dnd_html5_backend2 = require("react-dnd-html5-backend"), import_sdk33 = require("@webstudio-is/sdk");

// app/designer/features/sidebar-left/sidebar-left.tsx
var import_react30 = require("react"), import_sdk16 = require("@webstudio-is/sdk");

// app/designer/shared/nano-states/index.ts
var import_react_nano_state = require("react-nano-state"), selectedInstanceDataContainer = (0, import_react_nano_state.createValueContainer)(), useSelectedInstanceData = () => (0, import_react_nano_state.useValue)(selectedInstanceDataContainer), hoveredInstanceDataContainer = (0, import_react_nano_state.createValueContainer)(), useHoveredInstanceData = () => (0, import_react_nano_state.useValue)(hoveredInstanceDataContainer), isShareDialogOpenContainer = (0, import_react_nano_state.createValueContainer)(!1), useIsShareDialogOpen = () => (0, import_react_nano_state.useValue)(isShareDialogOpenContainer), isPublishDialogOpenContainer = (0, import_react_nano_state.createValueContainer)(!1), useIsPublishDialogOpen = () => (0, import_react_nano_state.useValue)(isPublishDialogOpenContainer), selectedBreakpointContainer = (0, import_react_nano_state.createValueContainer)(), useSelectedBreakpoint = () => (0, import_react_nano_state.useValue)(selectedBreakpointContainer), zoomContainer = (0, import_react_nano_state.createValueContainer)(100), useZoom = () => (0, import_react_nano_state.useValue)(zoomContainer), canvasWidthContainer = (0, import_react_nano_state.createValueContainer)(0), useCanvasWidth = () => (0, import_react_nano_state.useValue)(canvasWidthContainer), canvasRectContainer = (0, import_react_nano_state.createValueContainer)(), useCanvasRect = () => (0, import_react_nano_state.useValue)(canvasRectContainer), syncStatusContainer = (0, import_react_nano_state.createValueContainer)("idle"), useSyncStatus = () => (0, import_react_nano_state.useValue)(syncStatusContainer), selectionRectContainer = (0, import_react_nano_state.createValueContainer)(), useSelectionRect = () => (0, import_react_nano_state.useValue)(selectionRectContainer);

// app/designer/features/sidebar-left/panels/index.ts
var panels_exports = {};
__export(panels_exports, {
  components: () => components_exports,
  tree: () => tree_exports
});

// app/designer/features/sidebar-left/panels/components/index.ts
var components_exports = {};
__export(components_exports, {
  TabContent: () => TabContent,
  icon: () => icon
});

// app/designer/features/sidebar-left/panels/components/components.tsx
var import_react27 = require("react"), import_react_dnd2 = require("react-dnd"), import_react_dnd_html5_backend = require("react-dnd-html5-backend");

// app/designer/features/sidebar-left/panels/components/custom-drag-layer.tsx
var import_react26 = require("react"), import_react_dom = require("react-dom"), import_react_dnd = require("react-dnd");

// app/designer/features/sidebar-left/panels/components/component-thumb.tsx
var import_react25 = require("react");
var Thumb3 = styled(Flex, {
  px: 5,
  width: 75,
  height: 75,
  border: "1px solid $slate6",
  userSelect: "none",
  color: "$hiContrast",
  cursor: "grab",
  "&:hover": {
    background: "$slate3"
  },
  variants: {
    state: {
      dragging: {
        background: "$slate3"
      }
    }
  }
}), ComponentThumb = (0, import_react25.forwardRef)((_a, ref) => {
  var _b = _a, { component } = _b, rest = __objRest(_b, ["component"]);
  let { Icon: Icon2, label: label11 } = primitives_exports[component];
  return /* @__PURE__ */ React.createElement(Thumb3, __spreadValues({
    direction: "column",
    align: "center",
    justify: "center",
    gap: "3",
    ref
  }, rest), /* @__PURE__ */ React.createElement(Icon2, {
    width: 30,
    height: 30
  }), /* @__PURE__ */ React.createElement(Text, {
    size: "1"
  }, label11));
});
ComponentThumb.displayName = "ComponentThumb";

// app/designer/features/sidebar-left/panels/components/custom-drag-layer.tsx
var layerStyles = {
  position: "absolute",
  pointerEvents: "none",
  zIndex: 1,
  left: 0,
  top: 0,
  width: "100%",
  height: "100%"
}, CustomDragLayer = ({ onDrag }) => {
  let { component, isDragging, clientOffset, sourceClientOffset } = (0, import_react_dnd.useDragLayer)((monitor) => ({
    component: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset(),
    sourceClientOffset: monitor.getSourceClientOffset()
  })), [canvasRect] = useCanvasRect(), [zoom] = useZoom();
  return (0, import_react26.useEffect)(() => {
    if (clientOffset === null || component === null || canvasRect === void 0)
      return;
    let scale = zoom / 100, currentOffset = {
      x: (clientOffset.x - canvasRect.x) / scale,
      y: (clientOffset.y - canvasRect.y) / scale
    };
    onDrag({
      currentOffset,
      component
    });
  }, [clientOffset, component, onDrag, zoom, canvasRect]), isDragging === !1 || sourceClientOffset === null ? null : (0, import_react_dom.createPortal)(/* @__PURE__ */ React.createElement("div", {
    style: layerStyles
  }, /* @__PURE__ */ React.createElement(ComponentThumb, {
    component,
    style: {
      transform: `translate3d(${sourceClientOffset.x}px, ${sourceClientOffset.y}px, 0)`
    },
    state: "dragging"
  })), document.body);
};

// app/designer/features/sidebar-left/panels/components/components.tsx
var useDraggable = ({ component, onDragChange }) => {
  let lastIsDragging = (0, import_react27.useRef)(), [{ isDragging }, dragRef, preview] = (0, import_react_dnd2.useDrag)(() => ({
    type: component,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), []);
  return (0, import_react27.useEffect)(() => {
    lastIsDragging.current !== void 0 && onDragChange(isDragging), lastIsDragging.current = isDragging;
  }, [isDragging, onDragChange]), (0, import_react27.useEffect)(() => {
    preview((0, import_react_dnd_html5_backend.getEmptyImage)(), { captureDraggingState: !0 });
  }, [preview]), dragRef;
}, DraggableThumb = ({
  component,
  onDragChange,
  onClick
}) => {
  let dragRef = useDraggable({ component, onDragChange });
  return /* @__PURE__ */ React.createElement(ComponentThumb, {
    component,
    ref: dragRef,
    onClick
  });
}, TabContent = ({
  onDragChange,
  publish: publish12,
  onSetActiveTab
}) => {
  let components11 = Object.keys(primitives_exports).filter((component) => primitives_exports[component].isInlineOnly === !1), handleDragChange = (0, import_react27.useCallback)((isDragging) => {
    onDragChange(isDragging), publish12({
      type: isDragging === !0 ? "dragStartInstance" : "dragEndInstance"
    });
  }, [onDragChange, publish12]);
  return /* @__PURE__ */ React.createElement(Flex, {
    gap: "1",
    wrap: "wrap",
    css: { padding: "$1" }
  }, components11.map((component) => /* @__PURE__ */ React.createElement(DraggableThumb, {
    key: component,
    component,
    onClick: () => {
      onSetActiveTab("none"), publish12({
        type: "insertInstance",
        payload: { instance: createInstance({ component }) }
      });
    },
    onDragChange: handleDragChange
  })), /* @__PURE__ */ React.createElement(CustomDragLayer, {
    onDrag: (dragData) => {
      publish12({
        type: "dragInstance",
        payload: {
          instance: createInstance({ component: dragData.component }),
          currentOffset: dragData.currentOffset
        }
      });
    }
  }));
}, icon = /* @__PURE__ */ React.createElement(icons_exports.PlusIcon, null);

// app/designer/features/sidebar-left/panels/tree.tsx
var tree_exports = {};
__export(tree_exports, {
  TabContent: () => TabContent2,
  icon: () => icon2
});

// app/designer/shared/instance/use-selected-instance-path.ts
var import_react28 = require("react");

// app/shared/nano-states/nano-states.ts
var import_react_nano_state2 = require("react-nano-state"), rootInstanceContainer = (0, import_react_nano_state2.createValueContainer)(), useRootInstance = () => (0, import_react_nano_state2.useValue)(rootInstanceContainer), breakpointsContainer = (0, import_react_nano_state2.createValueContainer)([]), useBreakpoints = () => (0, import_react_nano_state2.useValue)(breakpointsContainer), isPreviewModeContainer = (0, import_react_nano_state2.createValueContainer)(!1), useIsPreviewMode = () => (0, import_react_nano_state2.useValue)(isPreviewModeContainer), selectedInstanceRectContainer = (0, import_react_nano_state2.createValueContainer)(), useSelectedInstanceRect = () => (0, import_react_nano_state2.useValue)(selectedInstanceRectContainer), hoveredInstanceRectContainer = (0, import_react_nano_state2.createValueContainer)(), useHoveredInstanceRect = () => (0, import_react_nano_state2.useValue)(hoveredInstanceRectContainer), isScrollingContainer = (0, import_react_nano_state2.createValueContainer)(!1), useIsScrolling = () => (0, import_react_nano_state2.useValue)(isScrollingContainer), textEditingInstanceIdContainer = (0, import_react_nano_state2.createValueContainer)(), useTextEditingInstanceId = () => (0, import_react_nano_state2.useValue)(textEditingInstanceIdContainer);

// app/shared/nano-states/use-subscribe-scroll-state.ts
var import_sdk15 = require("@webstudio-is/sdk");
var useSubscribeScrollState = () => {
  let [, setIsScrolling] = useIsScrolling();
  (0, import_sdk15.useSubscribe)("scrollState", setIsScrolling);
};

// app/designer/shared/instance/use-selected-instance-path.ts
var useSelectedInstancePath = (selectedInstanceId) => {
  let [rootInstance] = useRootInstance();
  return (0, import_react28.useMemo)(() => selectedInstanceId !== void 0 && rootInstance !== void 0 ? getInstancePath(rootInstance, selectedInstanceId) : [], [selectedInstanceId, rootInstance]);
};

// app/designer/shared/tree/tree.tsx
var import_react29 = require("react");
var import_lodash4 = __toESM(require("lodash.noop")), openKeyframes = keyframes({
  from: { height: 0 },
  to: { height: "var(--radix-collapsible-content-height)" }
}), closeKeyframes = keyframes({
  from: { height: "var(--radix-collapsible-content-height)" },
  to: { height: 0 }
}), CollapsibleContentAnimated = styled(Collapsible.Content, {
  overflow: "hidden",
  '&[data-state="open"]': {
    animation: `${openKeyframes} 150ms ease-in-out`
  },
  '&[data-state="closed"]': {
    animation: `${closeKeyframes} 150ms ease-in-out`
  }
}), CollapsibleContentUnanimated = styled(Collapsible.Content, {
  overflow: "hidden"
}), Tree = ({
  instance,
  selectedInstanceId,
  selectedInstancePath,
  level = 0,
  onSelect = import_lodash4.default,
  animate = !0
}) => {
  let [isOpen, setIsOpen] = (0, import_react29.useState)(selectedInstancePath.includes(instance));
  (0, import_react29.useEffect)(() => {
    setIsOpen(selectedInstancePath.includes(instance));
  }, [selectedInstancePath, instance]);
  let showChildren = instance.children.length > 1 || typeof instance.children[0] == "object", children6 = (0, import_react29.useMemo)(() => {
    if (isOpen === !1 || showChildren === !1)
      return null;
    let children7 = [];
    for (let child of instance.children)
      typeof child != "string" && children7.push(/* @__PURE__ */ React.createElement(Tree, {
        instance: child,
        selectedInstanceId,
        selectedInstancePath,
        level: level + 1,
        key: child.id,
        onSelect,
        animate
      }));
    return children7;
  }, [
    instance,
    level,
    isOpen,
    selectedInstanceId,
    selectedInstancePath,
    onSelect,
    showChildren,
    animate
  ]), { Icon: Icon2, label: label11 } = primitives_exports[instance.component], CollapsibleContent = animate ? CollapsibleContentAnimated : CollapsibleContentUnanimated;
  return /* @__PURE__ */ React.createElement(Collapsible.Root, {
    open: isOpen,
    onOpenChange: setIsOpen
  }, /* @__PURE__ */ React.createElement(Flex, {
    css: {
      paddingLeft: level * 15 + (showChildren ? 0 : 15),
      color: "$hiContrast",
      alignItems: "center"
    }
  }, showChildren && /* @__PURE__ */ React.createElement(Collapsible.Trigger, {
    asChild: !0
  }, isOpen ? /* @__PURE__ */ React.createElement(icons_exports.TriangleDownIcon, null) : /* @__PURE__ */ React.createElement(icons_exports.TriangleRightIcon, null)), /* @__PURE__ */ React.createElement(Button, __spreadProps(__spreadValues({}, instance.id === selectedInstanceId ? { state: "active" } : { ghost: !0 }), {
    css: { display: "flex", gap: "$1", padding: "$1" },
    onFocus: () => {
      onSelect(instance);
    }
  }), /* @__PURE__ */ React.createElement(Icon2, null), /* @__PURE__ */ React.createElement(Text, null, label11))), /* @__PURE__ */ React.createElement(CollapsibleContent, null, children6));
};

// app/designer/features/sidebar-left/panels/tree.tsx
var TabContent2 = ({
  publish: publish12,
  selectedInstanceData
}) => {
  let [rootInstance] = useRootInstance(), selectedInstancePath = useSelectedInstancePath(selectedInstanceData == null ? void 0 : selectedInstanceData.id);
  return rootInstance === void 0 ? null : /* @__PURE__ */ React.createElement(Flex, {
    gap: "3",
    direction: "column",
    css: { padding: "$1" }
  }, /* @__PURE__ */ React.createElement(Tree, {
    instance: rootInstance,
    selectedInstancePath,
    selectedInstanceId: selectedInstanceData == null ? void 0 : selectedInstanceData.id,
    onSelect: (instance) => {
      publish12({
        type: "selectInstanceById",
        payload: instance.id
      });
    }
  }));
}, icon2 = /* @__PURE__ */ React.createElement(ListNestedIcon, null);

// app/designer/features/sidebar-left/sidebar-left.tsx
var sidebarTabsContentStyle = {
  position: "absolute",
  left: "100%",
  width: 250,
  height: "100%",
  bc: "$loContrast",
  outline: "1px solid $slate6"
}, none = { TabContent: () => null }, SidebarLeft = ({ onDragChange, publish: publish12 }) => {
  let [selectedInstanceData] = useSelectedInstanceData(), [activeTab, setActiveTab] = (0, import_react30.useState)("none"), [isDragging, setIsDragging] = (0, import_react30.useState)(!1), { TabContent: TabContent3 } = activeTab === "none" ? none : panels_exports[activeTab];
  (0, import_sdk16.useSubscribe)("clickCanvas", () => {
    setActiveTab("none");
  }), (0, import_sdk16.useSubscribe)("dragStartInstance", () => {
    setIsDragging(!0);
  }), (0, import_sdk16.useSubscribe)("dragEndInstance", () => {
    setIsDragging(!1);
  });
  let handleDragChange = (0, import_react30.useCallback)((isDragging2) => {
    isDragging2 === !1 && setActiveTab("none"), setIsDragging(isDragging2), onDragChange(isDragging2);
  }, [onDragChange]);
  return /* @__PURE__ */ React.createElement(Box, {
    css: { position: "relative", zIndex: 1 }
  }, /* @__PURE__ */ React.createElement(SidebarTabs, {
    activationMode: "manual",
    value: activeTab
  }, /* @__PURE__ */ React.createElement(SidebarTabsList, null, Object.keys(panels_exports).map((tabName) => /* @__PURE__ */ React.createElement(SidebarTabsTrigger, {
    "aria-label": tabName,
    key: tabName,
    value: tabName,
    onClick: () => {
      setActiveTab(activeTab !== tabName ? tabName : "none");
    }
  }, tabName === "none" ? null : panels_exports[tabName].icon))), /* @__PURE__ */ React.createElement(SidebarTabsContent, {
    value: activeTab === "none" ? "" : activeTab,
    css: __spreadProps(__spreadValues({}, sidebarTabsContentStyle), {
      visibility: isDragging ? "hidden" : "visible",
      overflow: "auto"
    })
  }, /* @__PURE__ */ React.createElement(TabContent3, {
    selectedInstanceData,
    publish: publish12,
    onSetActiveTab: setActiveTab,
    onDragChange: handleDragChange
  }))));
};

// app/designer/shared/breakpoints/will-render.ts
var willRender = (breakpoint, canvasWidth) => canvasWidth >= breakpoint.minWidth;

// app/designer/features/style-panel/use-style-data.ts
var import_react31 = require("react");

// app/designer/features/style-panel/parse-css-value.ts
var import_hyphenate_style_name = __toESM(require("hyphenate-style-name")), import_sdk17 = require("@webstudio-is/sdk"), unitRegex = new RegExp(`${import_sdk17.units.join("|")}`), isValid = (property, value) => {
  if (typeof CSSStyleValue > "u" || typeof CSSStyleValue.parse > "u")
    return !0;
  try {
    CSSStyleValue.parse((0, import_hyphenate_style_name.default)(property), value);
  } catch {
    return !1;
  }
  return !0;
}, mathRegex = /[\+\-\*\/]/, evaluate = (input, parsedUnit) => {
  let parsed = parseFloat(input);
  if (isNaN(parsed))
    return parsed;
  if (mathRegex.test(input)) {
    parsedUnit !== null && (input = input.replace(parsedUnit[0], ""));
    try {
      return eval(`(${input})`);
    } catch (err) {
      return parsed;
    }
  }
  return parsed;
}, parseCssValue = (property, input2, defaultUnit) => {
  let invalidValue = {
    type: "invalid",
    value: input2
  };
  if (input2.length === 0)
    return invalidValue;
  let parsedUnit2 = unitRegex.exec(input2), number = evaluate(input2, parsedUnit2);
  if (isNaN(number) === !0)
    return isValid(property, input2) ? {
      type: "keyword",
      value: input2
    } : invalidValue;
  let fallbackUnit = defaultUnit ?? "number", [unit] = parsedUnit2 || [fallbackUnit];
  return isValid(property, number) || isValid(property, number + unit) ? {
    type: "unit",
    unit,
    value: number
  } : invalidValue;
};

// app/designer/features/style-panel/get-inherited-style.ts
var import_sdk18 = require("@webstudio-is/sdk"), propertyNames = Object.keys(import_sdk18.properties), inheritableProperties = propertyNames.reduce((acc, property) => (import_sdk18.properties[property].inherited && (acc[property] = !0), acc), {}), findParents = (instance, instanceId) => {
  let parents = [];
  for (let child of instance.children) {
    if (typeof child == "string")
      continue;
    if (child.id === instanceId) {
      parents.push(instance);
      break;
    }
    let foundParents = findParents(child, instanceId);
    parents.push.apply(parents, foundParents);
  }
  return parents;
}, getInheritedStyle = (rootInstance, instanceId) => {
  let parents = findParents(rootInstance, instanceId).reverse(), inheritedStyle = {};
  for (let parent of parents)
    for (let cssRule of parent.cssRules)
      for (let property in cssRule.style) {
        let isInheritable = property in inheritableProperties, value = cssRule.style[property], hasValue = value !== void 0 && value.value !== "inherit", isFirst = !(property in inheritedStyle);
        isInheritable && hasValue && isFirst && (inheritedStyle[property] = {
          instance: parent,
          value
        });
      }
  return inheritedStyle;
};

// app/designer/features/style-panel/lib/utils/get-css-rule-for-breakpoint.ts
var getCssRuleForBreakpoint = (cssRules = [], breakpoint) => {
  if (breakpoint !== void 0)
    return cssRules.find((cssRule) => cssRule.breakpoint === breakpoint.id);
};

// app/designer/features/style-panel/use-style-data.ts
var useStyleData = ({
  selectedInstanceData,
  publish: publish12
}) => {
  let [rootInstance] = useRootInstance(), [selectedBreakpoint] = useSelectedBreakpoint(), cssRule = (0, import_react31.useMemo)(() => getCssRuleForBreakpoint(selectedInstanceData == null ? void 0 : selectedInstanceData.cssRules, selectedBreakpoint), [selectedInstanceData == null ? void 0 : selectedInstanceData.cssRules, selectedBreakpoint]), getCurrentStyle = (0, import_react31.useCallback)(() => __spreadValues(__spreadValues({}, selectedInstanceData == null ? void 0 : selectedInstanceData.browserStyle), cssRule == null ? void 0 : cssRule.style), [selectedInstanceData, cssRule]), [currentStyle, setCurrentStyle] = (0, import_react31.useState)(getCurrentStyle());
  (0, import_react31.useEffect)(() => {
    let currentStyle2 = getCurrentStyle();
    setCurrentStyle(currentStyle2);
  }, [getCurrentStyle]);
  let inheritedStyle = (0, import_react31.useMemo)(() => {
    if (!(currentStyle === void 0 || selectedInstanceData === void 0 || rootInstance === void 0))
      return getInheritedStyle(rootInstance, selectedInstanceData.id);
  }, [currentStyle, selectedInstanceData, rootInstance]), publishUpdates = (type, updates) => {
    updates.length === 0 || selectedInstanceData === void 0 || selectedBreakpoint == null || publish12({
      type: type === "update" ? "updateStyle" : `previewStyle:${selectedInstanceData.id}`,
      payload: {
        id: selectedInstanceData.id,
        updates,
        breakpoint: selectedBreakpoint
      }
    });
  };
  return { currentStyle, inheritedStyle, setProperty: (property) => (input2, options2 = { isEphemeral: !1 }) => {
    if (currentStyle === void 0)
      return;
    let currentValue = currentStyle[property], defaultUnit = (currentValue == null ? void 0 : currentValue.type) === "unit" ? currentValue == null ? void 0 : currentValue.unit : void 0, nextValue = parseCssValue(property, input2, defaultUnit);
    if (nextValue.type !== "invalid") {
      let updates = [{ property, value: nextValue }], type = options2.isEphemeral ? "preview" : "update";
      publishUpdates(type, updates);
    }
    options2.isEphemeral === !1 && setCurrentStyle(__spreadProps(__spreadValues({}, currentStyle), { [property]: nextValue }));
  } };
};

// app/designer/shared/inspector/collapsible-section.tsx
var import_react_nano_state3 = require("react-nano-state");
var stateContainer = (0, import_react_nano_state3.createValueContainer)({}), useOpenState = (label11, initialValue) => {
  let [state, setState] = (0, import_react_nano_state3.useValue)(stateContainer);
  return [label11 in state ? state[label11] : initialValue, (isOpen2) => {
    setState(__spreadProps(__spreadValues({}, state), { [label11]: isOpen2 }));
  }];
}, CollapsibleSection = ({
  label: label11,
  children: children6,
  isOpenDefault = !1,
  isOpen,
  rightSlot
}) => {
  let [isOpenByUser, setIsOpenByUser] = useOpenState(label11, isOpenDefault), isOpenFinal = isOpen === void 0 ? isOpenByUser : isOpen;
  return /* @__PURE__ */ React.createElement(Collapsible.Root, {
    open: isOpenFinal,
    onOpenChange: setIsOpenByUser
  }, /* @__PURE__ */ React.createElement(Collapsible.Trigger, {
    asChild: !0
  }, /* @__PURE__ */ React.createElement(Flex, {
    align: "center",
    gap: "1",
    justify: "between",
    css: {
      py: "$3",
      px: "$1",
      color: "$hiContrast",
      cursor: "default"
    }
  }, isOpenFinal ? /* @__PURE__ */ React.createElement(icons_exports.TriangleDownIcon, null) : /* @__PURE__ */ React.createElement(icons_exports.TriangleRightIcon, null), /* @__PURE__ */ React.createElement(Text, {
    size: "3",
    css: { flexGrow: 1 }
  }, label11), rightSlot)), /* @__PURE__ */ React.createElement(Collapsible.Content, {
    asChild: !0
  }, /* @__PURE__ */ React.createElement(Flex, {
    gap: "3",
    direction: "column",
    css: { p: "$2", borderBottom: "1px solid $slate6" }
  }, children6)));
};

// app/designer/shared/inspector/component-info.tsx
var ComponentInfo = ({
  selectedInstanceData
}) => /* @__PURE__ */ React.createElement(Flex, {
  justify: "between",
  align: "center"
}, /* @__PURE__ */ React.createElement(Text, null, `Selected: ${primitives_exports[selectedInstanceData.component].label}`));

// app/designer/features/style-panel/settings.tsx
var import_react35 = require("react"), import_hyphenate_style_name2 = __toESM(require("hyphenate-style-name")), import_sdk22 = require("@webstudio-is/sdk");

// app/shared/style-panel-configs/configs.ts
var import_sdk19 = require("@webstudio-is/sdk");

// app/shared/string-utils/index.ts
var import_lodash5 = __toESM(require("lodash.snakecase")), import_lodash6 = __toESM(require("lodash.capitalize")), humanizeString = (string) => (0, import_lodash5.default)(string).split("_").map(import_lodash6.default).join(" ");

// app/shared/style-panel-configs/configs.ts
var getControl = (property) => property.toLocaleLowerCase().includes("color") ? "Color" : import_sdk19.categories.spacing.properties.includes(property) ? "Spacing" : "Combobox", createStyleConfigs = () => {
  let map = {}, category;
  for (category in import_sdk19.categories)
    for (let prop of import_sdk19.categories[category].properties) {
      let property = prop, keywords = import_sdk19.keywordValues[property] || [], label11 = humanizeString(property);
      map[property] = {
        label: label11,
        property,
        appliesTo: import_sdk19.properties[property].appliesTo,
        control: getControl(property),
        items: keywords.map((keyword) => ({
          label: keyword,
          name: keyword
        }))
      };
    }
  return Object.values(map);
}, styleConfigs = createStyleConfigs();

// app/designer/features/style-panel/render-property.tsx
var import_sdk21 = require("@webstudio-is/sdk");

// app/designer/features/style-panel/lib/color-picker.tsx
var import_react32 = require("react"), import_react_color = require("react-color");
var stringifyRGBA = (color) => {
  let { r, g, b, a = 1 } = color;
  return `rgba(${r},${g},${b},${a})`;
}, ColorPicker = ({
  value,
  onChange,
  onChangeComplete,
  id
}) => {
  let [displayColorPicker, setDisplayColorPicker] = (0, import_react32.useState)(!1);
  return value === "transparent" && (value = ""), /* @__PURE__ */ React.createElement(Popover, {
    modal: !0,
    open: displayColorPicker,
    onOpenChange: setDisplayColorPicker
  }, /* @__PURE__ */ React.createElement(PopoverTrigger, {
    asChild: !0,
    "aria-label": "Open color picker"
  }, /* @__PURE__ */ React.createElement(Flex, null, /* @__PURE__ */ React.createElement(Box, {
    css: {
      width: "$5",
      height: "$5",
      background: value
    }
  }), /* @__PURE__ */ React.createElement(TextField, {
    onChange: (e) => onChange(e.target.value),
    onClick: () => setDisplayColorPicker((shown) => !shown),
    variant: "ghost",
    value,
    id
  }))), /* @__PURE__ */ React.createElement(PopoverContent, null, /* @__PURE__ */ React.createElement(import_react_color.SketchPicker, {
    color: value,
    onChange: (color) => onChange(stringifyRGBA(color.rgb)),
    onChangeComplete: (color) => {
      onChangeComplete(stringifyRGBA(color.rgb));
    },
    presetColors: [],
    styles: {
      default: {
        picker: {
          padding: 10
        }
      }
    }
  })));
};

// app/designer/features/style-panel/lib/spacing-widget.tsx
var import_react34 = require("react"), import_sdk20 = require("@webstudio-is/sdk");

// app/designer/features/style-panel/lib/utils/use-is-from-current-breakpoint.ts
var import_react33 = require("react");
var useIsFromCurrentBreakpoint = (property) => {
  let [selectedBreakpoint] = useSelectedBreakpoint(), [selectedInstanceData] = useSelectedInstanceData(), cssRule = (0, import_react33.useMemo)(() => getCssRuleForBreakpoint(selectedInstanceData == null ? void 0 : selectedInstanceData.cssRules, selectedBreakpoint), [selectedInstanceData, selectedBreakpoint]);
  return cssRule === void 0 ? !1 : property in cssRule.style;
};

// app/designer/features/style-panel/lib/constants.ts
var propertyNameColorForSelectedBreakpoint = "$blue11";

// app/designer/features/style-panel/lib/spacing-widget.tsx
var grid = {
  margin: {
    marginTop: "1 / 2 / 2 / 3",
    marginRight: "2 / 3 / 3 / 4",
    marginBottom: "3 / 2 / 4 / 3",
    marginLeft: "2 / 1 / 3 / 2"
  },
  padding: {
    paddingTop: "1 / 2 / 2 / 3",
    paddingRight: "2 / 3 / 3 / 4",
    paddingBottom: "3 / 2 / 4 / 3",
    paddingLeft: "2 / 1 / 3 / 2"
  }
}, styles = {
  spacingEdit: {
    fontSize: "$1",
    color: "rgb(217, 217, 217)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  wrapper: {
    display: "grid",
    height: 130,
    gridTemplateColumns: "$5 $1 $5 1fr $5 $1 $5",
    gridTemplateRows: "$5 $1 $5 1fr $5 $1 $5"
  },
  input: {
    fontSize: 10,
    fontWeight: 400,
    fontFamily: "inherit",
    display: "block",
    background: "transparent",
    color: "$hiContrast",
    zIndex: 99,
    margin: "auto",
    width: 40,
    border: "none",
    textAlign: "center",
    outline: "none"
  },
  inputFromCurrentBreakpoint: {
    color: propertyNameColorForSelectedBreakpoint
  },
  emptySpace: {
    gridArea: "2 / 2 / 3 / 2",
    background: "$loContrast",
    width: "$6",
    margin: "auto",
    height: "100%",
    borderRadius: "$1"
  },
  marginGrid: {
    gridArea: "1 / 1 / -1 / -1",
    display: "grid",
    gridTemplateColumns: "$5 1fr $5",
    gridTemplateRows: "$5 minmax($3, 1fr) $5",
    height: 130,
    backgroundColor: "$gray6",
    borderRadius: "$1",
    px: 2
  },
  text: {
    fontWeight: "bold",
    color: "$gray12",
    fontSize: 8,
    margin: "$1"
  },
  paddingGrid: {
    gridArea: "3 / 3 / span 3 / span 3",
    display: "grid",
    gridTemplateColumns: "$5 1fr $5",
    gridTemplateRows: "$5 minmax($3, 1fr) $5",
    border: "2px solid",
    borderColor: "$loContrast",
    borderRadius: "$1"
  }
}, TextField2 = ({ property, value, onEnter }) => {
  let [currentValue, setCurrentValue] = (0, import_react34.useState)(value ?? ""), isFromCurrentBreakpoint = useIsFromCurrentBreakpoint(property);
  return (0, import_react34.useEffect)(() => {
    setCurrentValue(value ?? "");
  }, [value]), /* @__PURE__ */ React.createElement(Box, {
    as: "input",
    name: property,
    "aria-label": `${property} edit`,
    value: currentValue,
    onKeyDown: (event) => {
      event.key === "Enter" && onEnter(currentValue);
    },
    onChange: (event) => {
      setCurrentValue(event.target.value);
    },
    css: isFromCurrentBreakpoint ? __spreadValues(__spreadValues({}, styles.input), styles.inputFromCurrentBreakpoint) : styles.input
  });
}, toCss = (style) => {
  let css2 = {}, property;
  for (property in style) {
    let value = style[property];
    value !== void 0 && (css2[property] = (0, import_sdk20.toValue)(value));
  }
  return css2;
}, SpacingWidget = ({ setProperty, values }) => {
  let margins = toCss(values.margins), paddings = toCss(values.paddings), updateSpacing = ({
    value,
    property
  }) => {
    setProperty(property)(value);
  };
  return /* @__PURE__ */ React.createElement(Box, {
    css: styles.wrapper
  }, /* @__PURE__ */ React.createElement(Box, {
    css: styles.marginGrid
  }, Object.keys(margins).map((property) => /* @__PURE__ */ React.createElement(Box, {
    key: property,
    css: __spreadProps(__spreadValues({}, styles.spacingEdit), {
      gridArea: grid.margin[property]
    })
  }, /* @__PURE__ */ React.createElement(TextField2, {
    property,
    value: margins[property],
    onEnter: (value) => {
      updateSpacing({
        value,
        property
      });
    }
  })))), /* @__PURE__ */ React.createElement(Box, {
    css: styles.paddingGrid
  }, Object.keys(paddings).map((property) => /* @__PURE__ */ React.createElement(Box, {
    key: property,
    css: __spreadProps(__spreadValues({}, styles.spacingEdit), {
      gridArea: grid.padding[property]
    })
  }, /* @__PURE__ */ React.createElement(TextField2, {
    property,
    value: paddings[property],
    onEnter: (value) => {
      updateSpacing({
        value,
        property
      });
    }
  }))), /* @__PURE__ */ React.createElement(Box, {
    css: styles.emptySpace
  })), /* @__PURE__ */ React.createElement(Box, {
    css: __spreadProps(__spreadValues({}, styles.text), {
      gridArea: "3 / 3 / span 3 / span 3"
    })
  }, "PADDING"), /* @__PURE__ */ React.createElement(Box, {
    css: __spreadProps(__spreadValues({}, styles.text), {
      gridArea: "1 / 1 / -1 / -1"
    })
  }, "MARGIN"));
};

// app/designer/features/style-panel/render-property.tsx
var getFinalValue = ({
  currentStyle,
  inheritedStyle,
  property
}) => {
  let currentValue = currentStyle[property], inheritedValue = property in inheritedStyle ? inheritedStyle[property].value : void 0;
  return (currentValue == null ? void 0 : currentValue.value) === "inherit" && inheritedValue !== void 0 ? inheritedValue : currentValue;
}, PropertyName = ({ property, label: label11 }) => {
  let isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);
  return /* @__PURE__ */ React.createElement(Label, {
    css: {
      gridColumn: "1",
      color: isCurrentBreakpoint ? propertyNameColorForSelectedBreakpoint : "$hiContrast"
    },
    variant: "contrast",
    size: "1",
    htmlFor: property
  }, label11);
}, Unit = ({ value }) => value.type !== "unit" || value.unit === "number" ? null : /* @__PURE__ */ React.createElement(Text, {
  css: {
    fontSize: "$1",
    cursor: "default"
  }
}, value.unit), ColorControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig
}) => {
  if (styleConfig.control !== "Color")
    return null;
  let value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property
  });
  if (value === void 0)
    return null;
  let setValue = setProperty(styleConfig.property);
  return /* @__PURE__ */ React.createElement(Grid, {
    columns: 2,
    align: "center",
    gapX: "1"
  }, /* @__PURE__ */ React.createElement(PropertyName, {
    property: styleConfig.property,
    label: styleConfig.label
  }), /* @__PURE__ */ React.createElement(Flex, {
    align: "center",
    css: { gridColumn: "2/4" },
    gap: "1"
  }, /* @__PURE__ */ React.createElement(ColorPicker, {
    id: styleConfig.property,
    value: String(value.value),
    onChange: (value2) => {
      setValue(value2, { isEphemeral: !0 });
    },
    onChangeComplete: setValue
  })));
}, SpacingControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig
}) => {
  if (styleConfig.control !== "Spacing")
    return null;
  let styles2 = import_sdk21.categories.spacing.properties.reduce((acc, property) => {
    let value = getFinalValue({
      currentStyle,
      inheritedStyle,
      property
    });
    return value !== void 0 && (property.includes("margin") ? acc.margins[property] = value : acc.paddings[property] = value), acc;
  }, { margins: {}, paddings: {} });
  return /* @__PURE__ */ React.createElement(SpacingWidget, {
    setProperty,
    values: styles2
  });
}, ComboboxControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig
}) => {
  if (styleConfig.control !== "Combobox")
    return null;
  let value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property
  });
  if (value === void 0)
    return null;
  let setValue = setProperty(styleConfig.property);
  return /* @__PURE__ */ React.createElement(Grid, {
    columns: 2,
    align: "center",
    gapX: "1"
  }, /* @__PURE__ */ React.createElement(PropertyName, {
    property: styleConfig.property,
    label: styleConfig.label
  }), /* @__PURE__ */ React.createElement(Flex, {
    align: "center",
    css: { gridColumn: "2/4" },
    gap: "1"
  }, /* @__PURE__ */ React.createElement(Combobox, {
    id: styleConfig.property,
    items: styleConfig.items,
    variant: "ghost",
    css: {
      textAlign: "right"
    },
    state: value.type === "invalid" ? "invalid" : void 0,
    value: String(value.value),
    onValueSelect: setValue,
    onValueEnter: setValue,
    onItemEnter: (value2) => {
      setValue(value2, { isEphemeral: !0 });
    },
    onItemLeave: () => {
      setValue(String(value.value), { isEphemeral: !0 });
    }
  }), /* @__PURE__ */ React.createElement(Unit, {
    value
  })));
}, controls = {
  Color: ColorControl,
  Spacing: SpacingControl,
  Combobox: ComboboxControl
}, renderProperty = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
  category
}) => {
  let Control2 = controls[styleConfig.control];
  return /* @__PURE__ */ React.createElement(Control2, {
    key: category + "-" + styleConfig.property,
    currentStyle,
    inheritedStyle,
    setProperty,
    styleConfig
  });
};

// app/designer/features/style-panel/dependencies.ts
var displayInline = [
  "inline",
  "inline-block",
  "inline-table",
  "inline-list-item",
  "inline-flex",
  "inline-grid"
], dependencies = {
  blockContainers: {
    property: "display",
    values: ["block"]
  },
  blockContainerElements: {
    property: "display",
    values: ["block"]
  },
  flexContainers: {
    property: "display",
    values: ["flex"]
  },
  flexItemsAndInFlowPseudos: {
    property: "display",
    values: ["flex"]
  },
  multilineFlexContainers: {
    property: "flexWrap",
    values: ["wrap", "wrap-reverse"]
  },
  gridContainers: {
    property: "display",
    values: ["grid"]
  },
  gridItemsAndBoxesWithinGridContainer: {
    property: "display",
    values: ["grid"]
  },
  positionedElements: {
    property: "position",
    notValues: ["static"]
  },
  allElementsNoEffectIfDisplayNone: {
    property: "display",
    notValues: ["none"]
  },
  blockLevelElements: {
    property: "clear",
    values: ["block", "flex", "grid", "table"]
  },
  allElementsExceptTableDisplayTypes: {
    property: "display",
    notValues: ["table"]
  },
  allElementsExceptInternalTableDisplayTypes: {
    property: "display",
    notValues: [
      "table-row-group",
      "table-header-group",
      "table-footer-group",
      "table-row",
      "table-cell",
      "table-column-group",
      "table-column",
      "table-caption"
    ]
  },
  allElementsButNonReplacedAndTableColumns: {
    property: "display",
    notValues: ["table-column-group", "table-column"]
  },
  allElementsButNonReplacedAndTableRows: {
    property: "display",
    notValues: ["table-row-group", "table-row"]
  },
  blockContainersFlexContainersGridContainers: {
    property: "display",
    values: ["block", "flex", "grid"]
  },
  sameAsWidthAndHeight: {
    property: "display",
    notValues: [
      "table-column-group",
      "table-column",
      "table-row-group",
      "table-row"
    ]
  },
  nonReplacedInlineElements: {
    property: "display",
    values: displayInline
  },
  inlineLevelAndTableCellElements: {
    property: "display",
    values: [...displayInline, "table-cell"]
  },
  absolutelyPositionedElements: {
    property: "position",
    values: ["absolute"]
  }
};

// app/designer/features/style-panel/settings.tsx
var filterProperties = (properties3, search) => {
  let searchParts = search.split(" ").map((part) => part.trim()), includes = (property) => property.toLowerCase().includes(search) || (0, import_hyphenate_style_name2.default)(property).includes(search) ? !0 : searchParts.every((searchPart) => property.toLowerCase().includes(searchPart));
  return properties3.filter((property) => {
    for (let styleConfig of styleConfigs)
      if (styleConfig.property === property) {
        if (includes(styleConfig.property) || includes(styleConfig.label))
          return !0;
        for (let item of styleConfig.items)
          if (includes(item.name) || includes(item.label))
            return !0;
      }
    return !1;
  });
}, appliesTo = (styleConfig, currentStyle) => {
  var _a;
  let { appliesTo: appliesTo2 } = styleConfig;
  if (appliesTo2 in dependencies) {
    let dependency = dependencies[appliesTo2];
    if (dependency === void 0)
      return !1;
    let currentValue = (_a = currentStyle[dependency.property]) == null ? void 0 : _a.value;
    if (currentValue === void 0)
      return !1;
    if (Array.isArray(dependency.values))
      return dependency.values.includes(String(currentValue));
    if (Array.isArray(dependency.notValues))
      return dependency.notValues.includes(String(currentValue)) === !1;
  }
  return !0;
}, didRender = (category, { property }) => category === "spacing" && property !== import_sdk22.categories.spacing.properties[0], ShowMore = ({ styleConfigs: styleConfigs2 }) => {
  let [isOpen, setIsOpen] = (0, import_react35.useState)(!1);
  return styleConfigs2.length === 0 ? null : /* @__PURE__ */ React.createElement(Collapsible.Root, {
    asChild: !0,
    onOpenChange: setIsOpen
  }, /* @__PURE__ */ React.createElement(Flex, {
    direction: "column",
    gap: "3"
  }, /* @__PURE__ */ React.createElement(Collapsible.Trigger, {
    asChild: !0
  }, /* @__PURE__ */ React.createElement(Button, {
    css: { width: "100%", gap: "$1" }
  }, isOpen ? /* @__PURE__ */ React.createElement(icons_exports.TriangleDownIcon, null) : /* @__PURE__ */ React.createElement(icons_exports.TriangleRightIcon, null), "Show more")), /* @__PURE__ */ React.createElement(Collapsible.Content, {
    asChild: !0
  }, /* @__PURE__ */ React.createElement(Flex, {
    direction: "column",
    gap: "3"
  }, styleConfigs2))));
}, VisualSettings = (_a) => {
  var _b = _a, {
    currentStyle,
    search
  } = _b, rest = __objRest(_b, [
    "currentStyle",
    "search"
  ]);
  let isSearchMode = search.length !== 0, all = [], category;
  for (category in import_sdk22.categories) {
    let categoryProperties = filterProperties(import_sdk22.categories[category].properties, search), { moreFrom } = import_sdk22.categories[category], styleConfigsByCategory = [], moreStyleConfigsByCategory = [];
    for (let styleConfig of styleConfigs) {
      let isInCategory = categoryProperties.includes(styleConfig.property), isApplicable = isSearchMode ? !0 : appliesTo(styleConfig, currentStyle), isRendered = didRender(category, styleConfig);
      if (isInCategory && isApplicable && isRendered === !1) {
        let element = renderProperty(__spreadProps(__spreadValues({}, rest), {
          currentStyle,
          styleConfig,
          category
        }));
        if ((styleConfig.property === moreFrom || moreStyleConfigsByCategory.length !== 0) && isSearchMode === !1) {
          moreStyleConfigsByCategory.push(element);
          continue;
        }
        styleConfigsByCategory.push(element);
      }
    }
    styleConfigsByCategory.length !== 0 && all.push(/* @__PURE__ */ React.createElement(CollapsibleSection, {
      isOpen: isSearchMode ? !0 : void 0,
      label: import_sdk22.categories[category].label,
      key: category
    }, /* @__PURE__ */ React.createElement(React.Fragment, null, styleConfigsByCategory, /* @__PURE__ */ React.createElement(ShowMore, {
      styleConfigs: moreStyleConfigsByCategory
    }))));
  }
  return /* @__PURE__ */ React.createElement(Box, {
    css: { overflow: "auto" }
  }, all);
};

// app/designer/features/style-panel/search.tsx
var import_react36 = require("react");
var formStyle = css({
  position: "relative"
}), resetStyle = css({
  position: "absolute",
  right: 0
}), useSearch = (onSearch) => {
  let [search, setSearch] = (0, import_react36.useState)("");
  return [
    search,
    (search2) => {
      setSearch(search2), onSearch(search2);
    }
  ];
}, Search = ({ onSearch }) => {
  let [search, setSearch] = useSearch(onSearch);
  return /* @__PURE__ */ React.createElement("form", {
    className: formStyle(),
    onReset: () => {
      setSearch("");
    },
    onKeyDown: (event) => {
      event.key === "Escape" && event.currentTarget.reset();
    }
  }, /* @__PURE__ */ React.createElement(TextField, {
    value: search,
    css: { paddingRight: "$5" },
    placeholder: "Search property or value",
    onChange: (event) => {
      let { value } = event.target;
      setSearch(value.toLowerCase());
    }
  }), /* @__PURE__ */ React.createElement(IconButton, {
    disabled: search.length === 0,
    type: "reset",
    "aria-label": "Reset search",
    className: resetStyle()
  }, /* @__PURE__ */ React.createElement(icons_exports.Cross1Icon, null)));
};

// app/designer/features/style-panel/style-panel.tsx
var import_react37 = require("react");
var StylePanel = ({
  selectedInstanceData,
  publish: publish12
}) => {
  let { currentStyle, inheritedStyle, setProperty } = useStyleData({
    selectedInstanceData,
    publish: publish12
  }), [breakpoint] = useSelectedBreakpoint(), [canvasWidth] = useCanvasWidth(), [search, setSearch] = (0, import_react37.useState)("");
  return currentStyle === void 0 || inheritedStyle === void 0 || selectedInstanceData === void 0 || breakpoint === void 0 ? null : willRender(breakpoint, canvasWidth) === !1 ? /* @__PURE__ */ React.createElement(Box, {
    css: { p: "$2" }
  }, /* @__PURE__ */ React.createElement(Card, {
    css: { p: "$3", mt: "$3" }
  }, /* @__PURE__ */ React.createElement(Paragraph, {
    css: { marginBottom: "$2" }
  }, "Please increase the canvas width."), /* @__PURE__ */ React.createElement(Paragraph, null, `"${breakpoint.label}" breakpoint minimum width is ${breakpoint.minWidth}px.`))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Box, {
    css: { p: "$2" }
  }, /* @__PURE__ */ React.createElement(ComponentInfo, {
    selectedInstanceData
  })), /* @__PURE__ */ React.createElement(Box, {
    css: { p: "$2" }
  }, /* @__PURE__ */ React.createElement(Search, {
    onSearch: setSearch
  })), /* @__PURE__ */ React.createElement(VisualSettings, {
    search,
    selectedInstanceData,
    currentStyle,
    inheritedStyle,
    setProperty
  }));
};

// app/designer/features/props-panel/props-panel.tsx
var import_sdk24 = require("@webstudio-is/sdk");

// app/designer/features/props-panel/control.tsx
var import_react39 = __toESM(require("react"));

// app/shared/design-system/components/checkbox.tsx
var import_react38 = __toESM(require("react"));
var CheckboxPrimitive = __toESM(require("@radix-ui/react-checkbox"));
var StyledCheckbox = styled(CheckboxPrimitive.Root, {
  all: "unset",
  boxSizing: "border-box",
  userSelect: "none",
  "&::before": {
    boxSizing: "border-box"
  },
  "&::after": {
    boxSizing: "border-box"
  },
  alignItems: "center",
  appearance: "none",
  display: "inline-flex",
  justifyContent: "center",
  lineHeight: "1",
  margin: "0",
  outline: "none",
  padding: "0",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  color: "$hiContrast",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  overflow: "hidden",
  "@hover": {
    "&:hover": {
      boxShadow: "inset 0 0 0 1px $colors$slate8"
    }
  },
  "&:focus": {
    outline: "none",
    borderColor: "$red7",
    boxShadow: "inset 0 0 0 1px $colors$blue9, 0 0 0 1px $colors$blue9"
  },
  variants: {
    size: {
      "1": {
        width: "$3",
        height: "$3",
        borderRadius: "$1"
      },
      "2": {
        width: "$5",
        height: "$5",
        borderRadius: "$2"
      }
    }
  },
  defaultVariants: {
    size: "1"
  }
}), StyledIndicator2 = styled(CheckboxPrimitive.Indicator, {
  alignItems: "center",
  display: "flex",
  height: "100%",
  justifyContent: "center",
  width: "100%"
}), Checkbox = import_react38.default.forwardRef((props2, forwardedRef) => /* @__PURE__ */ import_react38.default.createElement(StyledCheckbox, __spreadProps(__spreadValues({}, props2), {
  ref: forwardedRef
}), /* @__PURE__ */ import_react38.default.createElement(StyledIndicator2, null, /* @__PURE__ */ import_react38.default.createElement(icons_exports.CheckIcon, null))));
Checkbox.displayName = "Checkbox";

// app/designer/features/props-panel/control.tsx
var TextControl = ({
  value,
  defaultValue,
  type,
  onChange
}) => /* @__PURE__ */ import_react39.default.createElement(TextField, {
  type,
  variant: "ghost",
  placeholder: "Value",
  name: "value",
  value: String(value || defaultValue || ""),
  onChange: (event) => {
    onChange(event.target.value);
  }
}), CheckboxControl = ({
  value,
  options: options2,
  defaultValue,
  onChange
}) => /* @__PURE__ */ import_react39.default.createElement(RadioGroup3, {
  css: { flexDirection: "column" },
  name: "value",
  value: String(value || defaultValue || ""),
  onValueChange: onChange
}, options2.map((value2) => /* @__PURE__ */ import_react39.default.createElement(Flex, {
  align: "center",
  gap: "1",
  key: value2
}, /* @__PURE__ */ import_react39.default.createElement(Checkbox, {
  value: value2
}), /* @__PURE__ */ import_react39.default.createElement(Label, null, value2)))), RadioControl = ({
  value,
  options: options2,
  defaultValue,
  onChange
}) => /* @__PURE__ */ import_react39.default.createElement(RadioGroup3, {
  css: { flexDirection: "column" },
  name: "value",
  value: String(value || defaultValue || ""),
  onValueChange: onChange
}, options2.map((value2) => /* @__PURE__ */ import_react39.default.createElement(Flex, {
  align: "center",
  gap: "1",
  key: value2
}, /* @__PURE__ */ import_react39.default.createElement(Radio, {
  value: value2,
  id: value2
}), /* @__PURE__ */ import_react39.default.createElement(Label, {
  htmlFor: value2
}, value2)))), SelectControl = ({
  value,
  options: options2,
  defaultValue,
  onChange
}) => /* @__PURE__ */ import_react39.default.createElement(Select, {
  name: "value",
  value: String(value || defaultValue || ""),
  options: options2,
  onChange
}), BooleanControl = ({
  value,
  defaultValue,
  onChange
}) => /* @__PURE__ */ import_react39.default.createElement(Switch, {
  name: "value",
  defaultChecked: Boolean(defaultValue),
  checked: value === !0,
  onCheckedChange: onChange
}), RangeControl = ({
  value,
  defaultValue,
  onChange,
  min,
  max,
  step
}) => /* @__PURE__ */ import_react39.default.createElement(Flex, {
  direction: "column",
  gap: 1
}, /* @__PURE__ */ import_react39.default.createElement(Slider, {
  value,
  defaultValue,
  onValueChange: (values) => {
    onChange(values[0]);
  },
  min,
  max,
  step
}), /* @__PURE__ */ import_react39.default.createElement(Flex, {
  direction: "row",
  justify: "between"
}, /* @__PURE__ */ import_react39.default.createElement(Text, {
  size: 1
}, min), /* @__PURE__ */ import_react39.default.createElement(Text, {
  size: 1
}, max))), NotImplemented = () => /* @__PURE__ */ import_react39.default.createElement("div", null);
function Control(props2) {
  switch (props2.type) {
    case "array":
      return /* @__PURE__ */ import_react39.default.createElement(TextControl, __spreadValues({}, props2));
    case "boolean":
      return /* @__PURE__ */ import_react39.default.createElement(BooleanControl, __spreadValues({}, props2));
    case "color":
      return /* @__PURE__ */ import_react39.default.createElement(TextControl, __spreadProps(__spreadValues({}, props2), {
        type: "color"
      }));
    case "date":
      return /* @__PURE__ */ import_react39.default.createElement(TextControl, __spreadProps(__spreadValues({}, props2), {
        type: "date"
      }));
    case "file":
      return /* @__PURE__ */ import_react39.default.createElement(TextControl, __spreadProps(__spreadValues({}, props2), {
        type: "file"
      }));
    case "number":
      return /* @__PURE__ */ import_react39.default.createElement(TextControl, __spreadProps(__spreadValues({}, props2), {
        type: "number"
      }));
    case "range":
      return /* @__PURE__ */ import_react39.default.createElement(RangeControl, __spreadValues({}, props2));
    case "object":
      return /* @__PURE__ */ import_react39.default.createElement(TextControl, __spreadValues({}, props2));
    case "radio":
      return /* @__PURE__ */ import_react39.default.createElement(RadioControl, __spreadValues({}, props2));
    case "inline-radio":
      return /* @__PURE__ */ import_react39.default.createElement(RadioControl, __spreadValues({}, props2));
    case "check":
      return /* @__PURE__ */ import_react39.default.createElement(CheckboxControl, __spreadValues({}, props2));
    case "inline-check":
      return /* @__PURE__ */ import_react39.default.createElement(CheckboxControl, __spreadValues({}, props2));
    case "select":
      return /* @__PURE__ */ import_react39.default.createElement(SelectControl, __spreadValues({}, props2));
    case "multi-select":
      return /* @__PURE__ */ import_react39.default.createElement(CheckboxControl, __spreadValues({}, props2));
    case "text":
      return /* @__PURE__ */ import_react39.default.createElement(TextControl, __spreadValues({}, props2));
    default: {
      let _exhaustiveCheck = props2;
      return /* @__PURE__ */ import_react39.default.createElement(NotImplemented, null);
    }
  }
}

// app/designer/features/props-panel/use-props-logic.ts
var import_sdk23 = require("@webstudio-is/sdk"), import_bson_objectid5 = __toESM(require("bson-objectid")), import_immer5 = __toESM(require("immer")), import_uniqBy = __toESM(require("lodash/uniqBy")), import_debounce = __toESM(require("lodash/debounce")), import_react40 = require("react"), getRequiredProps = (selectedInstanceData) => {
  let { component } = selectedInstanceData, meta6 = import_sdk23.componentsMeta[component], argTypes = (meta6 == null ? void 0 : meta6.argTypes) || {};
  return Object.entries(argTypes).filter(([_, value]) => value.required).map(([prop, _]) => ({
    id: (0, import_bson_objectid5.default)().toString(),
    prop,
    value: "",
    required: !0
  }));
}, getPropsWithDefaultValue = (selectedInstanceData) => {
  let { component } = selectedInstanceData, meta6 = import_sdk23.componentsMeta[component], argTypes = (meta6 == null ? void 0 : meta6.argTypes) || {};
  return Object.entries(argTypes).filter(([_, value]) => value.defaultValue != null).map(([prop, propObj]) => {
    let { defaultValue } = propObj, value = "value" in defaultValue ? defaultValue.value : defaultValue;
    return {
      id: (0, import_bson_objectid5.default)().toString(),
      prop,
      value
    };
  });
}, usePropsLogic = ({
  selectedInstanceData,
  publish: publish12
}) => {
  let props2 = selectedInstanceData.props === void 0 || selectedInstanceData.props.props.length === 0 ? [] : selectedInstanceData.props.props, initialState = (0, import_uniqBy.default)([
    ...props2,
    ...getPropsWithDefaultValue(selectedInstanceData),
    ...getRequiredProps(selectedInstanceData)
  ], "prop"), [userProps, setUserProps] = (0, import_react40.useState)(initialState), propsToPublishRef = (0, import_react40.useRef)({}), updateProps = (0, import_debounce.default)((updates) => {
    publish12({
      type: "updateProps",
      payload: {
        treeId: selectedInstanceData.props.treeId,
        propsId: selectedInstanceData.props.id,
        instanceId: selectedInstanceData.id,
        updates
      }
    });
    for (let update2 of updates)
      delete propsToPublishRef.current[update2.id];
  }, 1e3), deleteProp = (id) => {
    publish12({
      type: "deleteProp",
      payload: {
        instanceId: selectedInstanceData.id,
        propId: id
      }
    });
  };
  return {
    addEmptyProp: () => {
      setUserProps([
        ...userProps,
        {
          id: (0, import_bson_objectid5.default)().toString(),
          prop: "",
          value: ""
        }
      ]);
    },
    userProps,
    handleChangeProp: (id, field, value) => {
      let index = userProps.findIndex((item) => item.id === id), nextUserProps = (0, import_immer5.default)((draft) => {
        let isPropRequired = draft[index].required;
        switch (field) {
          case "prop":
            isPropRequired || (draft[index].prop = value);
            break;
          case "value":
            draft[index].value = value;
            break;
        }
      })(userProps);
      setUserProps(nextUserProps), propsToPublishRef.current[id] = !0;
      let updates = Object.keys(propsToPublishRef.current).map((id2) => nextUserProps.find((prop) => prop.id === id2)).filter(Boolean);
      updateProps(updates);
    },
    handleDeleteProp: (id) => {
      let nextUserProps = [...userProps], prop = userProps.find((prop2) => prop2.id === id);
      if (prop === void 0 || prop.required)
        return;
      let index = nextUserProps.indexOf(prop);
      nextUserProps.splice(index, 1), setUserProps(nextUserProps), deleteProp(id);
    }
  };
};

// app/designer/features/props-panel/props-panel.tsx
var Property = ({
  id,
  prop,
  value,
  required,
  component,
  onChange,
  onDelete
}) => {
  var _a;
  let meta6 = import_sdk24.componentsMeta[component], argType = (_a = meta6 == null ? void 0 : meta6.argTypes) == null ? void 0 : _a[prop], type = argType == null ? void 0 : argType.control.type, defaultValue = argType == null ? void 0 : argType.control.defaultValue, options2 = argType == null ? void 0 : argType.options;
  return /* @__PURE__ */ React.createElement(Grid, {
    gap: "1",
    css: { gridTemplateColumns: "auto 1fr auto" }
  }, /* @__PURE__ */ React.createElement(TextField, {
    readOnly: required,
    variant: "ghost",
    placeholder: "Property",
    name: "prop",
    value: prop,
    onChange: (event) => {
      onChange(id, "prop", event.target.value);
    }
  }), /* @__PURE__ */ React.createElement(Control, {
    type,
    required,
    defaultValue,
    options: options2,
    value,
    onChange: (value2) => onChange(id, "value", value2)
  }), /* @__PURE__ */ React.createElement(Button, {
    ghost: !0,
    disabled: required,
    onClick: () => {
      onDelete(id);
    }
  }, /* @__PURE__ */ React.createElement(icons_exports.TrashIcon, null)));
}, PropsPanel = ({
  selectedInstanceData,
  publish: publish12
}) => {
  let { userProps, addEmptyProp, handleChangeProp, handleDeleteProp } = usePropsLogic({ selectedInstanceData, publish: publish12 });
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Box, {
    css: { p: "$2" }
  }, /* @__PURE__ */ React.createElement(ComponentInfo, {
    selectedInstanceData
  })), /* @__PURE__ */ React.createElement(CollapsibleSection, {
    label: "Properties",
    rightSlot: /* @__PURE__ */ React.createElement(Button, {
      ghost: !0,
      onClick: (event) => {
        event.preventDefault(), addEmptyProp();
      }
    }, /* @__PURE__ */ React.createElement(icons_exports.PlusIcon, null)),
    isOpenDefault: !0
  }, /* @__PURE__ */ React.createElement(React.Fragment, null, userProps.map(({ id, prop, value, required }) => /* @__PURE__ */ React.createElement(Property, {
    key: id,
    id,
    prop,
    value,
    required,
    component: selectedInstanceData.component,
    onChange: handleChangeProp,
    onDelete: handleDeleteProp
  })))));
};

// app/designer/features/inspector/inspector.tsx
var contentStyle = {
  display: "flex",
  flexDirection: "column",
  overflow: "auto"
}, Inspector = ({ publish: publish12 }) => {
  let [selectedInstanceData] = useSelectedInstanceData();
  return selectedInstanceData === void 0 ? /* @__PURE__ */ React.createElement(Box, {
    css: { p: "$2" }
  }, /* @__PURE__ */ React.createElement(Card, {
    css: { p: "$3", mt: "$3" }
  }, /* @__PURE__ */ React.createElement(Paragraph, null, "Select an instance on the canvas"))) : /* @__PURE__ */ React.createElement(Tabs, {
    defaultValue: "style",
    css: { width: "100%", gap: "$2" }
  }, /* @__PURE__ */ React.createElement(TabsList, null, /* @__PURE__ */ React.createElement(TabsTrigger, {
    value: "style"
  }, /* @__PURE__ */ React.createElement(BrushIcon, null)), /* @__PURE__ */ React.createElement(TabsTrigger, {
    value: "props"
  }, /* @__PURE__ */ React.createElement(icons_exports.GearIcon, null))), /* @__PURE__ */ React.createElement(TabsContent, {
    value: "style",
    css: contentStyle
  }, /* @__PURE__ */ React.createElement(StylePanel, {
    publish: publish12,
    selectedInstanceData
  })), /* @__PURE__ */ React.createElement(TabsContent, {
    value: "props",
    css: contentStyle
  }, /* @__PURE__ */ React.createElement(PropsPanel, {
    publish: publish12,
    key: selectedInstanceData.id,
    selectedInstanceData
  })));
};

// app/designer/features/topbar/preview.tsx
var import_sdk25 = require("@webstudio-is/sdk");
var PreviewButton = ({ publish: publish12 }) => {
  let [isPreviewMode, setIsPreviewMode] = useIsPreviewMode(), setValue = (value) => {
    setIsPreviewMode(value), publish12({
      type: "previewMode",
      payload: value
    });
  };
  return (0, import_sdk25.useSubscribe)("togglePreviewMode", () => {
    setValue(!isPreviewMode);
  }), /* @__PURE__ */ React.createElement(SimpleToggle, {
    onPressedChange: setValue,
    pressed: isPreviewMode,
    "aria-label": "Toggle Preview"
  }, /* @__PURE__ */ React.createElement(icons_exports.EyeOpenIcon, null));
};

// app/designer/features/topbar/share.tsx
var Content9 = ({ path, project }) => {
  if (typeof location > "u")
    return null;
  let url2 = new URL(`${location.protocol}//${location.host}${path}/${project.id}`);
  return /* @__PURE__ */ React.createElement(PopoverContent, {
    css: { padding: "$3" },
    onFocusOutside: (event) => {
      event.preventDefault();
    }
  }, /* @__PURE__ */ React.createElement("form", {
    onSubmit: (event) => {
      event.preventDefault(), window.open(url2.toString(), "_blank");
    }
  }, /* @__PURE__ */ React.createElement(Flex, {
    gap: "2"
  }, /* @__PURE__ */ React.createElement(TextField, {
    variant: "ghost",
    readOnly: !0,
    defaultValue: url2.toString(),
    onFocus: (event) => {
      event == null || event.target.select();
    }
  }), /* @__PURE__ */ React.createElement(Button, {
    "aria-label": "Open in a new tab",
    variant: "blue",
    type: "submit"
  }, "Open"))));
}, ShareButton = ({ path, project }) => {
  let [isOpen, setIsOpen] = useIsShareDialogOpen();
  return /* @__PURE__ */ React.createElement(Popover, {
    open: isOpen,
    onOpenChange: setIsOpen
  }, /* @__PURE__ */ React.createElement(PopoverTrigger, {
    asChild: !0,
    "aria-label": "Share project"
  }, /* @__PURE__ */ React.createElement(IconButton, null, /* @__PURE__ */ React.createElement(icons_exports.Share1Icon, null))), /* @__PURE__ */ React.createElement(Content9, {
    path,
    project
  }));
};

// app/designer/features/topbar/publish.tsx
var import_react41 = require("react"), import_react42 = require("@remix-run/react"), import_react_id = require("@radix-ui/react-id");
var host = typeof location == "object" ? location.host.includes("webstudio.is") ? "wstd.io" : location.host : "", Content10 = ({ project }) => {
  var _a, _b, _c;
  let id = (0, import_react_id.useId)(), fetcher = (0, import_react42.useFetcher)(), [url2, setUrl] = (0, import_react41.useState)(), domain = ((_a = fetcher.data) == null ? void 0 : _a.domain) || project.domain;
  return (0, import_react41.useEffect)(() => {
    typeof location != "object" || !domain || setUrl(`${location.protocol}//${domain}.${host}`);
  }, [domain]), /* @__PURE__ */ React.createElement(PopoverContent, {
    css: { padding: "$3" },
    onFocusOutside: (event) => {
      event.preventDefault();
    }
  }, /* @__PURE__ */ React.createElement(fetcher.Form, {
    method: "post",
    action: "/rest/publish"
  }, /* @__PURE__ */ React.createElement(Flex, {
    direction: "column",
    gap: "2"
  }, url2 !== void 0 && /* @__PURE__ */ React.createElement(Link, {
    href: url2,
    target: "_blank",
    css: {
      display: "flex",
      gap: "$0"
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, `${domain}.${host}`, " "), /* @__PURE__ */ React.createElement(icons_exports.ExternalLinkIcon, null)), /* @__PURE__ */ React.createElement(Flex, {
    gap: "2",
    align: "center"
  }, /* @__PURE__ */ React.createElement("input", {
    type: "hidden",
    name: "projectId",
    value: project.id
  }), /* @__PURE__ */ React.createElement(Label, {
    htmlFor: id
  }, "Domain:"), /* @__PURE__ */ React.createElement(TextField, {
    id,
    name: "domain",
    defaultValue: domain
  })), ((_b = fetcher.data) == null ? void 0 : _b.errors) !== void 0 && /* @__PURE__ */ React.createElement(Text, {
    variant: "red"
  }, (_c = fetcher.data) == null ? void 0 : _c.errors), fetcher.state === "idle" ? /* @__PURE__ */ React.createElement(Button, {
    variant: "blue",
    type: "submit"
  }, "Publish") : /* @__PURE__ */ React.createElement(Button, {
    disabled: !0
  }, "Publishing\u2026"))));
}, PublishButton = ({ project }) => {
  let [isOpen, setIsOpen] = useIsPublishDialogOpen();
  return /* @__PURE__ */ React.createElement(Popover, {
    open: isOpen,
    onOpenChange: setIsOpen
  }, /* @__PURE__ */ React.createElement(PopoverTrigger, {
    asChild: !0,
    "aria-label": "Publish"
  }, /* @__PURE__ */ React.createElement(Button, {
    ghost: !0,
    css: { display: "flex", gap: "$1" }
  }, /* @__PURE__ */ React.createElement(icons_exports.RocketIcon, null), /* @__PURE__ */ React.createElement(Text, {
    size: "1"
  }, "Publish"))), /* @__PURE__ */ React.createElement(Content10, {
    project
  }));
};

// app/designer/features/topbar/sync-status.tsx
var iconSize = 15, ellipsisKeyframes = keyframes({
  to: { width: iconSize }
}), AnimatedDotsIcon = () => /* @__PURE__ */ React.createElement(Flex, {
  direction: "column",
  css: {
    animation: `${ellipsisKeyframes} steps(4,end) 900ms infinite`,
    width: 0,
    overflow: "hidden"
  }
}, /* @__PURE__ */ React.createElement(icons_exports.DotsHorizontalIcon, {
  width: "12",
  height: "12"
})), SyncStatus = () => {
  let [status] = useSyncStatus();
  return /* @__PURE__ */ React.createElement(Flex, {
    align: "center",
    justify: "center",
    css: {
      mx: "$1",
      width: iconSize,
      height: iconSize,
      backgroundColor: "$green9",
      borderRadius: "100%"
    }
  }, /* @__PURE__ */ React.createElement(import_react_accessible_icon.AccessibleIcon, {
    label: `Sync status: ${status}`
  }, status === "syncing" ? /* @__PURE__ */ React.createElement(AnimatedDotsIcon, null) : /* @__PURE__ */ React.createElement(icons_exports.CheckIcon, null)));
};

// app/designer/features/topbar/menu/menu.tsx
var import_react_router_dom4 = require("react-router-dom");

// app/designer/features/topbar/menu/shortcut-hint.tsx
var isMac = typeof navigator == "object" ? /mac/i.test(navigator.platform) : !1, shortcutSymbolMap = {
  cmd: "\u2318",
  ctrl: "\u2303",
  shift: "\u21E7",
  option: "\u2325",
  backspace: "\u232B"
}, shortcutWinMap = {
  cmd: "ctrl"
}, mapToOs = (value) => isMac ? value : value.map((key) => shortcutWinMap[key] || key), format = (value) => mapToOs(value).map((shortcut) => shortcutSymbolMap[shortcut] ?? shortcut.toUpperCase()), ShortcutHint = ({ value }) => /* @__PURE__ */ React.createElement(Text, {
  size: "1",
  css: { letterSpacing: 1.5 }
}, format(value));

// app/designer/features/topbar/menu/menu.tsx
var menuItemCss = {
  display: "flex",
  gap: "$3",
  justifyContent: "start",
  flexGrow: 1,
  minWidth: 140
}, textCss = {
  flexGrow: 1,
  fontSize: "$1"
}, Menu2 = ({ config: config4, publish: publish12 }) => {
  let navigate = (0, import_react_router_dom4.useNavigate)(), [, setIsShareOpen] = useIsShareDialogOpen(), [, setIsPublishOpen] = useIsPublishDialogOpen();
  return /* @__PURE__ */ React.createElement(DropdownMenu, null, /* @__PURE__ */ React.createElement(DropdownMenuTrigger, {
    asChild: !0
  }, /* @__PURE__ */ React.createElement(IconButton, {
    "aria-label": "Menu Button"
  }, /* @__PURE__ */ React.createElement(icons_exports.HamburgerMenuIcon, null))), /* @__PURE__ */ React.createElement(DropdownMenuContent, null, /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      navigate(config4.dashboardPath);
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Dashboard")), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      publish12({
        type: "shortcut",
        payload: "undo"
      });
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Undo"), /* @__PURE__ */ React.createElement(ShortcutHint, {
    value: ["cmd", "z"]
  })), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      publish12({
        type: "shortcut",
        payload: "redo"
      });
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Redo"), /* @__PURE__ */ React.createElement(ShortcutHint, {
    value: ["shift", "cmd", "z"]
  })), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      publish12({
        type: "shortcut",
        payload: "copy"
      });
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Copy"), /* @__PURE__ */ React.createElement(ShortcutHint, {
    value: ["cmd", "c"]
  })), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      publish12({
        type: "shortcut",
        payload: "paste"
      });
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Paste"), /* @__PURE__ */ React.createElement(ShortcutHint, {
    value: ["cmd", "v"]
  })), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      publish12({
        type: "shortcut",
        payload: "delete"
      });
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Delete"), /* @__PURE__ */ React.createElement(ShortcutHint, {
    value: ["backspace"]
  })), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      publish12({ type: "openBreakpointsMenu" });
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Breakpoints"), /* @__PURE__ */ React.createElement(ShortcutHint, {
    value: ["cmd", "b"]
  })), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      publish12({
        type: "zoom",
        payload: "zoomIn"
      });
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Zoom in"), /* @__PURE__ */ React.createElement(ShortcutHint, {
    value: ["cmd", "+"]
  })), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      publish12({
        type: "zoom",
        payload: "zoomOut"
      });
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Zoom out"), /* @__PURE__ */ React.createElement(ShortcutHint, {
    value: ["cmd", "-"]
  })), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      publish12({
        type: "togglePreviewMode"
      });
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Preview"), /* @__PURE__ */ React.createElement(ShortcutHint, {
    value: ["cmd", "shift", "p"]
  })), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      setIsShareOpen(!0);
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Share")), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: menuItemCss,
    onSelect: () => {
      setIsPublishOpen(!0);
    }
  }, /* @__PURE__ */ React.createElement(Text, {
    css: textCss
  }, "Publish")), /* @__PURE__ */ React.createElement(DropdownMenuArrow, {
    offset: 10
  })));
};

// app/designer/features/breakpoints/breakpoints.tsx
var import_react46 = require("react"), import_sdk27 = require("@webstudio-is/sdk");

// app/designer/features/breakpoints/breakpoints-editor.tsx
var import_react43 = require("react"), import_useDebounce = __toESM(require("react-use/lib/useDebounce"));
var import_bson_objectid6 = __toESM(require("bson-objectid"));
var BreakpointEditorItem = ({
  breakpoint: initialBreakpoint,
  onChange,
  onDelete
}) => {
  let [breakpoint, setBreakpoint] = (0, import_react43.useState)(initialBreakpoint);
  return (0, import_useDebounce.default)(() => {
    breakpoint !== initialBreakpoint && onChange(breakpoint);
  }, 500, [breakpoint]), /* @__PURE__ */ React.createElement("form", {
    onKeyDown: (event) => {
      event.stopPropagation();
    },
    onChange: (event) => {
      event.stopPropagation();
      let form = event.currentTarget;
      if (form.reportValidity() === !1)
        return;
      let data = new FormData(form), nextBreakpoint = __spreadProps(__spreadValues({}, breakpoint), {
        label: String(data.get("label")),
        minWidth: Number(data.get("minWidth"))
      });
      setBreakpoint(nextBreakpoint);
    }
  }, /* @__PURE__ */ React.createElement(Flex, {
    gap: "1",
    css: { paddingLeft: "$4", paddingRight: "$3" }
  }, /* @__PURE__ */ React.createElement(TextField, {
    css: { width: 100, flexGrow: 1 },
    type: "text",
    variant: "ghost",
    defaultValue: breakpoint.label,
    placeholder: "Breakpoint name",
    name: "label",
    minLength: 2,
    required: !0
  }), /* @__PURE__ */ React.createElement(TextField, {
    css: { textAlign: "right", width: 50 },
    variant: "ghost",
    defaultValue: breakpoint.minWidth,
    type: "number",
    name: "minWidth",
    min: 0,
    required: !0
  }), /* @__PURE__ */ React.createElement(Button, {
    type: "button",
    ghost: !0,
    onClick: () => {
      onDelete(breakpoint);
    }
  }, /* @__PURE__ */ React.createElement(icons_exports.TrashIcon, null))));
}, BreakpointsEditor = ({
  publish: publish12,
  onDelete
}) => {
  let [breakpoints, setBreakpoints2] = useBreakpoints();
  return /* @__PURE__ */ React.createElement(Flex, {
    gap: "2",
    direction: "column"
  }, /* @__PURE__ */ React.createElement(Flex, {
    align: "center",
    gap: "1",
    justify: "between",
    css: { paddingLeft: "$5", paddingRight: "$3", py: "$1" }
  }, /* @__PURE__ */ React.createElement(Text, null, "Breakpoints"), /* @__PURE__ */ React.createElement(Button, {
    ghost: !0,
    onClick: () => {
      setBreakpoints2([
        ...breakpoints,
        {
          id: (0, import_bson_objectid6.default)().toString(),
          label: "",
          minWidth: 0
        }
      ]);
    }
  }, /* @__PURE__ */ React.createElement(icons_exports.PlusIcon, null))), breakpoints.map((breakpoint) => /* @__PURE__ */ React.createElement(BreakpointEditorItem, {
    key: breakpoint.id,
    breakpoint,
    onChange: (updatedBreakpoint) => {
      publish12({ type: "breakpointChange", payload: updatedBreakpoint });
      let nextBreakpoints = breakpoints.map((breakpoint2) => breakpoint2.id === updatedBreakpoint.id ? updatedBreakpoint : breakpoint2);
      setBreakpoints2(nextBreakpoints);
    },
    onDelete
  })));
};

// app/designer/features/breakpoints/preview.tsx
var Preview = ({ breakpoint }) => /* @__PURE__ */ React.createElement(Flex, {
  css: { px: "$5", py: "$1" },
  gap: "1",
  direction: "column"
}, /* @__PURE__ */ React.createElement(Text, {
  size: "1"
}, "CSS Preview"), /* @__PURE__ */ React.createElement(Paragraph, {
  css: { fontSize: "$1" },
  variant: "gray"
}, breakpoint === void 0 ? "No breakpoint selected" : `@media (min-width: ${breakpoint.minWidth}px)`));

// app/designer/features/breakpoints/zoom-setting.tsx
var minZoom = 10, ZoomSetting = () => {
  let [value, setValue] = useZoom();
  return /* @__PURE__ */ React.createElement(Flex, {
    css: { px: "$5", py: "$1" },
    gap: "1",
    direction: "column"
  }, /* @__PURE__ */ React.createElement(Text, {
    size: "1"
  }, "Zoom"), /* @__PURE__ */ React.createElement(Flex, {
    gap: "3",
    align: "center"
  }, /* @__PURE__ */ React.createElement(Slider, {
    min: minZoom,
    value: [value],
    onValueChange: ([value2]) => {
      setValue(value2);
    }
  }), /* @__PURE__ */ React.createElement(Text, {
    size: "1"
  }, value, "%")));
};

// app/designer/features/breakpoints/trigger-button.tsx
var import_react44 = require("react");
var renderIcon = (breakpoint, variant) => {
  let color = variant === "contrast" ? "white" : "gray";
  return breakpoint.minWidth >= 1280 ? /* @__PURE__ */ React.createElement(icons_exports.DesktopIcon, {
    color
  }) : breakpoint.minWidth >= 1024 ? /* @__PURE__ */ React.createElement(icons_exports.LaptopIcon, {
    color
  }) : breakpoint.minWidth >= 768 ? /* @__PURE__ */ React.createElement(TabletIcon, {
    color
  }) : /* @__PURE__ */ React.createElement(icons_exports.MobileIcon, {
    color
  });
}, TriggerButton = (0, import_react44.forwardRef)((props2, ref) => {
  let [zoom] = useZoom(), [breakpoint] = useSelectedBreakpoint(), [canvasWidth] = useCanvasWidth();
  if (breakpoint === void 0)
    return null;
  let variant = willRender(breakpoint, canvasWidth) ? "contrast" : "gray";
  return /* @__PURE__ */ React.createElement(Button, __spreadProps(__spreadValues({}, props2), {
    ref,
    css: { gap: "$1" },
    ghost: !0,
    "aria-label": "Show breakpoints"
  }), renderIcon(breakpoint, variant), /* @__PURE__ */ React.createElement(Text, {
    size: "1",
    variant
  }, `${breakpoint.label} ${canvasWidth}px / ${zoom}%`));
});
TriggerButton.displayName = "TriggerButton";

// app/designer/features/breakpoints/width-setting.tsx
var import_react45 = require("react");
var minWidth = 50, maxWidth = 3e3, useNextBreakpoint = () => {
  let [selectedBreakpoint] = useSelectedBreakpoint(), [breakpoints] = useBreakpoints(), sortedBreakpoints = (0, import_react45.useMemo)(() => sort(breakpoints), [breakpoints]);
  return (0, import_react45.useMemo)(() => {
    if (selectedBreakpoint === void 0)
      return;
    let index = sortedBreakpoints.findIndex((breakpoint) => breakpoint.id === selectedBreakpoint.id);
    if (index !== -1)
      return sortedBreakpoints[index + 1];
  }, [sortedBreakpoints, selectedBreakpoint]);
}, WidthSetting = () => {
  let [value, setValue] = useCanvasWidth(), [selectedBreakpoint] = useSelectedBreakpoint(), nextBreakpoint = useNextBreakpoint(), [isPreviewMode] = useIsPreviewMode();
  if (selectedBreakpoint === void 0)
    return null;
  let min = isPreviewMode ? minWidth : Math.max(minWidth, selectedBreakpoint.minWidth), max = isPreviewMode ? maxWidth : Math.min(maxWidth, nextBreakpoint ? nextBreakpoint.minWidth - 1 : maxWidth);
  return /* @__PURE__ */ React.createElement(Flex, {
    css: { px: "$5", py: "$1" },
    gap: "1",
    direction: "column"
  }, /* @__PURE__ */ React.createElement(Text, {
    size: "1"
  }, "Canvas width"), /* @__PURE__ */ React.createElement(Flex, {
    gap: "3",
    align: "center"
  }, /* @__PURE__ */ React.createElement(Slider, {
    min,
    max,
    value: [value],
    onValueChange: ([value2]) => {
      setValue(value2);
    }
  }), /* @__PURE__ */ React.createElement(Text, {
    size: "1"
  }, `${value}px`)));
};

// app/designer/features/breakpoints/use-subscribe-shortcuts.ts
var import_sdk26 = require("@webstudio-is/sdk");
var useSubscribeSelectBreakpointFromShortcut = () => {
  let [breakpoints] = useBreakpoints(), [, setSelectedBreakpoint] = useSelectedBreakpoint();
  (0, import_sdk26.useSubscribe)("selectBreakpointFromShortcut", (index) => {
    let breakpoint = sort(breakpoints)[index - 1];
    breakpoint && setSelectedBreakpoint(breakpoint);
  });
}, zoomStep = 20, useSubscribeZoomFromShortcut = () => {
  let [zoom, setZoom] = useZoom();
  (0, import_sdk26.useSubscribe)("zoom", (direction) => {
    if (direction === "zoomIn") {
      setZoom(Math.min(zoom + zoomStep, 100));
      return;
    }
    setZoom(Math.max(zoom - zoomStep, minZoom));
  });
};

// app/designer/features/breakpoints/confirmation-dialog.tsx
var ConfirmationDialog = ({
  breakpoint,
  onConfirm,
  onAbort
}) => /* @__PURE__ */ React.createElement(Flex, {
  gap: "2",
  direction: "column",
  css: { px: "$5", py: "$2", width: 300 }
}, /* @__PURE__ */ React.createElement(Text, {
  size: "2",
  css: { lineHeight: 1.5 }
}, `Are you sure you want to delete "${breakpoint.label}"?`), /* @__PURE__ */ React.createElement(Text, {
  size: "2",
  css: { lineHeight: 1.5 }
}, `Deleting a breakpoint will also delete all styles associated with this
        breakpoint.`), /* @__PURE__ */ React.createElement(Flex, {
  justify: "end",
  gap: "2"
}, /* @__PURE__ */ React.createElement(Button, {
  onClick: () => {
    onConfirm();
  }
}, "Delete"), /* @__PURE__ */ React.createElement(Button, {
  autoFocus: !0,
  onClick: () => {
    onAbort();
  }
}, "Abort")));

// app/designer/features/breakpoints/breakpoints.tsx
var BreakpointSelectorItem = ({
  breakpoint
}) => {
  let [canvasWidth] = useCanvasWidth();
  return /* @__PURE__ */ React.createElement(Flex, {
    align: "center",
    justify: "between",
    gap: "3",
    css: { flexGrow: 1 }
  }, /* @__PURE__ */ React.createElement(Text, {
    size: "1",
    css: { flexGrow: 1 }
  }, breakpoint.label), /* @__PURE__ */ React.createElement(Text, {
    size: "1",
    variant: willRender(breakpoint, canvasWidth) ? "contrast" : "gray"
  }, breakpoint.minWidth));
}, menuItemCss2 = {
  display: "flex",
  gap: "$3",
  justifyContent: "start",
  flexGrow: 1,
  minWidth: 180
}, Breakpoints = ({ publish: publish12 }) => {
  let [view, setView] = (0, import_react46.useState)(), [breakpointToDelete, setBreakpointToDelete] = (0, import_react46.useState)(), [breakpoints, setBreakpoints2] = useBreakpoints(), [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint(), [breakpointPreview, setBreakpointPreview] = (0, import_react46.useState)(selectedBreakpoint);
  return useSubscribeSelectBreakpointFromShortcut(), useSubscribeZoomFromShortcut(), (0, import_react46.useEffect)(() => {
    setBreakpointPreview(selectedBreakpoint);
  }, [selectedBreakpoint]), (0, import_sdk27.useSubscribe)("openBreakpointsMenu", () => {
    setView("selector");
  }), (0, import_sdk27.useSubscribe)("clickCanvas", () => {
    setView(void 0);
  }), selectedBreakpoint === void 0 ? null : /* @__PURE__ */ React.createElement(DropdownMenu, {
    open: view !== void 0,
    onOpenChange: (isOpen) => {
      setView(isOpen ? "selector" : void 0);
    }
  }, /* @__PURE__ */ React.createElement(DropdownMenuTrigger, {
    asChild: !0
  }, /* @__PURE__ */ React.createElement(TriggerButton, null)), /* @__PURE__ */ React.createElement(DropdownMenuContent, null, view === "confirmation" && /* @__PURE__ */ React.createElement(ConfirmationDialog, {
    breakpoint: selectedBreakpoint,
    onAbort: () => {
      setBreakpointToDelete(void 0), setView("editor");
    },
    onConfirm: () => {
      if (breakpointToDelete === void 0)
        return;
      let nextBreakpoints = [...breakpoints], index = breakpoints.indexOf(breakpointToDelete);
      nextBreakpoints.splice(index, 1), setBreakpoints2(nextBreakpoints), breakpointToDelete === selectedBreakpoint && setSelectedBreakpoint(sort(nextBreakpoints)[0]), publish12({
        type: "breakpointDelete",
        payload: breakpointToDelete
      }), setBreakpointToDelete(void 0), setView("editor");
    }
  }), view === "editor" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(BreakpointsEditor, {
    breakpoints,
    publish: publish12,
    onDelete: (breakpoint) => {
      setBreakpointToDelete(breakpoint), setView("confirmation");
    }
  }), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: { justifyContent: "center" },
    onSelect: (event) => {
      event.preventDefault(), setView("selector");
    }
  }, "Done")), view === "selector" && /* @__PURE__ */ React.createElement(React.Fragment, null, sort(breakpoints).map((breakpoint) => /* @__PURE__ */ React.createElement(DropdownMenuCheckboxItem, {
    checked: breakpoint === selectedBreakpoint,
    key: breakpoint.id,
    css: menuItemCss2,
    onMouseEnter: () => {
      setBreakpointPreview(breakpoint);
    },
    onMouseLeave: () => {
      setBreakpointPreview(selectedBreakpoint);
    },
    onSelect: () => {
      setSelectedBreakpoint(breakpoint);
    }
  }, /* @__PURE__ */ React.createElement(BreakpointSelectorItem, {
    breakpoint
  }))), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement("form", null, /* @__PURE__ */ React.createElement(ZoomSetting, null), /* @__PURE__ */ React.createElement(WidthSetting, null)), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement(Preview, {
    breakpoint: breakpointPreview
  }), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement(DropdownMenuItem, {
    css: { justifyContent: "center" },
    onSelect: (event) => {
      event.preventDefault(), setView("editor");
    }
  }, "Edit breakpoints")), /* @__PURE__ */ React.createElement(DropdownMenuArrow, {
    offset: 10
  })));
};

// app/designer/features/breakpoints/use-update-canvas-width.ts
var import_react47 = require("react");
var useUpdateCanvasWidth = () => {
  let [selectedBreakpoint] = useSelectedBreakpoint(), [canvasWidth, setCanvasWidth] = useCanvasWidth(), [isPreviewMode] = useIsPreviewMode();
  return (0, import_react47.useEffect)(() => {
    isPreviewMode === !0 || selectedBreakpoint === void 0 || setCanvasWidth(Math.max(selectedBreakpoint.minWidth, minWidth));
  }, [isPreviewMode, selectedBreakpoint, setCanvasWidth]), (0, import_react47.useEffect)(() => {
    if (selectedBreakpoint !== void 0) {
      if (selectedBreakpoint.minWidth === 0) {
        setCanvasWidth(minWidth);
        return;
      }
      setCanvasWidth(Math.max(selectedBreakpoint.minWidth, minWidth));
    }
  }, [selectedBreakpoint, setCanvasWidth]), (0, import_react47.useCallback)((iframe) => {
    iframe === null || selectedBreakpoint === void 0 || canvasWidth !== 0 || setCanvasWidth(minWidth);
  }, [canvasWidth, selectedBreakpoint, setCanvasWidth]);
};

// app/designer/features/breakpoints/use-subscribe-breakpoints.ts
var import_react48 = require("react"), import_sdk28 = require("@webstudio-is/sdk");
var useSubscribeBreakpoints = () => {
  let [breakpoints, setBreakpoints2] = useBreakpoints(), [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint();
  (0, import_sdk28.useSubscribe)("loadBreakpoints", setBreakpoints2), (0, import_react48.useEffect)(() => {
    if (selectedBreakpoint === void 0 && breakpoints.length !== 0 && setSelectedBreakpoint(sort(breakpoints)[0]), selectedBreakpoint !== void 0 && breakpoints.includes(selectedBreakpoint) === !1) {
      let nextSelectedBreakpoint = breakpoints.find((breakpoint) => breakpoint.id === selectedBreakpoint.id);
      nextSelectedBreakpoint !== void 0 && setSelectedBreakpoint(nextSelectedBreakpoint);
    }
  }, [breakpoints, selectedBreakpoint, setSelectedBreakpoint]);
};

// app/designer/features/topbar/topbar.tsx
var Topbar = ({ config: config4, css: css2, project, publish: publish12 }) => /* @__PURE__ */ React.createElement(Flex, {
  as: "header",
  align: "center",
  justify: "between",
  css: __spreadValues({
    p: "$1",
    bc: "$loContrast",
    borderBottom: "1px solid $slate8"
  }, css2)
}, /* @__PURE__ */ React.createElement(Menu2, {
  config: config4,
  publish: publish12
}), /* @__PURE__ */ React.createElement(Breakpoints, {
  publish: publish12
}), /* @__PURE__ */ React.createElement(Flex, {
  gap: "1",
  align: "center"
}, /* @__PURE__ */ React.createElement(SyncStatus, null), /* @__PURE__ */ React.createElement(PreviewButton, {
  publish: publish12
}), /* @__PURE__ */ React.createElement(ShareButton, {
  path: config4.previewPath,
  project
}), /* @__PURE__ */ React.createElement(PublishButton, {
  project
})));

// app/designer/designer.css
var designer_default2 = "/build/_assets/designer-AWJKBZLB.css";

// app/designer/features/breadcrumbs/breadcrumbs.tsx
var Breadcrumb = ({ component, onClick }) => /* @__PURE__ */ React.createElement(Flex, {
  align: "center"
}, /* @__PURE__ */ React.createElement(Button, {
  ghost: !0,
  css: { color: "$loContrast", px: 0 },
  onClick
}, component), " ", /* @__PURE__ */ React.createElement(icons_exports.ChevronRightIcon, null)), EmptyState = () => /* @__PURE__ */ React.createElement(Text, {
  variant: "loContrast",
  size: "1"
}, "No instance selected"), Breadcrumbs = ({ publish: publish12 }) => {
  let [selectedInstanceData] = useSelectedInstanceData(), selectedInstancePath = useSelectedInstancePath(selectedInstanceData == null ? void 0 : selectedInstanceData.id);
  return /* @__PURE__ */ React.createElement(Flex, {
    as: "footer",
    align: "center",
    css: { height: "$5", background: "$hiContrast", padding: "$1" }
  }, selectedInstancePath.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, null) : selectedInstancePath.map((instance) => /* @__PURE__ */ React.createElement(Breadcrumb, {
    key: instance.id,
    component: instance.component,
    onClick: () => {
      publish12({
        type: "selectInstanceById",
        payload: instance.id
      });
    }
  })));
};

// app/designer/features/tree-preview/tree-preview.tsx
var import_sdk29 = require("@webstudio-is/sdk"), import_immer6 = __toESM(require("immer")), import_react49 = require("react");
var TreePrevew = () => {
  let [rootInstance] = useRootInstance(), [draftRootInstance, setDraftRootInstance] = (0, import_react49.useState)(rootInstance), [instanceId, setInstanceId] = (0, import_react49.useState)();
  if ((0, import_sdk29.useSubscribe)("dropPreview", ({ dragData, dropData }) => {
    if (rootInstance === void 0)
      return;
    setInstanceId(dragData.instance.id);
    let isNew = findInstanceById(rootInstance, dragData.instance.id) === void 0, updatedRootInstance = (0, import_immer6.default)((rootInstanceDraft) => {
      isNew === !1 && dropData.instance.id !== dragData.instance.id && deleteInstanceMutable(rootInstanceDraft, dragData.instance.id), insertInstanceMutable(rootInstanceDraft, dragData.instance, {
        parentId: dropData.instance.id,
        position: dropData.position
      });
    })(rootInstance);
    setDraftRootInstance(updatedRootInstance);
  }), draftRootInstance === void 0 || instanceId === void 0)
    return null;
  let selectedInstancePath = getInstancePath(draftRootInstance, instanceId);
  return selectedInstancePath.length === 0 ? null : /* @__PURE__ */ React.createElement(Flex, {
    gap: "3",
    direction: "column",
    css: { padding: "$1" }
  }, /* @__PURE__ */ React.createElement(Tree, {
    instance: draftRootInstance,
    selectedInstancePath,
    selectedInstanceId: instanceId,
    animate: !1
  }));
};

// app/designer/features/workspace/canvas-tools/outline/outline.tsx
var import_react50 = require("react");
var OutlineContainer = styled("div", {
  position: "absolute",
  pointerEvents: "none",
  outline: "1px solid $blue9",
  outlineOffset: -1,
  top: 0,
  left: 0
}), useStyle = (rect) => (0, import_react50.useMemo)(() => {
  if (rect !== void 0)
    return {
      transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
      width: rect.width,
      height: rect.height
    };
}, [rect]), Outline = ({ children: children6, rect }) => {
  let style = useStyle(rect);
  return /* @__PURE__ */ React.createElement(OutlineContainer, {
    style
  }, children6);
};

// app/designer/features/workspace/canvas-tools/outline/label.tsx
var import_react51 = require("react");
var useLabelPosition = (instanceRect) => {
  let [position, setPosition] = (0, import_react51.useState)("top");
  return [(0, import_react51.useCallback)((element) => {
    if (element === null || instanceRect === void 0)
      return;
    let labelRect = element.getBoundingClientRect(), nextPosition = "top";
    labelRect.height > instanceRect.top && (nextPosition = instanceRect.height < 250 ? "bottom" : "inside"), setPosition(nextPosition);
  }, [instanceRect]), position];
}, LabelContainer = styled("div", {
  position: "absolute",
  display: "flex",
  padding: "0 $1",
  height: "$4",
  color: "$hiContrast",
  alignItems: "center",
  justifyContent: "center",
  gap: "$1",
  fontSize: "$2",
  fontFamily: "$sans",
  lineHeight: 1,
  minWidth: "$6",
  whiteSpace: "nowrap",
  backgroundColor: "$blue9",
  pointerEvents: "auto"
}, {
  variants: {
    position: {
      top: {
        top: "-$4"
      },
      inside: {
        top: 0
      },
      bottom: {
        bottom: "-$4"
      }
    }
  }
}), Label4 = ({ component, instanceRect }) => {
  let [labelRef, position] = useLabelPosition(instanceRect), primitive = primitives_exports[component], { Icon: Icon2 } = primitive;
  return /* @__PURE__ */ React.createElement(LabelContainer, {
    position,
    ref: labelRef
  }, /* @__PURE__ */ React.createElement(Icon2, {
    width: "1em",
    height: "1em"
  }), primitive.label);
};

// app/designer/features/workspace/canvas-tools/outline/selected-instance-outline.tsx
var SelectedInstanceOutline = () => {
  let [instanceRect] = useSelectedInstanceRect(), [instanceData] = useSelectedInstanceData(), [textEditingInstanceId] = useTextEditingInstanceId(), isEditingCurrentInstance = textEditingInstanceId !== void 0 && textEditingInstanceId === (instanceData == null ? void 0 : instanceData.id);
  return instanceData === void 0 || instanceRect === void 0 || isEditingCurrentInstance ? null : /* @__PURE__ */ React.createElement(Outline, {
    rect: instanceRect
  }, /* @__PURE__ */ React.createElement(Label4, {
    component: instanceData.component,
    instanceRect
  }));
};

// app/designer/features/workspace/canvas-tools/outline/hovered-instance-outline.tsx
var HoveredInstanceOutline = () => {
  let [selectedInstanceData] = useSelectedInstanceData(), [instanceRect] = useHoveredInstanceRect(), [hoveredInstanceData] = useHoveredInstanceData(), [textEditingInstanceId] = useTextEditingInstanceId(), isEditingText = textEditingInstanceId !== void 0, isHoveringSelectedInstance = (selectedInstanceData == null ? void 0 : selectedInstanceData.id) === (hoveredInstanceData == null ? void 0 : hoveredInstanceData.id);
  return hoveredInstanceData === void 0 || instanceRect === void 0 || isHoveringSelectedInstance || isEditingText ? null : /* @__PURE__ */ React.createElement(Outline, {
    rect: instanceRect
  }, /* @__PURE__ */ React.createElement(Label4, {
    component: hoveredInstanceData.component,
    instanceRect
  }));
};

// app/designer/features/workspace/canvas-tools/text-toolbar/text-toolbar.tsx
var import_react52 = require("react");
var getPlacement = ({
  toolbarRect,
  selectionRect
}) => {
  let align = "top", left = selectionRect.x + selectionRect.width / 2, visibility = "hidden";
  toolbarRect !== void 0 && (visibility = "visible", left = Math.max(left, toolbarRect.width / 2), left = Math.min(left, window.innerWidth - toolbarRect.width / 2), align = selectionRect.y > toolbarRect.height ? "top" : "bottom");
  let marginBottom = align === "bottom" ? "-$5" : 0, marginTop = align === "bottom" ? 0 : "-$5", transform = "translateX(-50%)";
  return { top: align === "top" ? Math.max(selectionRect.y - selectionRect.height, 0) : Math.max(selectionRect.y + selectionRect.height), left, marginBottom, marginTop, transform, visibility };
}, onClickPreventDefault = (event) => {
  event.preventDefault(), event.stopPropagation();
}, Toolbar = ({ css: css2, onValueChange, rootRef }) => /* @__PURE__ */ React.createElement(toggle_group_exports.Root, {
  ref: rootRef,
  type: "single",
  onValueChange,
  onClick: onClickPreventDefault,
  css: __spreadValues({
    position: "absolute",
    borderRadius: "$1",
    padding: "$1 $2",
    pointerEvents: "auto"
  }, css2)
}, /* @__PURE__ */ React.createElement(toggle_group_exports.Item, {
  value: "Bold"
}, /* @__PURE__ */ React.createElement(icons_exports.FontBoldIcon, null)), /* @__PURE__ */ React.createElement(toggle_group_exports.Item, {
  value: "Italic"
}, /* @__PURE__ */ React.createElement(icons_exports.FontItalicIcon, null)), /* @__PURE__ */ React.createElement(toggle_group_exports.Item, {
  value: "Link"
}, /* @__PURE__ */ React.createElement(icons_exports.Link2Icon, null))), TextToolbar = ({ publish: publish12 }) => {
  let [selectionRect] = useSelectionRect(), [selectedIntsanceData] = useSelectedInstanceData(), [element, setElement] = (0, import_react52.useState)(null), placement = (0, import_react52.useMemo)(() => {
    if (selectionRect === void 0 || element === null)
      return;
    let toolbarRect = element.getBoundingClientRect();
    return getPlacement({ toolbarRect, selectionRect });
  }, [selectionRect, element]);
  return selectionRect === void 0 || selectedIntsanceData === void 0 ? null : /* @__PURE__ */ React.createElement(Toolbar, {
    rootRef: setElement,
    css: placement,
    onValueChange: (component) => {
      let instance = createInstance({ component });
      publish12({
        type: "insertInlineInstance",
        payload: instance
      });
    }
  });
};

// app/designer/features/workspace/canvas-tools/hooks/use-subscribe-instance-rect.ts
var import_sdk30 = require("@webstudio-is/sdk");
var useSubscribeInstanceRect = () => {
  let [, setSelectedRect] = useSelectedInstanceRect();
  (0, import_sdk30.useSubscribe)("selectedInstanceRect", setSelectedRect);
  let [, setHoveredRect] = useHoveredInstanceRect();
  (0, import_sdk30.useSubscribe)("hoveredInstanceRect", setHoveredRect);
};

// app/designer/features/workspace/canvas-tools/hooks/use-subscribe-selection-rect.ts
var import_sdk31 = require("@webstudio-is/sdk");
var useSubscribeSelectionRect = () => {
  let [, setSelectionRect] = useSelectionRect();
  (0, import_sdk31.useSubscribe)("selectionRect", setSelectionRect);
};

// app/designer/features/workspace/canvas-tools/hooks/use-subscribe-editing-instance-id.ts
var import_sdk32 = require("@webstudio-is/sdk");
var useSubscribeTextEditingInstanceId = () => {
  let [, setInstanceId] = useTextEditingInstanceId();
  (0, import_sdk32.useSubscribe)("textEditingInstanceId", setInstanceId);
};

// app/designer/features/workspace/canvas-tools/canvas-tools.tsx
var toolsStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  pointerEvents: "none",
  overflow: "hidden"
}, CanvasTools = ({ publish: publish12 }) => {
  useSubscribeInstanceRect(), useSubscribeSelectionRect(), useSubscribeScrollState(), useSubscribeTextEditingInstanceId();
  let [isPreviewMode] = useIsPreviewMode(), [isScrolling] = useIsScrolling();
  return isPreviewMode || isScrolling ? null : /* @__PURE__ */ React.createElement(Box, {
    css: toolsStyle
  }, /* @__PURE__ */ React.createElement(SelectedInstanceOutline, null), /* @__PURE__ */ React.createElement(HoveredInstanceOutline, null), /* @__PURE__ */ React.createElement(TextToolbar, {
    publish: publish12
  }));
};

// app/designer/features/workspace/workspace.tsx
var workspaceStyle = {
  flexGrow: 1,
  background: "$gray8",
  overflow: "auto",
  scrollbarGutter: "stable"
}, zoomStyle = {
  transformStyle: "preserve-3d",
  transition: "transform 200ms ease-out",
  height: "100%",
  width: "100%"
}, canvasContainerStyle = {
  position: "relative",
  height: "100%"
}, Workspace = ({
  children: children6,
  onTransitionEnd,
  publish: publish12
}) => {
  let [zoom] = useZoom(), [canvasWidth] = useCanvasWidth();
  return /* @__PURE__ */ React.createElement(Box, {
    css: workspaceStyle,
    onClick: () => {
      publish12({ type: "unselectInstance" });
    }
  }, /* @__PURE__ */ React.createElement(Flex, {
    direction: "column",
    align: "center",
    css: zoomStyle,
    style: { transform: `scale(${zoom / 100})` },
    onTransitionEnd
  }, /* @__PURE__ */ React.createElement(Box, {
    css: canvasContainerStyle,
    style: { width: canvasWidth }
  }, children6, /* @__PURE__ */ React.createElement(CanvasTools, {
    publish: publish12
  }))));
};

// app/designer/features/workspace/use-read-canvas-rect.ts
var import_react56 = require("react");

// app/shared/dom-hooks/use-window-resize.ts
var import_react53 = require("react"), import_mitt = __toESM(require("mitt")), emitter = (0, import_mitt.default)();
typeof window == "object" && window.addEventListener("resize", () => {
  emitter.emit("resize");
}, !1);
var useWindowResize = (onResize) => {
  (0, import_react53.useEffect)(() => (emitter.on("resize", onResize), () => {
    emitter.off("resize", onResize);
  }), [onResize]);
};

// app/shared/dom-hooks/use-measure.ts
var import_react55 = require("react");

// app/shared/dom-hooks/use-scroll-state.ts
var import_react54 = require("react"), import_mitt2 = __toESM(require("mitt")), import_lodash7 = __toESM(require("lodash.noop")), emitter2 = (0, import_mitt2.default)();
if (typeof window == "object") {
  let eventOptions3 = {
    passive: !0,
    capture: !0
  };
  window.addEventListener("scroll", () => {
    emitter2.emit("scroll");
  }, eventOptions3);
  let timeoutId = 0, isScrolling = !1;
  emitter2.on("scroll", () => {
    isScrolling = !0, emitter2.emit("scrollStart"), clearTimeout(timeoutId), timeoutId = window.setTimeout(() => {
      isScrolling !== !1 && (isScrolling = !1, emitter2.emit("scrollEnd"));
    }, 150);
  });
}
var useScrollState = ({
  onScroll = import_lodash7.default,
  onScrollStart = import_lodash7.default,
  onScrollEnd = import_lodash7.default
}) => {
  (0, import_react54.useEffect)(() => (emitter2.on("scrollStart", onScrollStart), emitter2.on("scroll", onScroll), emitter2.on("scrollEnd", onScrollEnd), () => {
    emitter2.off("scrollStart", onScrollStart), emitter2.off("scroll", onScroll), emitter2.off("scrollEnd", onScrollEnd);
  }), [onScroll, onScrollEnd, onScrollStart]);
};

// app/shared/dom-hooks/use-measure.ts
var useMeasure = () => {
  let [element, setElement] = (0, import_react55.useState)(null), [rect, setRect] = (0, import_react55.useState)(), handleChange = (0, import_react55.useCallback)(() => {
    element !== null && setRect(element.getBoundingClientRect());
  }, [element]);
  useScrollState({
    onScrollEnd: handleChange
  });
  let observer = (0, import_react55.useMemo)(() => {
    if (!(typeof window > "u"))
      return new window.ResizeObserver(handleChange);
  }, [handleChange]);
  return (0, import_react55.useEffect)(() => (observer && (element === null ? observer.disconnect() : observer.observe(element)), () => {
    observer == null || observer.disconnect();
  }), [element, observer]), (0, import_react55.useEffect)(handleChange, [handleChange]), [setElement, rect];
};

// app/designer/features/workspace/use-read-canvas-rect.ts
var useReadCanvasRect = () => {
  let [iframeElement, setIframeElement] = (0, import_react56.useState)(null), [, setCanvasRect] = useCanvasRect(), [canvasWidth] = useCanvasWidth(), [zoom] = useZoom(), [recalcFlag, forceRecalc] = (0, import_react56.useState)(!1);
  useWindowResize(() => {
    forceRecalc(!recalcFlag);
  });
  let readRect = (0, import_react56.useCallback)(() => {
    iframeElement !== null && requestAnimationFrame(() => {
      let rect = iframeElement.getBoundingClientRect();
      setCanvasRect(rect);
    });
  }, [iframeElement, setCanvasRect, canvasWidth, zoom, recalcFlag]);
  return (0, import_react56.useEffect)(readRect, [readRect]), {
    onRef: setIframeElement,
    onTransitionEnd: readRect
  };
};

// app/designer/features/workspace/canvas-iframe.tsx
var import_react57 = require("react");
var iframeStyle = css({
  border: "none",
  variants: {
    pointerEvents: {
      none: {
        pointerEvents: "none"
      },
      all: {
        pointerEvents: "all"
      }
    }
  }
}), CanvasIframe = (0, import_react57.forwardRef)((_a, ref) => {
  var _b = _a, { pointerEvents = "all", css: css2 } = _b, rest = __objRest(_b, ["pointerEvents", "css"]);
  return /* @__PURE__ */ React.createElement("iframe", __spreadProps(__spreadValues({}, rest), {
    ref,
    className: iframeStyle({ pointerEvents, css: css2 })
  }));
});
CanvasIframe.displayName = "CanvasIframe";

// app/designer/shared/shortcuts/use-publish-shortcuts.ts
var import_react_hotkeys_hook = require("react-hotkeys-hook");

// app/shared/shortcuts/index.ts
var shortcuts = {
  undo: "cmd+z, ctrl+z",
  redo: "cmd+shift+z, ctrl+shift+z",
  preview: "cmd+shift+p, ctrl+shift+p",
  copy: "cmd+c, ctrl+c",
  paste: "cmd+v, ctrl+v",
  breakpointsMenu: "cmd+b, ctrl+b",
  breakpoint: Array.from(new Array(9)).map((_, index) => `cmd+${index + 1}, ctrl+${index + 1}`).join(", "),
  zoom: "cmd+=, ctrl+=, cmd+-, ctrl+-"
}, options = { splitKey: "+", keydown: !0 };

// app/designer/shared/shortcuts/use-publish-shortcuts.ts
var names = Object.keys(shortcuts), usePublishShortcuts = (publish12) => {
  names.forEach((name) => {
    (0, import_react_hotkeys_hook.useHotkeys)(shortcuts[name], (event) => {
      event.preventDefault(), publish12({
        type: "shortcut",
        payload: { name, key: event.key }
      });
    }, options, []);
  });
};

// app/designer/designer.tsx
var links2 = () => [
  { rel: "stylesheet", href: inter_default },
  { rel: "stylesheet", href: designer_default2 }
], useSubscribeRootInstance = () => {
  let [, setValue] = useRootInstance();
  (0, import_sdk33.useSubscribe)("loadRootInstance", setValue);
}, useSubscribeSelectedInstanceData = () => {
  let [, setValue] = useSelectedInstanceData();
  (0, import_sdk33.useSubscribe)("selectInstance", setValue);
}, useSubscribeHoveredInstanceData = () => {
  let [, setValue] = useHoveredInstanceData();
  (0, import_sdk33.useSubscribe)("hoverInstance", setValue);
}, useSubscribeSyncStatus = () => {
  let [, setValue] = useSyncStatus();
  (0, import_sdk33.useSubscribe)("syncStatus", setValue);
}, useIsDragging = () => {
  let [isDragging, setIsDragging] = (0, import_react58.useState)(!1);
  return (0, import_sdk33.useSubscribe)("dragStartInstance", () => {
    setIsDragging(!0);
  }), (0, import_sdk33.useSubscribe)("dragEndInstance", () => {
    setIsDragging(!1);
  }), [isDragging, setIsDragging];
}, SidePanel = ({
  children: children6,
  isPreviewMode,
  gridArea,
  css: css2
}) => isPreviewMode === !0 ? null : /* @__PURE__ */ React.createElement(Box, {
  as: "aside",
  css: __spreadValues({
    gridArea,
    display: "flex",
    px: 0,
    fg: 0,
    bc: "$loContrast",
    height: "100%"
  }, css2)
}, children6), Main = ({ children: children6 }) => /* @__PURE__ */ React.createElement(Flex, {
  as: "main",
  direction: "column",
  css: {
    gridArea: "main",
    overflow: "hidden"
  }
}, children6), ChromeWrapper = ({ children: children6, isPreviewMode }) => /* @__PURE__ */ React.createElement(Grid, {
  css: __spreadValues({
    height: "100vh",
    overflow: "hidden",
    display: "grid"
  }, isPreviewMode ? {
    gridTemplateColumns: "auto 1fr",
    gridTemplateRows: "auto 1fr",
    gridTemplateAreas: `
                "header header"
                "sidebar main"
              `
  } : {
    gridTemplateColumns: "auto 1fr 240px",
    gridTemplateRows: "auto 1fr",
    gridTemplateAreas: `
                "header header header"
                "sidebar main inspector"
              `
  })
}, children6), Designer2 = ({ config: config4, project }) => {
  useSubscribeSyncStatus(), useSubscribeRootInstance(), useSubscribeSelectedInstanceData(), useSubscribeHoveredInstanceData(), useSubscribeBreakpoints();
  let [publish12, publishRef] = (0, import_sdk33.usePublish)(), [isPreviewMode] = useIsPreviewMode(), [isDragging, setIsDragging] = useIsDragging();
  usePublishShortcuts(publish12);
  let onRefReadCanvasWidth = useUpdateCanvasWidth(), { onRef: onRefReadCanvas, onTransitionEnd } = useReadCanvasRect(), iframeRefCallback = (0, import_react58.useCallback)((ref) => {
    publishRef.current = ref, onRefReadCanvasWidth(ref), onRefReadCanvas(ref);
  }, [publishRef, onRefReadCanvasWidth, onRefReadCanvas]);
  return /* @__PURE__ */ React.createElement(import_react_dnd3.DndProvider, {
    backend: import_react_dnd_html5_backend2.HTML5Backend
  }, /* @__PURE__ */ React.createElement(ChromeWrapper, {
    isPreviewMode
  }, /* @__PURE__ */ React.createElement(SidePanel, {
    gridArea: "sidebar",
    isPreviewMode
  }, /* @__PURE__ */ React.createElement(SidebarLeft, {
    onDragChange: setIsDragging,
    publish: publish12
  })), /* @__PURE__ */ React.createElement(Topbar, {
    css: { gridArea: "header" },
    config: config4,
    project,
    publish: publish12
  }), /* @__PURE__ */ React.createElement(Main, null, /* @__PURE__ */ React.createElement(Workspace, {
    onTransitionEnd,
    publish: publish12
  }, /* @__PURE__ */ React.createElement(CanvasIframe, {
    ref: iframeRefCallback,
    src: `${config4.canvasPath}/${project.id}`,
    pointerEvents: isDragging ? "none" : "all",
    title: project.title,
    css: {
      height: "100%",
      width: "100%"
    }
  })), /* @__PURE__ */ React.createElement(Breadcrumbs, {
    publish: publish12
  })), /* @__PURE__ */ React.createElement(SidePanel, {
    gridArea: "inspector",
    isPreviewMode,
    css: { overflow: "hidden" }
  }, isDragging ? /* @__PURE__ */ React.createElement(TreePrevew, null) : /* @__PURE__ */ React.createElement(Inspector, {
    publish: publish12
  }))));
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/designer/$id.tsx
var loader11 = async ({ params }) => {
  if (params.id === void 0)
    throw new Error("Project id undefined");
  let project = await project_server_exports.loadById(params.id);
  return project === null ? { errors: `Project "${params.id}" not found` } : { config: config_default, project, env: env_server_default };
}, DesignerRoute = () => {
  let data = (0, import_react59.useLoaderData)();
  return "errors" in data ? /* @__PURE__ */ React.createElement("p", null, data.errors) : /* @__PURE__ */ React.createElement(Designer2, __spreadValues({}, data));
}, id_default = DesignerRoute;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/preview.tsx
var preview_exports = {};
__export(preview_exports, {
  default: () => preview_default,
  loader: () => loader12,
  meta: () => meta3
});

// app/shared/documents/canvas.tsx
var import_react60 = require("@remix-run/react"), import_sdk34 = require("@webstudio-is/sdk");
var Canvas = ({
  Outlet: Outlet3 = import_react60.Outlet
}) => /* @__PURE__ */ React.createElement("html", {
  lang: "en"
}, /* @__PURE__ */ React.createElement("head", null, /* @__PURE__ */ React.createElement("meta", {
  charSet: "utf-8"
}), /* @__PURE__ */ React.createElement("meta", {
  name: "viewport",
  content: "width=device-width,initial-scale=1"
}), /* @__PURE__ */ React.createElement("link", {
  rel: "icon",
  href: "/favicon.ico",
  type: "image/x-icon"
}), /* @__PURE__ */ React.createElement("link", {
  rel: "shortcut icon",
  href: "/favicon.ico",
  type: "image/x-icon"
}), /* @__PURE__ */ React.createElement(import_react60.Meta, null), /* @__PURE__ */ React.createElement(import_react60.Links, null), /* @__PURE__ */ React.createElement(import_sdk34.CriticalCss, null)), /* @__PURE__ */ React.createElement("body", null, /* @__PURE__ */ React.createElement(Outlet3, null), /* @__PURE__ */ React.createElement(import_react60.ScrollRestoration, null), /* @__PURE__ */ React.createElement(Env, null), /* @__PURE__ */ React.createElement(import_react60.Scripts, null), /* @__PURE__ */ React.createElement(import_react60.LiveReload, null)));

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/preview.tsx
var loader12 = () => ({
  env: env_server_default
}), meta3 = () => ({ title: "Webstudio site preview" }), preview_default = Canvas;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/preview/$projectId.tsx
var projectId_exports = {};
__export(projectId_exports, {
  default: () => projectId_default,
  loader: () => loader13
});
var import_react61 = require("@remix-run/react"), import_sdk35 = require("@webstudio-is/sdk");
var loader13 = async ({ params }) => {
  if (params.projectId === void 0)
    return { errors: "Missing projectId", env: env_server_default };
  try {
    let previewData = await loadPreviewData({ projectId: params.projectId });
    return __spreadProps(__spreadValues({}, previewData), {
      env: env_server_default
    });
  } catch (error) {
    if (error instanceof Error)
      return {
        errors: error.message,
        env: env_server_default
      };
  }
  return { errors: "Unexpected error", env: env_server_default };
}, PreviewRoute = () => {
  let data = (0, import_react61.useLoaderData)();
  return "errors" in data ? /* @__PURE__ */ React.createElement("p", null, data.errors) : /* @__PURE__ */ React.createElement(import_sdk35.Root, {
    data
  });
}, projectId_default = PreviewRoute;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/canvas.tsx
var canvas_exports = {};
__export(canvas_exports, {
  default: () => canvas_default,
  loader: () => loader14,
  meta: () => meta4
});
var loader14 = () => ({
  env: env_server_default
}), meta4 = () => ({ title: "Webstudio canvas" }), canvas_default = Canvas;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/canvas/$projectId.tsx
var projectId_exports2 = {};
__export(projectId_exports2, {
  default: () => projectId_default2,
  loader: () => loader15
});
var import_react77 = require("@remix-run/react");

// app/canvas/canvas.tsx
var import_react76 = require("react"), import_react_dnd5 = require("react-dnd"), import_react_dnd_touch_backend = require("react-dnd-touch-backend"), import_immerhin8 = __toESM(require("immerhin")), import_sdk52 = require("@webstudio-is/sdk");

// app/canvas/shared/use-drag-drop-handlers.ts
var import_react62 = require("react"), import_sdk36 = require("@webstudio-is/sdk");

// app/shared/dom-utils/find-closest-child.ts
var calculateDistance = (coordinate, rect) => {
  let distanceX = Math.max(rect.left - coordinate.x, 0, coordinate.x - rect.right), distanceY = Math.max(rect.top - coordinate.y, 0, coordinate.y - rect.bottom);
  return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
}, sortNumbers = (a, b) => a - b, isPositionedElement = (element, getComputedStyle2) => {
  let { position } = getComputedStyle2(element);
  return position !== "static" && position !== "relative";
}, findClosestChild = (parentElement, coordinate, getBoundingClientRect2, getComputedStyle2) => {
  if (parentElement.children.length === 0)
    return;
  let distances = [], distanceElementMap = /* @__PURE__ */ new Map();
  for (let child of parentElement.children) {
    if (isPositionedElement(child, getComputedStyle2))
      continue;
    let rect2 = getBoundingClientRect2(child), distance = calculateDistance(coordinate, rect2);
    distances.push(distance), distanceElementMap.set(distance, child);
  }
  distances.sort(sortNumbers);
  let element = distanceElementMap.get(distances[0]), rect = getBoundingClientRect2(element), relativePosition = coordinate.y - rect.top < 0 ? "before" : coordinate.y - rect.bottom > 0 ? "after" : "inside";
  return { element, relativePosition };
};

// app/shared/dom-utils/find-insertion-index.ts
var findInsertionIndex = (dragOver, closestChildInfo) => {
  var _a;
  let index = [...((_a = dragOver.element) == null ? void 0 : _a.children) || []].indexOf(closestChildInfo.element), insertionIndex = 0;
  if (closestChildInfo.relativePosition == "inside")
    if (dragOver.edge === "top")
      insertionIndex = index;
    else if (dragOver.edge === "bottom")
      insertionIndex = index + 1;
    else
      return 0;
  else
    insertionIndex = closestChildInfo.relativePosition === "before" ? index - 1 : index + 1;
  return insertionIndex < 0 ? 0 : insertionIndex;
};

// app/shared/dom-utils/get-drag-over-info.ts
var elementFromPoint = (coordinate) => {
  let element = document.elementFromPoint(coordinate.x, coordinate.y);
  if (element instanceof HTMLElement)
    return element;
}, getDragOverInfo = (offset, getBoundingClientRect2) => {
  let element = elementFromPoint(offset), edge = "none";
  if (element === void 0)
    return { element, edge };
  let { bottom, y } = getBoundingClientRect2(element);
  if (offset.y - y <= 5 && (edge = "top"), bottom - offset.y <= 5 && (edge = "bottom"), edge === "none")
    return { element, edge };
  let { parentElement } = element;
  return parentElement !== null && parentElement !== document.body && (element = parentElement), { element, edge };
};

// app/canvas/shared/nano-states.ts
var import_react_nano_state4 = require("react-nano-state"), dropDataContainer = (0, import_react_nano_state4.createValueContainer)(), useDropData = () => (0, import_react_nano_state4.useValue)(dropDataContainer), selectedInstanceContainer = (0, import_react_nano_state4.createValueContainer)(), useSelectedInstance = () => (0, import_react_nano_state4.useValue)(selectedInstanceContainer), hoveredInstanceContainer = (0, import_react_nano_state4.createValueContainer)(), useHoveredInstance = () => (0, import_react_nano_state4.useValue)(hoveredInstanceContainer), selectedElementContainer = (0, import_react_nano_state4.createValueContainer)(), useSelectedElement = () => (0, import_react_nano_state4.useValue)(selectedElementContainer), hoveredElementContainer = (0, import_react_nano_state4.createValueContainer)(), useHoveredElement = () => (0, import_react_nano_state4.useValue)(hoveredElementContainer);

// app/canvas/shared/use-drag-drop-handlers.ts
var import_lodash8 = __toESM(require("lodash.memoize")), getBoundingClientRect = (0, import_lodash8.default)((element) => element.getBoundingClientRect()), getComputedStyle = (0, import_lodash8.default)((element) => window.getComputedStyle(element)), useDragDropHandlers = () => {
  let [rootInstance] = useRootInstance(), [, setSelectedInstance] = useSelectedInstance(), [, setHoveredInstance] = useHoveredInstance(), [, setHoveredElement] = useHoveredElement(), [dropData, setDropData] = useDropData(), [dragData, setDragData] = (0, import_react62.useState)();
  (0, import_sdk36.useSubscribe)("dragStartInstance", () => {
    setSelectedInstance(void 0);
  }), (0, import_sdk36.useSubscribe)("dragEndInstance", () => {
    var _a, _b;
    if (((_a = getBoundingClientRect.cache) == null ? void 0 : _a.clear) && getBoundingClientRect.cache.clear(), ((_b = getComputedStyle.cache) == null ? void 0 : _b.clear) && getComputedStyle.cache.clear(), setDropData(void 0), setDragData(void 0), rootInstance === void 0 || dropData === void 0 || dragData === void 0 || dropData.instance.id === dragData.instance.id)
      return;
    let isNew = findInstanceById(rootInstance, dragData.instance.id) === void 0, data = {
      instance: dragData.instance,
      dropData
    };
    if (isNew) {
      (0, import_sdk36.publish)({
        type: "insertInstance",
        payload: data
      });
      return;
    }
    (0, import_sdk36.publish)({
      type: "reparentInstance",
      payload: data
    });
  }), (0, import_sdk36.useSubscribe)("dragInstance", (dragData2) => {
    let { currentOffset } = dragData2, dragOver = getDragOverInfo(currentOffset, getBoundingClientRect);
    if (rootInstance === void 0 || dragOver.element === void 0)
      return;
    let dropInstance = findInstanceById(rootInstance, dragOver.element.id);
    if (dropInstance === void 0)
      return;
    let closestChild = findClosestChild(dragOver.element, currentOffset, getBoundingClientRect, getComputedStyle), position = 0;
    dragOver.element !== void 0 && closestChild !== void 0 && (position = findInsertionIndex(dragOver, closestChild));
    let dropData2 = {
      instance: dropInstance,
      position
    };
    setDragData(dragData2), setDropData(dropData2), setHoveredInstance(dropInstance), setHoveredElement(dragOver.element), (0, import_sdk36.publish)({
      type: "dropPreview",
      payload: { dropData: dropData2, dragData: dragData2 }
    });
  });
};

// app/canvas/shared/use-shortcuts.ts
var import_react_hotkeys_hook2 = require("react-hotkeys-hook"), import_immerhin = __toESM(require("immerhin")), import_sdk38 = require("@webstudio-is/sdk");

// app/canvas/shared/copy-paste.ts
var import_sdk37 = require("@webstudio-is/sdk");

// app/shared/props-utils/update-props.ts
var updateAllUserPropsMutable = (allUserProps, { instanceId, propsId, treeId, updates }) => {
  instanceId in allUserProps || (allUserProps[instanceId] = {
    id: propsId,
    instanceId,
    treeId,
    props: []
  });
  let instanceProps = allUserProps[instanceId];
  for (let update2 of updates) {
    let prop = instanceProps.props.find(({ id }) => id === update2.id);
    prop === void 0 ? instanceProps.props.push(update2) : (prop.prop = update2.prop, prop.value = update2.value);
  }
};

// app/shared/props-utils/delete-prop.ts
var deletePropMutable = (allProps, deleteProp) => {
  let prop = allProps[deleteProp.instanceId];
  if (prop === void 0)
    return !1;
  let index = prop.props.findIndex(({ id }) => id === deleteProp.propId);
  return index === -1 ? !1 : (prop.props.splice(index, 1), !0);
};

// app/shared/props-utils/clone-props.ts
var import_bson_objectid7 = __toESM(require("bson-objectid")), import_immer7 = __toESM(require("immer")), cloneProps = (instanceProps, { instanceId }) => (0, import_immer7.default)((instanceProps2) => {
  instanceProps2.id = (0, import_bson_objectid7.default)().toString(), instanceProps2.instanceId = instanceId;
  for (let prop of instanceProps2.props)
    prop.id = (0, import_bson_objectid7.default)().toString();
})(instanceProps);

// app/canvas/shared/copy-paste.ts
var currentInstance, currentProps, copy = () => {
  selectedInstanceContainer.value !== void 0 && (currentInstance = selectedInstanceContainer.value, currentProps = import_sdk37.allUserPropsContainer.value[currentInstance.id]);
}, paste = () => {
  if (currentInstance === void 0)
    return;
  let instance = cloneInstance(currentInstance), props2 = currentProps ? cloneProps(currentProps, { instanceId: instance.id }) : void 0;
  (0, import_sdk37.publish)({
    type: "insertInstance",
    payload: {
      instance,
      props: props2
    }
  });
};

// app/canvas/shared/use-shortcuts.ts
var inputTags = ["INPUT", "SELECT", "TEXTAREA"], togglePreviewMode = () => {
  (0, import_sdk38.publish)({ type: "togglePreviewMode" });
}, publishSelectBreakpoint = ({ key }) => {
  (0, import_sdk38.publish)({
    type: "selectBreakpointFromShortcut",
    payload: key
  });
}, publishZoom = (event) => {
  event.preventDefault !== void 0 && event.preventDefault(), (0, import_sdk38.publish)({
    type: "zoom",
    payload: event.key === "-" ? "zoomOut" : "zoomIn"
  });
}, publishOpenBreakpointsMenu = () => {
  (0, import_sdk38.publish)({ type: "openBreakpointsMenu" });
}, useShortcuts = () => {
  let [rootInstance] = useRootInstance(), [selectedInstance, setSelectedInstance] = useSelectedInstance(), [editingInstanceId, setEditingInstanceId] = useTextEditingInstanceId(), publishDeleteInstance = () => {
    selectedInstance === void 0 || selectedInstance.id === (rootInstance == null ? void 0 : rootInstance.id) || (0, import_sdk38.publish)({
      type: "deleteInstance",
      payload: {
        id: selectedInstance.id
      }
    });
  }, shortcutHandlerMap = {
    undo: import_immerhin.default.undo.bind(import_immerhin.default),
    redo: import_immerhin.default.redo.bind(import_immerhin.default),
    delete: publishDeleteInstance,
    preview: togglePreviewMode,
    copy,
    paste,
    breakpointsMenu: publishOpenBreakpointsMenu,
    breakpoint: publishSelectBreakpoint,
    zoom: publishZoom
  };
  (0, import_react_hotkeys_hook2.useHotkeys)("backspace, delete", shortcutHandlerMap.delete, __spreadProps(__spreadValues({}, options), { enableOnTags: [...inputTags] }), [shortcutHandlerMap.delete]), (0, import_react_hotkeys_hook2.useHotkeys)("esc", () => {
    if (selectedInstance !== void 0) {
      if (editingInstanceId) {
        setEditingInstanceId(void 0);
        return;
      }
      setSelectedInstance(void 0), (0, import_sdk38.publish)({ type: "selectInstance" });
    }
  }, __spreadProps(__spreadValues({}, options), { enableOnContentEditable: !0, enableOnTags: [...inputTags] }), [selectedInstance, editingInstanceId]), (0, import_react_hotkeys_hook2.useHotkeys)("enter", (event) => {
    if (selectedInstance === void 0)
      return;
    let { isContentEditable: isContentEditable11 } = primitives_exports[selectedInstance.component];
    isContentEditable11 !== !1 && (event.preventDefault(), setEditingInstanceId(selectedInstance.id));
  }, options, [selectedInstance, setEditingInstanceId]), (0, import_react_hotkeys_hook2.useHotkeys)(shortcuts.undo, shortcutHandlerMap.undo, options, []), (0, import_react_hotkeys_hook2.useHotkeys)(shortcuts.redo, shortcutHandlerMap.redo, options, []), (0, import_react_hotkeys_hook2.useHotkeys)(shortcuts.preview, shortcutHandlerMap.preview, options, []), (0, import_react_hotkeys_hook2.useHotkeys)(shortcuts.copy, shortcutHandlerMap.copy, options, [
    shortcutHandlerMap.copy
  ]), (0, import_react_hotkeys_hook2.useHotkeys)(shortcuts.paste, shortcutHandlerMap.paste, options, []), (0, import_react_hotkeys_hook2.useHotkeys)(shortcuts.breakpoint, shortcutHandlerMap.breakpoint, options, []), (0, import_react_hotkeys_hook2.useHotkeys)(shortcuts.zoom, shortcutHandlerMap.zoom, options, []), (0, import_react_hotkeys_hook2.useHotkeys)(shortcuts.breakpointsMenu, shortcutHandlerMap.breakpointsMenu, options, []), (0, import_sdk38.useSubscribe)("shortcut", ({ name, key }) => {
    shortcutHandlerMap[name]({ key });
  });
};

// app/canvas/shared/instance.ts
var import_react63 = require("react"), import_bson_objectid8 = __toESM(require("bson-objectid")), import_sdk39 = require("@webstudio-is/sdk");
var import_immerhin2 = __toESM(require("immerhin"));
var usePopulateRootInstance = (tree) => {
  let [, setRootInstance] = useRootInstance();
  (0, import_react63.useEffect)(() => {
    setRootInstance(tree.root);
  }, [tree, setRootInstance]);
}, useInsertInstance = () => {
  let [selectedInstance, setSelectedInstance] = useSelectedInstance();
  (0, import_sdk39.useSubscribe)("insertInstance", ({ instance, dropData, props: props2 }) => {
    import_immerhin2.default.createTransaction([rootInstanceContainer, import_sdk39.allUserPropsContainer], (rootInstance, allUserProps) => {
      if (rootInstance === void 0)
        return;
      let populatedInstance = populateInstance(instance);
      insertInstanceMutable(rootInstance, populatedInstance, {
        parentId: (dropData == null ? void 0 : dropData.instance.id) ?? (selectedInstance == null ? void 0 : selectedInstance.id) ?? rootInstance.id,
        position: (dropData == null ? void 0 : dropData.position) || "end"
      }) && setSelectedInstance(instance), props2 !== void 0 && (allUserProps[props2.instanceId] = props2);
    });
  });
}, useReparentInstance = () => {
  (0, import_sdk39.useSubscribe)("reparentInstance", ({ instance, dropData }) => {
    import_immerhin2.default.createTransaction([rootInstanceContainer], (rootInstance) => {
      rootInstance !== void 0 && (deleteInstanceMutable(rootInstance, instance.id), insertInstanceMutable(rootInstance, instance, {
        parentId: dropData.instance.id,
        position: dropData.position
      }));
    });
  });
}, useDeleteInstance = () => {
  let [rootInstance] = useRootInstance(), [selectedInstance, setSelectedInstance] = useSelectedInstance();
  (0, import_sdk39.useSubscribe)("deleteInstance", ({ id }) => {
    if (rootInstance !== void 0 && selectedInstance !== void 0) {
      let parentInstance = findParentInstance(rootInstance, id);
      if (parentInstance !== void 0) {
        let siblingInstance = findClosestSiblingInstance(parentInstance, id);
        setSelectedInstance(siblingInstance || parentInstance);
      }
    }
    import_immerhin2.default.createTransaction([rootInstanceContainer], (rootInstance2) => {
      rootInstance2 !== void 0 && deleteInstanceMutable(rootInstance2, id);
    });
  });
}, usePublishSelectedInstanceData = (treeId) => {
  let [instance] = useSelectedInstance(), [selectedElement] = useSelectedElement(), [allUserProps] = (0, import_sdk39.useAllUserProps)(), browserStyle = (0, import_react63.useMemo)(() => (0, import_sdk39.getBrowserStyle)(selectedElement), [selectedElement]);
  (0, import_react63.useEffect)(() => {
    let payload;
    if (instance !== void 0) {
      let props2 = allUserProps[instance.id];
      props2 === void 0 && (props2 = {
        id: (0, import_bson_objectid8.default)().toString(),
        instanceId: instance.id,
        treeId,
        props: []
      }), payload = {
        id: instance.id,
        component: instance.component,
        cssRules: instance.cssRules,
        browserStyle,
        props: props2
      };
    }
    (0, import_sdk39.publish)({
      type: "selectInstance",
      payload
    });
  }, [instance, allUserProps, treeId, browserStyle]);
}, usePublishHoveredInstanceData = () => {
  let [instance] = useHoveredInstance();
  (0, import_react63.useEffect)(() => {
    let payload = instance ? {
      id: instance.id,
      component: instance.component
    } : void 0;
    (0, import_sdk39.publish)({
      type: "hoverInstance",
      payload
    });
  }, [instance]);
}, usePublishRootInstance = () => {
  let [rootInstance] = useRootInstance();
  (0, import_react63.useEffect)(() => {
    (0, import_sdk39.publish)({
      type: "loadRootInstance",
      payload: rootInstance
    });
  }, [rootInstance]);
}, publishRect = (rect) => {
  (0, import_sdk39.publish)({
    type: "selectedInstanceRect",
    payload: rect
  });
}, usePublishSelectedInstanceDataRect = () => {
  let [element] = useSelectedElement(), [refCallback, rect] = useMeasure();
  (0, import_react63.useEffect)(() => {
    refCallback(element ?? null);
  }, [element, refCallback]), (0, import_react63.useEffect)(() => {
    rect !== void 0 && publishRect(rect);
  }, [rect]);
}, usePublishHoveredInstanceRect = () => {
  let [element] = useHoveredElement(), publishRect2 = (0, import_react63.useCallback)(() => {
    element !== void 0 && (0, import_sdk39.publish)({
      type: "hoveredInstanceRect",
      payload: element.getBoundingClientRect()
    });
  }, [element]);
  (0, import_react63.useEffect)(publishRect2, [publishRect2]);
}, useSetHoveredInstance = () => {
  let [rootInstance] = useRootInstance(), [hoveredElement] = useHoveredElement(), [, setHoveredInstance] = useHoveredInstance();
  (0, import_react63.useEffect)(() => {
    let instance;
    rootInstance !== void 0 && (hoveredElement == null ? void 0 : hoveredElement.id) && (instance = findInstanceById(rootInstance, hoveredElement.id)), setHoveredInstance(instance);
  }, [rootInstance, hoveredElement, setHoveredInstance]);
}, useUpdateSelectedInstance = () => {
  let [rootInstance] = useRootInstance(), [selectedInstance, setSelectedInstance] = useSelectedInstance();
  (0, import_react63.useEffect)(() => {
    let instance;
    rootInstance !== void 0 && (selectedInstance == null ? void 0 : selectedInstance.id) && (instance = findInstanceById(rootInstance, selectedInstance.id)), instance !== void 0 && setSelectedInstance(instance);
  }, [rootInstance, selectedInstance, setSelectedInstance]);
}, useUnselectInstance = () => {
  let [, setSelectedInstance] = useSelectedInstance();
  (0, import_sdk39.useSubscribe)("unselectInstance", () => {
    setSelectedInstance(void 0);
  });
}, usePublishTextEditingInstanceId = () => {
  let [editingInstanceId] = useTextEditingInstanceId();
  (0, import_react63.useEffect)(() => {
    (0, import_sdk39.publish)({
      type: "textEditingInstanceId",
      payload: editingInstanceId
    });
  }, [editingInstanceId]);
};

// app/canvas/shared/style.ts
var import_immerhin3 = __toESM(require("immerhin")), import_sdk40 = require("@webstudio-is/sdk");
var useUpdateStyle = () => {
  let [selectedInstance] = useSelectedInstance();
  (0, import_sdk40.useSubscribe)("updateStyle", ({ id, updates, breakpoint }) => {
    id === (selectedInstance == null ? void 0 : selectedInstance.id) && import_immerhin3.default.createTransaction([rootInstanceContainer], (rootInstance) => {
      rootInstance !== void 0 && setInstanceStyleMutable(rootInstance, id, updates, breakpoint);
    });
  });
};

// app/canvas/shared/use-track-selected-element.ts
var import_react64 = require("react"), import_sdk41 = require("@webstudio-is/sdk");
var eventOptions = {
  passive: !0
}, useTrackSelectedElement = () => {
  let [selectedElement, setSelectedElement] = useSelectedElement(), [selectedInstance, setSelectedInstance] = useSelectedInstance(), [editingInstanceId, setEditingInstanceId] = useTextEditingInstanceId(), editingInstanceIdRef = (0, import_react64.useRef)(editingInstanceId);
  editingInstanceIdRef.current = editingInstanceId;
  let [rootInstance] = useRootInstance(), selectInstance = (0, import_react64.useCallback)((id) => {
    if (rootInstance === void 0)
      return;
    let instance = findInstanceById(rootInstance, id);
    setSelectedInstance(instance);
  }, [setSelectedInstance, rootInstance]);
  (0, import_sdk41.useSubscribe)("selectInstanceById", selectInstance), (0, import_react64.useEffect)(() => {
    if (selectedInstance !== void 0 && (selectedElement === void 0 || (selectedInstance == null ? void 0 : selectedInstance.id) !== selectedElement.id)) {
      let element = document.getElementById(selectedInstance.id);
      if (element === null)
        return;
      element.focus(), setSelectedElement(element);
    }
  }, [selectedInstance, selectedElement, setSelectedElement]), (0, import_react64.useEffect)(() => {
    editingInstanceIdRef.current !== void 0 && (selectedInstance == null ? void 0 : selectedInstance.id) !== editingInstanceIdRef.current && setEditingInstanceId(void 0);
  }, [selectedInstance, setEditingInstanceId]), (0, import_react64.useEffect)(() => {
    let handleClick = (event) => {
      var _a;
      (0, import_sdk41.publish)({ type: "clickCanvas" });
      let element = event.target;
      if (element.dataset.component === void 0) {
        let instanceElement = element.closest("[data-component]");
        if (instanceElement === null)
          return;
        element = instanceElement;
      }
      let { id, dataset } = element;
      if (editingInstanceIdRef.current !== id) {
        if (event.detail === 2) {
          let component = dataset.component;
          if (component === void 0 || !(component in primitives_exports))
            return;
          let { isInlineOnly: isInlineOnly11, isContentEditable: isContentEditable11 } = primitives_exports[component];
          if (isContentEditable11 === !1)
            return;
          if (isInlineOnly11) {
            let parentId = (_a = element.parentElement) == null ? void 0 : _a.id;
            parentId && (selectInstance(parentId), setEditingInstanceId(parentId));
          } else
            setEditingInstanceId(id);
          return;
        }
        selectInstance(id);
      }
    };
    return window.addEventListener("click", handleClick, eventOptions), () => {
      window.removeEventListener("click", handleClick);
    };
  }, [selectInstance, setEditingInstanceId]);
};

// app/canvas/features/wrapper-component/wrapper-component.tsx
var import_react73 = require("react"), import_sdk46 = require("@webstudio-is/sdk");

// app/canvas/features/wrapper-component/use-css.tsx
var import_react65 = require("react"), import_sdk42 = require("@webstudio-is/sdk"), usePreviewCss = ({ instance, css: css2 }) => {
  let [previewCss, setPreviewCss] = (0, import_react65.useState)([]);
  return (0, import_sdk42.useSubscribe)(`previewStyle:${instance.id}`, ({ updates }) => {
    setPreviewCss(updates);
  }), (0, import_react65.useEffect)(() => {
    let reset2 = previewCss.map(({ property }) => ({
      property,
      value: void 0
    }));
    setPreviewCss(reset2);
  }, [css2]), previewCss;
}, voidElements = "area, base, br, col, embed, hr, img, input, link, meta, source, track, wbr", rootElement = "body > div", defaultStyle9 = {
  "&": {
    userSelect: "none"
  },
  [`&:not(${voidElements}):not(${rootElement}):empty`]: {
    outline: "1px dashed #555",
    outlineOffset: -1,
    paddingTop: 50,
    paddingRight: 50
  },
  "&[contenteditable], &:focus": {
    outline: 0
  },
  "&[contenteditable]": {
    boxShadow: "0 0 0px 4px rgb(36 150 255 / 20%)"
  },
  "&[contenteditable] p": {
    margin: 0
  }
}, useCss = ({ instance, css: css2 }) => {
  let previewCss = usePreviewCss({ instance, css: css2 });
  return (0, import_react65.useMemo)(() => {
    let overrides = __spreadValues({}, defaultStyle9);
    for (let update2 of previewCss)
      update2.value !== void 0 && (overrides[update2.property] = (0, import_sdk42.toValue)(update2.value));
    return (0, import_sdk42.css)(css2)({ css: overrides });
  }, [css2, previewCss]);
};

// app/canvas/features/wrapper-component/use-draggable.ts
var import_react66 = require("react"), import_react_dnd4 = require("react-dnd"), import_sdk43 = require("@webstudio-is/sdk"), useDraggable2 = ({ instance, isDisabled }) => {
  let isDraggingRef = (0, import_react66.useRef)(!1), [{ isDragging, currentOffset }, dragRefCallback] = (0, import_react_dnd4.useDrag)(() => ({
    type: instance.component,
    collect(monitor) {
      return {
        isDragging: monitor.isDragging(),
        currentOffset: monitor.getClientOffset()
      };
    },
    canDrag() {
      return isDisabled === !1;
    }
  }), [isDisabled]);
  (0, import_react66.useEffect)(() => {
    isDragging === !0 ? (0, import_sdk43.publish)({ type: "dragStartInstance" }) : (0, import_sdk43.publish)({ type: "dragEndInstance" }), isDraggingRef.current = isDragging;
  }, [isDragging, instance.id]), (0, import_react66.useEffect)(() => {
    currentOffset === null || isDragging === !1 || (0, import_sdk43.publish)({
      type: "dragInstance",
      payload: {
        instance,
        currentOffset
      }
    });
  }, [instance, currentOffset, isDragging]);
  let handleMouseDown = (0, import_react66.useCallback)((event) => {
    isDisabled && event.stopPropagation();
  }, [isDisabled]);
  return { dragRefCallback, onMouseDownCapture: handleMouseDown };
};

// app/canvas/features/wrapper-component/use-ensure-focus.ts
var import_react67 = require("react");
var useEnsureFocus = () => {
  let [selectedInstance] = useSelectedInstance();
  return (0, import_react67.useCallback)((element) => {
    element !== null && element.id === (selectedInstance == null ? void 0 : selectedInstance.id) && document.activeElement !== element && element.focus();
  }, [selectedInstance]);
};

// app/canvas/features/wrapper-component/text-editor/lexical.ts
var import_lexical = require("lexical"), import_LexicalComposerContext = require("@lexical/react/LexicalComposerContext"), import_LexicalComposer = require("@lexical/react/LexicalComposer"), import_LexicalRichTextPlugin = require("@lexical/react/LexicalRichTextPlugin"), import_LexicalContentEditable = require("@lexical/react/LexicalContentEditable"), import_LexicalHistoryPlugin = require("@lexical/react/LexicalHistoryPlugin"), import_LexicalOnChangePlugin = require("@lexical/react/LexicalOnChangePlugin"), import_LexicalTreeView = require("@lexical/react/LexicalTreeView");

// app/canvas/features/wrapper-component/text-editor/nodes/node-instance.tsx
var import_react_dom2 = require("react-dom");
var InstanceNode = class extends import_lexical.TextNode {
  static getType() {
    return "instance";
  }
  static clone(node) {
    return new InstanceNode(node.options);
  }
  constructor(options2) {
    super(options2.text);
    this.options = options2;
  }
  exportJSON() {
    let json2 = super.exportJSON();
    return __spreadProps(__spreadValues(__spreadValues({}, json2), this.options), {
      type: InstanceNode.getType()
    });
  }
  createDOM(config4) {
    let container = super.createDOM(config4), element = /* @__PURE__ */ React.createElement(InlineWrapperComponentDev, {
      instance: this.options.instance
    }, this.options.text);
    return (0, import_react_dom2.render)(element, container), container;
  }
  updateDOM(prevNode, dom, config4) {
    let inner = dom.firstChild;
    return inner === null ? !0 : (super.updateDOM(prevNode, inner, config4), !1);
  }
  isInline() {
    return !0;
  }
  canInsertTextBefore() {
    return !1;
  }
  canInsertTextAfter() {
    return !1;
  }
}, $createInstanceNode = (options2) => new InstanceNode(options2);

// app/canvas/features/wrapper-component/text-editor/config.ts
var config3 = {
  namespace: "ComponentTextEditor",
  onError(error) {
    throw error;
  },
  nodes: [InstanceNode]
};

// app/canvas/features/wrapper-component/text-editor/hooks/use-content-editable.tsx
var import_LexicalComposerContext2 = require("@lexical/react/LexicalComposerContext"), import_react68 = require("react"), props = {
  contentEditable: !0
}, useContentEditable = (isEditing) => {
  let [editor] = (0, import_LexicalComposerContext2.useLexicalComposerContext)(), ref = (0, import_react68.useCallback)((rootElement2) => {
    editor.setRootElement(rootElement2);
  }, [editor]);
  return (0, import_react68.useEffect)(() => {
    isEditing !== !0 && editor.setRootElement(null);
  }, [editor, isEditing]), [ref, isEditing ? props : void 0];
};

// app/canvas/features/wrapper-component/text-editor/plugins/plugin-instance.tsx
var import_react69 = require("react"), import_sdk44 = require("@webstudio-is/sdk");

// app/canvas/features/wrapper-component/text-editor/utils/to-lexical-nodes.tsx
var toLexicalNodes = (children6) => {
  let nodes = [], p = (0, import_lexical.$createParagraphNode)();
  nodes.push(p);
  for (let child of children6) {
    if (child === `
`) {
      p = (0, import_lexical.$createParagraphNode)(), nodes.push(p);
      continue;
    }
    if (typeof child == "string") {
      let textNode = (0, import_lexical.$createTextNode)(child);
      p.append(textNode);
      continue;
    }
    let text = typeof child.children[0] == "string" ? child.children[0] : "", paragraph = nodes[nodes.length - 1], instanceNode = $createInstanceNode({
      instance: child,
      text,
      isNew: !1
    });
    paragraph.append(instanceNode);
  }
  return nodes;
};

// app/canvas/features/wrapper-component/text-editor/plugins/plugin-instance.tsx
var populateRoot = (children6) => {
  let nodes = toLexicalNodes(children6), root = (0, import_lexical.$getRoot)();
  root.clear();
  for (let node of nodes)
    root.append(node);
  root.selectStart();
}, INSERT_INSTANCE_COMMAND = (0, import_lexical.createCommand)(), InstancePlugin = ({ children: children6 }) => {
  let [editor] = (0, import_LexicalComposerContext.useLexicalComposerContext)();
  return (0, import_react69.useEffect)(() => {
    if (editor.hasNodes([InstanceNode]) === !1)
      throw new Error("InstancePlugin: InstanceNode not registered on editor");
    return editor.registerCommand(INSERT_INSTANCE_COMMAND, (instance) => {
      let selection = (0, import_lexical.$getSelection)(), text = selection == null ? void 0 : selection.getTextContent();
      if ((0, import_lexical.$isRangeSelection)(selection) && text) {
        let instanceNode = $createInstanceNode({
          instance,
          text,
          isNew: !0
        });
        selection.insertNodes([instanceNode]), requestAnimationFrame(() => {
          editor.update(() => {
            instanceNode.select();
          });
        });
      }
      return !0;
    }, import_lexical.COMMAND_PRIORITY_EDITOR);
  }, [editor]), (0, import_react69.useEffect)(() => {
    editor.update(() => {
      populateRoot(children6);
    });
  }, [editor, children6]), (0, import_sdk44.useSubscribe)("insertInlineInstance", (payload) => {
    editor.dispatchCommand(INSERT_INSTANCE_COMMAND, payload);
  }), null;
};

// app/canvas/features/wrapper-component/text-editor/plugins/plugin-toolbar-connector.tsx
var import_react70 = require("react"), import_sdk45 = require("@webstudio-is/sdk");
var ToolbarConnectorPlugin = () => {
  let [editor] = (0, import_LexicalComposerContext.useLexicalComposerContext)(), lastSelectionRef = (0, import_react70.useRef)(), clearSelectionRect = () => {
    lastSelectionRef.current && ((0, import_sdk45.publish)({ type: "selectionRect", payload: void 0 }), lastSelectionRef.current = void 0);
  }, publishSelectionRect = (0, import_react70.useCallback)(() => {
    let selection = (0, import_lexical.$getSelection)(), text = selection == null ? void 0 : selection.getTextContent(), nativeSelection = window.getSelection();
    if ((0, import_lexical.$isRangeSelection)(selection) && Boolean(text) && nativeSelection !== null) {
      let rect = nativeSelection.getRangeAt(0).getBoundingClientRect();
      return (0, import_sdk45.publish)({
        type: "selectionRect",
        payload: rect
      }), lastSelectionRef.current = selection, !0;
    }
    return clearSelectionRect(), !0;
  }, []);
  return (0, import_react70.useEffect)(() => {
    editor.registerCommand(import_lexical.SELECTION_CHANGE_COMMAND, publishSelectionRect, import_lexical.COMMAND_PRIORITY_LOW);
  }, [editor, publishSelectionRect]), (0, import_react70.useEffect)(() => clearSelectionRect, []), null;
};

// app/canvas/features/wrapper-component/text-editor/plugins/plugin-on-change.tsx
var import_react71 = require("react"), import_react_use = require("react-use");

// app/canvas/features/wrapper-component/text-editor/utils/to-updates.ts
var toUpdates = (node, updates = []) => {
  if (node.type === "text" && "text" in node && updates.push(node.text), node.type === "instance" && "instance" in node && ("isNew" in node && node.isNew === !0 ? updates.push({
    id: node.instance.id,
    text: node.text,
    component: node.instance.component,
    createInstance: !0
  }) : updates.push({
    id: node.instance.id,
    text: node.text
  })), "children" in node)
    for (let child of node.children)
      child.type === "paragraph" && updates.length !== 0 && updates.push(`
`), toUpdates(child, updates);
  return updates;
};

// app/canvas/features/wrapper-component/text-editor/plugins/plugin-on-change.tsx
var OnChangePlugin2 = ({
  onChange
}) => {
  let [editorState, setEditorState] = (0, import_react71.useState)();
  return (0, import_react_use.useDebounce)(() => {
    editorState !== void 0 && editorState.read(() => {
      let updates = toUpdates(editorState.toJSON().root);
      onChange(updates);
    });
  }, 500, [editorState]), /* @__PURE__ */ React.createElement(import_LexicalOnChangePlugin.OnChangePlugin, {
    onChange: setEditorState
  });
};

// app/canvas/features/wrapper-component/text-editor/editor.tsx
var import_react72 = require("react"), Editor = ({
  instance,
  editable,
  children: children6,
  onChange
}) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(import_LexicalRichTextPlugin.RichTextPlugin, {
  contentEditable: editable,
  placeholder: ""
}), /* @__PURE__ */ React.createElement(OnChangePlugin2, {
  onChange
}), /* @__PURE__ */ React.createElement(import_LexicalHistoryPlugin.HistoryPlugin, null), /* @__PURE__ */ React.createElement(InstancePlugin, null, instance.children), /* @__PURE__ */ React.createElement(ToolbarConnectorPlugin, null), children6), EditorMemoized = (0, import_react72.memo)(Editor, () => !0);

// app/canvas/features/wrapper-component/wrapper-component.tsx
var import_lodash9 = __toESM(require("lodash.noop"));
var WrapperComponentDev = (_a) => {
  var _b = _a, {
    instance,
    css: css2,
    children: children6,
    onChangeChildren = import_lodash9.default
  } = _b, rest = __objRest(_b, [
    "instance",
    "css",
    "children",
    "onChangeChildren"
  ]);
  let className = useCss({ instance, css: css2 }), [editingInstanceId] = useTextEditingInstanceId(), [, setSelectedElement] = useSelectedElement(), isEditing = editingInstanceId === instance.id, [editableRefCallback, editableProps] = useContentEditable(isEditing), _a2 = useDraggable2({
    instance,
    isDisabled: isEditing === !0
  }), { dragRefCallback } = _a2, draggableProps = __objRest(_a2, ["dragRefCallback"]), focusRefCallback = useEnsureFocus(), refCallback = (0, import_react73.useCallback)((element) => {
    isEditing && editableRefCallback(element), dragRefCallback(element), focusRefCallback(element), element !== null && setSelectedElement(element);
  }, [
    dragRefCallback,
    focusRefCallback,
    editableRefCallback,
    setSelectedElement,
    isEditing
  ]), userProps = (0, import_sdk46.useUserProps)(instance.id), readonlyProps = instance.component === "Input" ? { readOnly: !0 } : void 0, { Component: Component11 } = primitives_exports[instance.component], props2 = __spreadProps(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, userProps), rest), draggableProps), readonlyProps), editableProps), {
    className,
    id: instance.id,
    tabIndex: 0,
    "data-component": instance.component,
    "data-id": instance.id,
    ref: refCallback,
    onClick: (event) => {
      instance.component === "Link" && event.preventDefault();
    },
    onSubmit: (event) => {
      event.preventDefault();
    }
  });
  return isEditing ? /* @__PURE__ */ React.createElement(EditorMemoized, {
    instance,
    editable: /* @__PURE__ */ React.createElement(Component11, __spreadValues({}, props2)),
    onChange: (updates) => {
      onChangeChildren({ instanceId: instance.id, updates });
    }
  }) : /* @__PURE__ */ React.createElement(Component11, __spreadValues({}, props2), (0, import_sdk46.renderWrapperComponentChildren)(children6));
}, InlineWrapperComponentDev = (_a) => {
  var _b = _a, {
    instance
  } = _b, rest = __objRest(_b, [
    "instance"
  ]);
  let [breakpoints] = useBreakpoints(), css2 = (0, import_react73.useMemo)(() => (0, import_sdk46.toCss)(instance.cssRules, breakpoints), [instance, breakpoints]), className = useCss({ instance, css: css2 }), userProps = (0, import_sdk46.useUserProps)(instance.id), { Component: Component11 } = primitives_exports[instance.component];
  return /* @__PURE__ */ React.createElement(Component11, __spreadProps(__spreadValues(__spreadValues({}, rest), userProps), {
    "data-outline-disabled": !0,
    key: instance.id,
    id: instance.id,
    className
  }));
};

// app/canvas/shared/sync/use-sync.ts
var import_useInterval = __toESM(require("react-use/lib/useInterval")), import_immerhin4 = require("immerhin");

// app/canvas/shared/sync/queue.ts
var import_sdk47 = require("@webstudio-is/sdk"), queue = [], enqueue = (job) => {
  queue.push(job), isInProgress === !1 && dequeue();
}, isInProgress = !1, dequeue = () => {
  let job = queue.shift();
  job && (isInProgress = !0, (0, import_sdk47.publish)({
    type: "syncStatus",
    payload: "syncing"
  }), job().finally(() => {
    isInProgress = !1, (0, import_sdk47.publish)({
      type: "syncStatus",
      payload: "idle"
    }), dequeue();
  }));
};

// app/canvas/shared/sync/use-sync.ts
var useSync = ({ project }) => {
  (0, import_useInterval.default)(() => {
    let entries = (0, import_immerhin4.sync)();
    entries.length !== 0 && enqueue(() => fetch("/rest/patch", {
      method: "post",
      body: JSON.stringify({
        transactions: entries,
        treeId: project.devTreeId,
        projectId: project.id
      })
    }));
  }, 1e3);
};

// app/canvas/shared/props.ts
var import_sdk48 = require("@webstudio-is/sdk"), import_immerhin5 = __toESM(require("immerhin"));
var useManageProps = () => {
  (0, import_sdk48.useSubscribe)("updateProps", (userPropsUpdates) => {
    import_immerhin5.default.createTransaction([import_sdk48.allUserPropsContainer], (allUserProps) => {
      updateAllUserPropsMutable(allUserProps, userPropsUpdates);
    });
  }), (0, import_sdk48.useSubscribe)("deleteProp", (deleteProp) => {
    import_immerhin5.default.createTransaction([import_sdk48.allUserPropsContainer], (allUserProps) => {
      deletePropMutable(allUserProps, deleteProp);
    });
  });
};

// app/canvas/shared/breakpoints.ts
var import_react74 = require("react"), import_immerhin6 = __toESM(require("immerhin")), import_sdk49 = require("@webstudio-is/sdk");

// app/shared/css-utils/delete-css-rules-by-breakpoint.ts
var deleteCssRulesByBreakpoint = (instance, breakpointId) => {
  [...instance.cssRules].forEach((cssRule, index) => {
    cssRule.breakpoint === breakpointId && instance.cssRules.splice(index, 1);
  });
  for (let child of instance.children)
    typeof child != "string" && deleteCssRulesByBreakpoint(child, breakpointId);
};

// app/canvas/shared/breakpoints.ts
var useInitializeBreakpoints = (breakpoints) => {
  let [, setCurrentBreakpoints] = useBreakpoints();
  (0, import_react74.useEffect)(() => {
    (0, import_sdk49.setBreakpoints)(breakpoints), setCurrentBreakpoints(breakpoints);
  }, [breakpoints, setCurrentBreakpoints]);
}, usePublishBreakpoints = () => {
  let [breakpoints] = useBreakpoints();
  (0, import_react74.useEffect)(() => {
    (0, import_sdk49.publish)({
      type: "loadBreakpoints",
      payload: breakpoints
    });
  }, [breakpoints]);
}, useBreakpointChange = () => {
  (0, import_sdk49.useSubscribe)("breakpointChange", (breakpoint) => {
    import_immerhin6.default.createTransaction([breakpointsContainer], (breakpoints) => {
      let foundBreakpoint = breakpoints.find(({ id }) => id == breakpoint.id);
      foundBreakpoint ? (foundBreakpoint.label = breakpoint.label, foundBreakpoint.minWidth = breakpoint.minWidth) : breakpoints.push(breakpoint), (0, import_sdk49.setBreakpoints)(breakpoints);
    });
  });
}, useBreakpointDelete = () => {
  (0, import_sdk49.useSubscribe)("breakpointDelete", (breakpoint) => {
    import_immerhin6.default.createTransaction([breakpointsContainer, rootInstanceContainer], (breakpoints, rootInstance) => {
      if (rootInstance === void 0)
        return;
      let index = breakpoints.findIndex(({ id }) => id == breakpoint.id);
      index !== -1 && breakpoints.splice(index, 1), deleteCssRulesByBreakpoint(rootInstance, breakpoint.id);
    });
  });
}, useHandleBreakpoints = () => {
  usePublishBreakpoints(), useBreakpointChange(), useBreakpointDelete();
};

// app/canvas/shared/immerhin.ts
var import_sdk50 = require("@webstudio-is/sdk"), import_immerhin7 = __toESM(require("immerhin"));
var registerContainers = () => {
  import_immerhin7.default.register("breakpoints", breakpointsContainer), import_immerhin7.default.register("root", rootInstanceContainer), import_immerhin7.default.register("props", import_sdk50.allUserPropsContainer);
};

// app/canvas/shared/use-track-hovered-element.ts
var import_react75 = require("react");
var eventOptions2 = {
  passive: !0
}, useTrackHoveredElement = () => {
  let [rootInstance] = useRootInstance(), [, setHoveredElement] = useHoveredElement(), [selectedElement] = useSelectedElement();
  (0, import_react75.useEffect)(() => {
    let handleMouseOver = (event) => {
      let element = event.target;
      rootInstance === void 0 || !(element instanceof HTMLElement) || element.dataset.outlineDisabled || setHoveredElement(element);
    }, handleMouseOut = () => {
      rootInstance !== void 0 && setHoveredElement(void 0);
    };
    return window.addEventListener("mouseover", handleMouseOver, eventOptions2), window.addEventListener("mouseout", handleMouseOut, eventOptions2), () => {
      window.removeEventListener("mouseover", handleMouseOver), window.removeEventListener("mouseout", handleMouseOut);
    };
  }, [rootInstance, selectedElement, setHoveredElement]);
};

// app/canvas/shared/use-publish-scroll-state.ts
var import_sdk51 = require("@webstudio-is/sdk");
var usePublishScrollState = () => {
  useScrollState({
    onScrollStart() {
      (0, import_sdk51.publish)({ type: "scrollState", payload: !0 });
    },
    onScrollEnd() {
      (0, import_sdk51.publish)({
        type: "scrollState",
        payload: !1
      });
    }
  });
};

// app/canvas/canvas.tsx
registerContainers();
var useElementsTree = () => {
  let [rootInstance] = useRootInstance(), [breakpoints] = useBreakpoints(), onChangeChildren = (0, import_react76.useCallback)((change) => {
    import_immerhin8.default.createTransaction([rootInstanceContainer], (rootInstance2) => {
      if (rootInstance2 === void 0)
        return;
      let { instanceId, updates } = change;
      setInstanceChildrenMutable(instanceId, updates, rootInstance2);
    });
  }, []);
  return (0, import_react76.useMemo)(() => {
    if (rootInstance !== void 0)
      return (0, import_sdk12.createElementsTree)({
        instance: rootInstance,
        breakpoints,
        Component: WrapperComponentDev,
        onChangeChildren
      });
  }, [rootInstance, breakpoints, onChangeChildren]);
}, useSubscribePreviewMode = () => {
  let [isPreviewMode, setIsPreviewMode] = (0, import_react76.useState)(!1);
  return (0, import_sdk52.useSubscribe)("previewMode", setIsPreviewMode), isPreviewMode;
}, PreviewMode = () => {
  let [rootInstance] = useRootInstance(), [breakpoints] = useBreakpoints();
  return rootInstance === void 0 ? null : (0, import_sdk12.createElementsTree)({
    breakpoints,
    instance: rootInstance,
    Component: import_sdk52.WrapperComponent
  });
}, dndOptions = { enableMouseEvents: !0 }, DesignMode = ({ treeId, project }) => {
  useDragDropHandlers(), useUpdateStyle(), useManageProps(), usePublishSelectedInstanceData(treeId), usePublishHoveredInstanceData(), useHandleBreakpoints(), useInsertInstance(), useReparentInstance(), useDeleteInstance(), usePublishRootInstance(), useTrackSelectedElement(), useTrackHoveredElement(), useSetHoveredInstance(), useSync({ project }), useUpdateSelectedInstance(), usePublishSelectedInstanceDataRect(), usePublishHoveredInstanceRect(), useUnselectInstance(), usePublishScrollState(), useSubscribeScrollState(), usePublishTextEditingInstanceId();
  let elements = useElementsTree();
  return /* @__PURE__ */ React.createElement(import_react_dnd5.DndProvider, {
    backend: import_react_dnd_touch_backend.TouchBackend,
    options: dndOptions
  }, elements && /* @__PURE__ */ React.createElement(import_LexicalComposer.LexicalComposer, {
    initialConfig: config3
  }, elements));
}, Canvas2 = ({ data }) => {
  if (data.tree === null)
    throw new Error("Tree is null");
  return useInitializeBreakpoints(data.breakpoints), (0, import_sdk52.globalStyles)(), (0, import_sdk52.useAllUserProps)(data.props), usePopulateRootInstance(data.tree), useShortcuts(), useSubscribePreviewMode() ? /* @__PURE__ */ React.createElement(PreviewMode, null) : /* @__PURE__ */ React.createElement(DesignMode, {
    treeId: data.tree.id,
    project: data.project
  });
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/canvas/$projectId.tsx
var loader15 = async ({ params }) => {
  if (params.projectId === void 0)
    return { errors: "Missing projectId", env: env_server_default };
  try {
    let canvasData = await loadCanvasData({ projectId: params.projectId });
    return __spreadProps(__spreadValues({}, canvasData), {
      env: env_server_default
    });
  } catch (error) {
    if (error instanceof Error)
      return {
        errors: error.message,
        env: env_server_default
      };
  }
  return { errors: "Unexpected error", env: env_server_default };
}, CanvasRoute = () => {
  let data = (0, import_react77.useLoaderData)();
  return "errors" in data ? /* @__PURE__ */ React.createElement("p", null, data.errors) : /* @__PURE__ */ React.createElement(Canvas2, {
    data
  });
}, projectId_default2 = CanvasRoute;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/logout.tsx
var logout_exports = {};
__export(logout_exports, {
  default: () => Logout,
  loader: () => loader16
});
function Logout() {
  return null;
}
var loader16 = async ({ request }) => {
  await authenticator.logout(request, { redirectTo: config_default.loginPath });
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/index.tsx
var routes_exports = {};
__export(routes_exports, {
  default: () => routes_default,
  loader: () => loader17
});
var import_node9 = require("@remix-run/node"), import_react78 = require("@remix-run/react"), import_sdk53 = require("@webstudio-is/sdk");

// app/routes/canvas.tsx
var canvas_default2 = Canvas;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/index.tsx
var loader17 = async ({
  request
}) => {
  let host2 = request.headers.get("x-forwarded-host") || request.headers.get("host") || "", [userDomain, wstdDomain] = host2.split(".");
  if (typeof userDomain == "string" && (wstdDomain === "wstd" || (wstdDomain == null ? void 0 : wstdDomain.includes("localhost"))))
    try {
      let project = await project_server_exports.loadByDomain(userDomain);
      if (project === null)
        throw new Error(`Unknown domain "${userDomain}"`);
      if (project.prodTreeId === null)
        throw new Error("Site is not published");
      let [tree, props2, breakpoints] = await Promise.all([
        tree_server_exports.loadByProject(project, "production"),
        props_server_exports.loadByTreeId(project.prodTreeId),
        breakpoints_server_exports.load(project.prodTreeId)
      ]);
      if (tree === null)
        throw new Error(`Tree ${project.prodTreeId} not found`);
      if (breakpoints === null)
        throw new Error(`Breakpoints for tree ${project.prodTreeId} not found`);
      return { tree, props: props2, breakpoints: breakpoints.values, env: env_server_default };
    } catch (error) {
      if (error instanceof Error)
        return { errors: error.message, env: env_server_default };
    }
  return (0, import_node9.redirect)(config_default.dashboardPath);
}, Index = () => {
  let data = (0, import_react78.useLoaderData)();
  return "errors" in data ? /* @__PURE__ */ React.createElement("p", null, data.errors) : data.tree && data.props ? /* @__PURE__ */ React.createElement(canvas_default2, {
    Outlet: () => /* @__PURE__ */ React.createElement(import_sdk53.Root, {
      data
    })
  }) : null;
}, routes_default = Index;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/login.tsx
var login_exports = {};
__export(login_exports, {
  default: () => login_default,
  loader: () => loader18,
  meta: () => meta5
});
var loader18 = () => ({
  env: env_server_default
}), meta5 = () => ({ title: "Webstudio Login" }), login_default = Designer;

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/login/index.tsx
var login_exports2 = {};
__export(login_exports2, {
  default: () => login_default3,
  links: () => links3,
  loader: () => loader19
});
var import_node10 = require("@remix-run/node");

// app/auth/login.tsx
var import_react80 = require("@remix-run/react"), import_react81 = require("react");

// app/auth/components/login-button.tsx
var import_react79 = __toESM(require("react"));
var isPreviewEnvironment = env_getter_default.VERCEL_ENV === "preview", LoginButton = (_a) => {
  var _b = _a, {
    children: children6,
    isDevLogin = !1,
    enabled
  } = _b, props2 = __objRest(_b, [
    "children",
    "isDevLogin",
    "enabled"
  ]);
  let isSocialLoginInPreviewEnvironment = isPreviewEnvironment && isDevLogin === !1;
  return isSocialLoginInPreviewEnvironment || enabled === !1 ? /* @__PURE__ */ import_react79.default.createElement(Tooltip, {
    content: isSocialLoginInPreviewEnvironment ? "Social login does not work in preview deployments" : "This login is not configured",
    delayDuration: 0
  }, /* @__PURE__ */ import_react79.default.createElement("span", {
    tabIndex: 0,
    style: { width: "100%", display: "block" }
  }, /* @__PURE__ */ import_react79.default.createElement(Button, __spreadProps(__spreadValues({}, props2), {
    css: { width: "100%" },
    size: 3,
    type: "submit",
    disabled: !0
  }), children6))) : /* @__PURE__ */ import_react79.default.createElement(Button, __spreadProps(__spreadValues({}, props2), {
    css: { width: "100%" },
    size: 3,
    type: "submit"
  }), children6);
};

// app/auth/login.css
var login_default2 = "/build/_assets/login-XMYFQPQX.css";

// app/auth/login.tsx
var links3 = () => [
  {
    rel: "stylesheet",
    href: inter_default
  },
  {
    rel: "stylesheet",
    href: login_default2
  }
];
var Login = ({ errorMessage }) => {
  let [isDevLoginOpen, openDevLogin] = (0, import_react81.useState)(!1), data = (0, import_react80.useLoaderData)();
  return /* @__PURE__ */ React.createElement(Flex, {
    css: { height: "100vh" },
    direction: "column",
    align: "center",
    justify: "center"
  }, /* @__PURE__ */ React.createElement(Card, {
    size: 2
  }, /* @__PURE__ */ React.createElement(Flex, {
    direction: "column",
    gap: "4",
    align: "center"
  }, /* @__PURE__ */ React.createElement(Heading, {
    size: "2"
  }, "Login"), errorMessage.length ? /* @__PURE__ */ React.createElement(Text, {
    css: { textAlign: "center" },
    variant: "red"
  }, errorMessage) : null, /* @__PURE__ */ React.createElement(Flex, {
    gap: "2",
    direction: "column",
    align: "center"
  }, /* @__PURE__ */ React.createElement(import_react80.Form, {
    action: "/auth/github",
    method: "post"
  }, /* @__PURE__ */ React.createElement(LoginButton, {
    enabled: data.isGithubEnabled
  }, /* @__PURE__ */ React.createElement(Flex, {
    gap: "1"
  }, /* @__PURE__ */ React.createElement(GithubIcon, {
    width: "20"
  }), "Login with GitHub"))), /* @__PURE__ */ React.createElement(import_react80.Form, {
    action: "/auth/google",
    method: "post"
  }, /* @__PURE__ */ React.createElement(LoginButton, {
    enabled: data.isGoogleEnabled
  }, /* @__PURE__ */ React.createElement(Flex, {
    gap: "1"
  }, /* @__PURE__ */ React.createElement(GoogleIcon, {
    width: "20"
  }), "Login with Google"))), data.isDevLogin && /* @__PURE__ */ React.createElement(React.Fragment, null, isDevLoginOpen ? /* @__PURE__ */ React.createElement(import_react80.Form, {
    action: "/auth/dev",
    method: "post"
  }, /* @__PURE__ */ React.createElement(TextField, {
    size: 2,
    css: { width: "100%", flexGrow: 1 },
    name: "secret",
    type: "text",
    minLength: 2,
    required: !0,
    autoFocus: !0,
    placeholder: "Place your auth secret here"
  })) : /* @__PURE__ */ React.createElement(LoginButton, {
    enabled: data.isDevLogin,
    isDevLogin: !0,
    onClick: () => openDevLogin(!0)
  }, /* @__PURE__ */ React.createElement(Flex, {
    gap: "1",
    align: "center"
  }, /* @__PURE__ */ React.createElement(icons_exports.CommitIcon, {
    width: "20"
  }), "Dev Login")))))));
};

// route:/Users/oleg/work/webstudio/webstudio-designer/apps/designer/app/routes/login/index.tsx
var loader19 = async ({ request }) => await authenticator.isAuthenticated(request) ? (0, import_node10.redirect)(config_default.dashboardPath) : {
  isDevLogin: process.env.DEV_LOGIN === "true",
  env: env_server_default,
  isGithubEnabled: Boolean(process.env.GH_CLIENT_ID && process.env.GH_CLIENT_SECRET),
  isGoogleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}, LoginRoute = () => {
  let errorMessage = useLoginErrorMessage();
  return /* @__PURE__ */ React.createElement(Login, {
    errorMessage
  });
}, login_default3 = LoginRoute;

// server-assets-manifest:@remix-run/dev/assets-manifest
var assets_manifest_default = { version: "6412d0f3", entry: { module: "/build/entry.client-BADAYHVI.js", imports: ["/build/_shared/chunk-B36H54Q2.js", "/build/_shared/chunk-MADQQ4W2.js", "/build/_shared/chunk-QD7BDOJK.js", "/build/_shared/chunk-QPKOW66L.js", "/build/_shared/chunk-SRJHFGUQ.js", "/build/_shared/chunk-R6VSS7HB.js"] }, routes: { root: { id: "root", parentId: void 0, path: "", index: void 0, caseSensitive: void 0, module: "/build/root-HIH74YUZ.js", imports: void 0, hasAction: !1, hasLoader: !1, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/auth/dev": { id: "routes/auth/dev", parentId: "root", path: "auth/dev", index: void 0, caseSensitive: void 0, module: "/build/routes/auth/dev-OY6U6ZZL.js", imports: ["/build/_shared/chunk-WWM4X7G7.js", "/build/_shared/chunk-TDLYKOPO.js"], hasAction: !0, hasLoader: !1, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/auth/github": { id: "routes/auth/github", parentId: "root", path: "auth/github", index: void 0, caseSensitive: void 0, module: "/build/routes/auth/github-VQ7AN4UG.js", imports: ["/build/_shared/chunk-WWM4X7G7.js", "/build/_shared/chunk-TDLYKOPO.js"], hasAction: !0, hasLoader: !1, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/auth/github/callback": { id: "routes/auth/github/callback", parentId: "routes/auth/github", path: "callback", index: void 0, caseSensitive: void 0, module: "/build/routes/auth/github/callback-TALPZT4U.js", imports: void 0, hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/auth/google": { id: "routes/auth/google", parentId: "root", path: "auth/google", index: void 0, caseSensitive: void 0, module: "/build/routes/auth/google-IPCRXR2G.js", imports: ["/build/_shared/chunk-WWM4X7G7.js", "/build/_shared/chunk-TDLYKOPO.js"], hasAction: !0, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/auth/google/callback": { id: "routes/auth/google/callback", parentId: "routes/auth/google", path: "callback", index: void 0, caseSensitive: void 0, module: "/build/routes/auth/google/callback-SJVT2W6T.js", imports: void 0, hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/canvas": { id: "routes/canvas", parentId: "root", path: "canvas", index: void 0, caseSensitive: void 0, module: "/build/routes/canvas-BNYCH64M.js", imports: ["/build/_shared/chunk-CHKIVGVF.js", "/build/_shared/chunk-VDMDGISW.js", "/build/_shared/chunk-6KWPSJTY.js", "/build/_shared/chunk-D4F75PJ7.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/canvas/$projectId": { id: "routes/canvas/$projectId", parentId: "routes/canvas", path: ":projectId", index: void 0, caseSensitive: void 0, module: "/build/routes/canvas/$projectId-EN7MP3RM.js", imports: ["/build/_shared/chunk-6YZOMFAW.js", "/build/_shared/chunk-LZQQRXUE.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/dashboard": { id: "routes/dashboard", parentId: "root", path: "dashboard", index: void 0, caseSensitive: void 0, module: "/build/routes/dashboard-GORLGHTU.js", imports: ["/build/_shared/chunk-GJEHYJKD.js", "/build/_shared/chunk-6KWPSJTY.js", "/build/_shared/chunk-D4F75PJ7.js", "/build/_shared/chunk-KEIN4CGZ.js", "/build/_shared/chunk-LZQQRXUE.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/dashboard/index": { id: "routes/dashboard/index", parentId: "routes/dashboard", path: void 0, index: !0, caseSensitive: void 0, module: "/build/routes/dashboard/index-47ACBDYH.js", imports: ["/build/_shared/chunk-7YTDWDGG.js", "/build/_shared/chunk-WWM4X7G7.js", "/build/_shared/chunk-TDLYKOPO.js"], hasAction: !0, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/designer": { id: "routes/designer", parentId: "root", path: "designer", index: void 0, caseSensitive: void 0, module: "/build/routes/designer-7PTVKO44.js", imports: ["/build/_shared/chunk-GJEHYJKD.js", "/build/_shared/chunk-6KWPSJTY.js", "/build/_shared/chunk-D4F75PJ7.js", "/build/_shared/chunk-KEIN4CGZ.js", "/build/_shared/chunk-LZQQRXUE.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/designer/$id": { id: "routes/designer/$id", parentId: "routes/designer", path: ":id", index: void 0, caseSensitive: void 0, module: "/build/routes/designer/$id-ALVFN3YN.js", imports: ["/build/_shared/chunk-6YZOMFAW.js", "/build/_shared/chunk-7YTDWDGG.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/index": { id: "routes/index", parentId: "root", path: void 0, index: !0, caseSensitive: void 0, module: "/build/routes/index-O6SAICID.js", imports: ["/build/_shared/chunk-CHKIVGVF.js", "/build/_shared/chunk-VDMDGISW.js", "/build/_shared/chunk-6KWPSJTY.js", "/build/_shared/chunk-D4F75PJ7.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/login": { id: "routes/login", parentId: "root", path: "login", index: void 0, caseSensitive: void 0, module: "/build/routes/login-BRUOWCYK.js", imports: ["/build/_shared/chunk-GJEHYJKD.js", "/build/_shared/chunk-6KWPSJTY.js", "/build/_shared/chunk-D4F75PJ7.js", "/build/_shared/chunk-KEIN4CGZ.js", "/build/_shared/chunk-LZQQRXUE.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/login/index": { id: "routes/login/index", parentId: "routes/login", path: void 0, index: !0, caseSensitive: void 0, module: "/build/routes/login/index-Y3BTJFU4.js", imports: ["/build/_shared/chunk-7YTDWDGG.js", "/build/_shared/chunk-WWM4X7G7.js", "/build/_shared/chunk-TDLYKOPO.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/logout": { id: "routes/logout", parentId: "root", path: "logout", index: void 0, caseSensitive: void 0, module: "/build/routes/logout-O5E6MPSO.js", imports: ["/build/_shared/chunk-TDLYKOPO.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/preview": { id: "routes/preview", parentId: "root", path: "preview", index: void 0, caseSensitive: void 0, module: "/build/routes/preview-DNRQO7NW.js", imports: ["/build/_shared/chunk-VDMDGISW.js", "/build/_shared/chunk-6KWPSJTY.js", "/build/_shared/chunk-D4F75PJ7.js"], hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/preview/$projectId": { id: "routes/preview/$projectId", parentId: "routes/preview", path: ":projectId", index: void 0, caseSensitive: void 0, module: "/build/routes/preview/$projectId-4SZF7FOL.js", imports: void 0, hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/rest/breakpoints.$projectId": { id: "routes/rest/breakpoints.$projectId", parentId: "root", path: "rest/breakpoints/:projectId", index: void 0, caseSensitive: void 0, module: "/build/routes/rest/breakpoints.$projectId-OC77KFX5.js", imports: void 0, hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/rest/patch": { id: "routes/rest/patch", parentId: "root", path: "rest/patch", index: void 0, caseSensitive: void 0, module: "/build/routes/rest/patch-NSLESHUG.js", imports: void 0, hasAction: !0, hasLoader: !1, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/rest/project/clone.$domain": { id: "routes/rest/project/clone.$domain", parentId: "root", path: "rest/project/clone/:domain", index: void 0, caseSensitive: void 0, module: "/build/routes/rest/project/clone.$domain-KRUZBK37.js", imports: void 0, hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/rest/props.$projectId": { id: "routes/rest/props.$projectId", parentId: "root", path: "rest/props/:projectId", index: void 0, caseSensitive: void 0, module: "/build/routes/rest/props.$projectId-JSZ6VLX5.js", imports: void 0, hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/rest/publish": { id: "routes/rest/publish", parentId: "root", path: "rest/publish", index: void 0, caseSensitive: void 0, module: "/build/routes/rest/publish-4BQNZ4P3.js", imports: void 0, hasAction: !0, hasLoader: !1, hasCatchBoundary: !1, hasErrorBoundary: !1 }, "routes/rest/tree.$projectId": { id: "routes/rest/tree.$projectId", parentId: "root", path: "rest/tree/:projectId", index: void 0, caseSensitive: void 0, module: "/build/routes/rest/tree.$projectId-4GKHHDNV.js", imports: void 0, hasAction: !1, hasLoader: !0, hasCatchBoundary: !1, hasErrorBoundary: !1 } }, url: "/build/manifest-6412D0F3.js" };

// server-entry-module:@remix-run/dev/server-build
var entry = { module: entry_server_exports }, routes = {
  root: {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: root_exports
  },
  "routes/rest/breakpoints.$projectId": {
    id: "routes/rest/breakpoints.$projectId",
    parentId: "root",
    path: "rest/breakpoints/:projectId",
    index: void 0,
    caseSensitive: void 0,
    module: breakpoints_projectId_exports
  },
  "routes/rest/project/clone.$domain": {
    id: "routes/rest/project/clone.$domain",
    parentId: "root",
    path: "rest/project/clone/:domain",
    index: void 0,
    caseSensitive: void 0,
    module: clone_domain_exports
  },
  "routes/rest/props.$projectId": {
    id: "routes/rest/props.$projectId",
    parentId: "root",
    path: "rest/props/:projectId",
    index: void 0,
    caseSensitive: void 0,
    module: props_projectId_exports
  },
  "routes/rest/tree.$projectId": {
    id: "routes/rest/tree.$projectId",
    parentId: "root",
    path: "rest/tree/:projectId",
    index: void 0,
    caseSensitive: void 0,
    module: tree_projectId_exports
  },
  "routes/rest/publish": {
    id: "routes/rest/publish",
    parentId: "root",
    path: "rest/publish",
    index: void 0,
    caseSensitive: void 0,
    module: publish_exports
  },
  "routes/auth/github": {
    id: "routes/auth/github",
    parentId: "root",
    path: "auth/github",
    index: void 0,
    caseSensitive: void 0,
    module: github_exports
  },
  "routes/auth/github/callback": {
    id: "routes/auth/github/callback",
    parentId: "routes/auth/github",
    path: "callback",
    index: void 0,
    caseSensitive: void 0,
    module: callback_exports
  },
  "routes/auth/google": {
    id: "routes/auth/google",
    parentId: "root",
    path: "auth/google",
    index: void 0,
    caseSensitive: void 0,
    module: google_exports
  },
  "routes/auth/google/callback": {
    id: "routes/auth/google/callback",
    parentId: "routes/auth/google",
    path: "callback",
    index: void 0,
    caseSensitive: void 0,
    module: callback_exports2
  },
  "routes/rest/patch": {
    id: "routes/rest/patch",
    parentId: "root",
    path: "rest/patch",
    index: void 0,
    caseSensitive: void 0,
    module: patch_exports
  },
  "routes/dashboard": {
    id: "routes/dashboard",
    parentId: "root",
    path: "dashboard",
    index: void 0,
    caseSensitive: void 0,
    module: dashboard_exports
  },
  "routes/dashboard/index": {
    id: "routes/dashboard/index",
    parentId: "routes/dashboard",
    path: void 0,
    index: !0,
    caseSensitive: void 0,
    module: dashboard_exports2
  },
  "routes/auth/dev": {
    id: "routes/auth/dev",
    parentId: "root",
    path: "auth/dev",
    index: void 0,
    caseSensitive: void 0,
    module: dev_exports
  },
  "routes/designer": {
    id: "routes/designer",
    parentId: "root",
    path: "designer",
    index: void 0,
    caseSensitive: void 0,
    module: designer_exports
  },
  "routes/designer/$id": {
    id: "routes/designer/$id",
    parentId: "routes/designer",
    path: ":id",
    index: void 0,
    caseSensitive: void 0,
    module: id_exports
  },
  "routes/preview": {
    id: "routes/preview",
    parentId: "root",
    path: "preview",
    index: void 0,
    caseSensitive: void 0,
    module: preview_exports
  },
  "routes/preview/$projectId": {
    id: "routes/preview/$projectId",
    parentId: "routes/preview",
    path: ":projectId",
    index: void 0,
    caseSensitive: void 0,
    module: projectId_exports
  },
  "routes/canvas": {
    id: "routes/canvas",
    parentId: "root",
    path: "canvas",
    index: void 0,
    caseSensitive: void 0,
    module: canvas_exports
  },
  "routes/canvas/$projectId": {
    id: "routes/canvas/$projectId",
    parentId: "routes/canvas",
    path: ":projectId",
    index: void 0,
    caseSensitive: void 0,
    module: projectId_exports2
  },
  "routes/logout": {
    id: "routes/logout",
    parentId: "root",
    path: "logout",
    index: void 0,
    caseSensitive: void 0,
    module: logout_exports
  },
  "routes/index": {
    id: "routes/index",
    parentId: "root",
    path: void 0,
    index: !0,
    caseSensitive: void 0,
    module: routes_exports
  },
  "routes/login": {
    id: "routes/login",
    parentId: "root",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: login_exports
  },
  "routes/login/index": {
    id: "routes/login/index",
    parentId: "routes/login",
    path: void 0,
    index: !0,
    caseSensitive: void 0,
    module: login_exports2
  }
};
module.exports = __toCommonJS(stdin_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assets,
  entry,
  routes
});
//# sourceMappingURL=index.js.map
