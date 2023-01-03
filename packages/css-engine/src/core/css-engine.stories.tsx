import { CssEngine } from "./css-engine";

export default {
  component: "CssEngine",
};

const style0 = {
  color: { type: "keyword", value: "red" },
} as const;

const mediaRuleOptions0 = { minWidth: 0 } as const;
const mediaId = "0";

export const Basic = () => {
  const engine = new CssEngine({ name: "test" });
  engine.addMediaRule(mediaId, mediaRuleOptions0);
  const rule = engine.addStyleRule(".test", {
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
          engine.addStyleRule(".test", {
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
