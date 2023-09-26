//
//https://github.com/csstree/csstree/blob/612cc5f2922b2304869497d165a0cc65257f7a8b/docs/traversal.md?plain=1#L113

import * as csstree from "css-tree";

const css = `
/**
/* layer: preflights */
*,
::before,
::after {
  --un-rotate: 0;
  --un-rotate-x: 0;
  --un-rotate-y: 0;
  --un-rotate-z: 0;
  --un-scale-x: 1;
  --un-scale-y: 1;
  --un-scale-z: 1;
  --un-skew-x: 0;
  --un-skew-y: 0;
  --un-translate-x: 0;
  --un-translate-y: 0;
  --un-translate-z: 0;
  --un-pan-x: ;
  --un-pan-y: ;
  --un-pinch-zoom: ;
  --un-scroll-snap-strictness: proximity;
  --un-ordinal: ;
  --un-slashed-zero: ;
  --un-numeric-figure: ;
  --un-numeric-spacing: ;
  --un-numeric-fraction: ;
  --un-border-spacing-x: 0;
  --un-border-spacing-y: 0;
  --un-ring-offset-shadow: 0 0 rgba(0, 0, 0, 0);
  --un-ring-shadow: 0 0 rgba(0, 0, 0, 0);
  --un-shadow-inset: ;
  --un-shadow: 0 0 rgba(0, 0, 0, 0);
  --un-ring-inset: ;
  --un-ring-offset-width: 0px;
  --un-ring-offset-color: #fff;
  --un-ring-width: 0px;
  --un-ring-color: rgba(147, 197, 253, 0.5);
  --un-blur: ;
  --un-brightness: ;
  --un-contrast: ;
  --un-drop-shadow: ;
  --un-grayscale: ;
  --un-hue-rotate: ;
  --un-invert: ;
  --un-saturate: ;
  --un-sepia: ;
  --un-backdrop-blur: ;
  --un-backdrop-brightness: ;
  --un-backdrop-contrast: ;
  --un-backdrop-grayscale: ;
  --un-backdrop-hue-rotate: ;
  --un-backdrop-invert: ;
  --un-backdrop-opacity: ;
  --un-backdrop-saturate: ;
  --un-backdrop-sepia: ;
}

::backdrop {
  --un-rotate: 0;
  --un-rotate-x: 0;
  --un-rotate-y: 0;
  --un-rotate-z: 0;
  --un-scale-x: 1;
  --un-scale-y: 1;
  --un-scale-z: 1;
  --un-skew-x: 0;
  --un-skew-y: 0;
  --un-translate-x: 0;
  --un-translate-y: 0;
  --un-translate-z: 0;
  --un-pan-x: ;
  --un-pan-y: ;
  --un-pinch-zoom: ;
  --un-scroll-snap-strictness: proximity;
  --un-ordinal: ;
  --un-slashed-zero: ;
  --un-numeric-figure: ;
  --un-numeric-spacing: ;
  --un-numeric-fraction: ;
  --un-border-spacing-x: 0;
  --un-border-spacing-y: 0;
  --un-ring-offset-shadow: 0 0 rgba(0, 0, 0, 0);
  --un-ring-shadow: 0 0 rgba(0, 0, 0, 0);
  --un-shadow-inset: ;
  --un-shadow: 0 0 rgba(0, 0, 0, 0);
  --un-ring-inset: ;
  --un-ring-offset-width: 0px;
  --un-ring-offset-color: #fff;
  --un-ring-width: 0px;
  --un-ring-color: rgba(147, 197, 253, 0.5);
  --un-blur: ;
  --un-brightness: ;
  --un-contrast: ;
  --un-drop-shadow: ;
  --un-grayscale: ;
  --un-hue-rotate: ;
  --un-invert: ;
  --un-saturate: ;
  --un-sepia: ;
  --un-backdrop-blur: ;
  --un-backdrop-brightness: ;
  --un-backdrop-contrast: ;
  --un-backdrop-grayscale: ;
  --un-backdrop-hue-rotate: ;
  --un-backdrop-invert: ;
  --un-backdrop-opacity: ;
  --un-backdrop-saturate: ;
  --un-backdrop-sepia: ;
}

/* layer: default */
.bg-red-500 {
  --un-bg-opacity: 1;
  background-color: rgba(239, 68, 68, var(--un-bg-opacity));
}

.from-cyan-500 {
  --un-gradient-from-position: 0%;
  --un-gradient-from: rgba(6, 182, 212, var(--un-from-opacity, 1)) var(--un-gradient-from-position);
  --un-gradient-to-position: 100%;
  --un-gradient-to: rgba(6, 182, 212, 0) var(--un-gradient-to-position);
  --un-gradient-stops: var(--un-gradient-from), var(--un-gradient-to);
}

.to-blue-500 {
  --un-gradient-to-position: 100%;
  --un-gradient-to: rgba(59, 130, 246, var(--un-to-opacity, 1)) var(--un-gradient-to-position);
}

.bg-gradient-to-r {
  --un-gradient-shape: to right;
  --un-gradient: var(--un-gradient-shape), var(--un-gradient-stops);
  background-image: linear-gradient(var(--un-gradient));
}

.shadow {
  --un-shadow: var(--un-shadow-inset) 0 1px 3px 0 var(--un-shadow-color, rgba(0, 0, 0, 0.1)), var(--un-shadow-inset) 0 1px 2px -1px var(--un-shadow-color, rgba(0, 0, 0, 0.1));
  box-shadow: var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);
}

.shadow-current {
  --un-shadow-color: currentColor;
}

@media (min-width: 640px) {
  .sm\\:shadow-none {
    --un-shadow: 0 0 var(--un-shadow-color, rgba(0, 0, 0, 0));
    box-shadow: var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);
  }
}`;

export const parse = (css: string) => {
  const ast = csstree.parse(css);

  // Cleanup
  csstree.walk(ast, {
    enter(node, item, list) {
      // Remove media queries
      if (node.type === "Atrule") {
        list.remove(item);
      }

      // Remove selectors not startings with * or .
      if (node.type === "Rule") {
        const selectors = csstree.generate(node.prelude);
        if (
          selectors.startsWith("*") === false &&
          selectors.startsWith(".") === false
        ) {
          list.remove(item);
        }
      }
    },
  });

  // Extract all variables

  console.log(csstree.generate(ast));
};

parse(css);
