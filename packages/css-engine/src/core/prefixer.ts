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
    newStyleMap.set(property, value);
  }
  return newStyleMap;
};
