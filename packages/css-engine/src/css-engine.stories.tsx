import * as React from "react";
import type { ComponentStory } from "@storybook/react";
import { CssEngine } from "./css-engine";

export default {
  component: "CssEngine",
};

const style0 = {
  color: { type: "keyword", value: "red" },
} as const;

const breakpoint0 = { minWidth: 0, id: "0", label: "0" } as const;

export const Test = () => {
  const sheet = new CSSStyleSheet();
  const engine = new CssEngine<CSSStyleSheet>(sheet);
  engine.mount();
  engine.addBreakpoint(breakpoint0);
  const rule = engine.addRule({
    style: style0,
    breakpoint: "0",
  });
  console.log(rule);
  return <div className={rule.className}>"Test"</div>;
};
