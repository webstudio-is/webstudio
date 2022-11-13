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
  const rule = engine.addRule(".test", {
    style: style0,
    breakpoint: "0",
  });
  engine.render();
  return (
    <>
      <div className="test">Should be red</div>
      <button
        onClick={() => {
          rule.styleMap.set("color", { type: "keyword", value: "green" });
          engine.render();
        }}
      >
        Make it green
      </button>
      <button
        onClick={() => {
          engine.addRule(".test", {
            style: {
              background: { type: "keyword", value: "yellow" },
            },
            breakpoint: "0",
          });
          engine.render();
        }}
      >
        Add rule with yellow background
      </button>
    </>
  );
};
