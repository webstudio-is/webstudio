import type { StyleMap } from "./rules";

export const prefixStyles = (styleMap: StyleMap) => {
  const newStyleMap: StyleMap = new Map();
  for (const [property, value] of styleMap) {
    // chrome started to support unprefixed background-clip in December 2023
    // https://caniuse.com/background-clip-text
    // @todo stop prerfixed maybe one year later
    if (property === "background-clip") {
      newStyleMap.set("-webkit-background-clip", value);
    }
    // safari still supports only prefixed version
    // https://caniuse.com/?search=user-select
    if (property === "user-select") {
      newStyleMap.set("-webkit-user-select", value);
    }
    // ios safari and firefox android supports only -webkit- prefix
    // https://caniuse.com/text-size-adjust
    if (property === "text-size-adjust") {
      newStyleMap.set("-webkit-text-size-adjust", value);
    }
    // safari supports with -webkit- prefix in stable version
    // and without prefix in technology preview
    // https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
    if (property === "backdrop-filter") {
      newStyleMap.set("-webkit-backdrop-filter", value);
    }

    // Safari and FF do not support this property and strip it from the CSS
    // For polyfill to work we need to set it as a CSS property
    // https://developer.mozilla.org/en-US/docs/Web/CSS/view-timeline-name
    if (
      property === "view-timeline-name" ||
      property === "scroll-timeline-name" ||
      property === "view-timeline-inset"
    ) {
      newStyleMap.set(`--${property}`, value);
    }

    newStyleMap.set(property, value);
  }
  return newStyleMap;
};
