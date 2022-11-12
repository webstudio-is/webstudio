import * as React from "react";
import { CssEngine } from "./css-engine";

export default {
  component: "CssEngine",
};

const style0 = {
  color: { type: "keyword", value: "red" },
} as const;

const breakpoint0 = { minWidth: 0, id: "0", label: "0" } as const;

export const Basic = () => {
  const engine = new CssEngine();
  engine.addBreakpoint(breakpoint0);
  const rule = engine.addRule({
    style: style0,
    breakpoint: "0",
  });
  engine.render();
  return <div className={rule.className}>Should be red</div>;
};
