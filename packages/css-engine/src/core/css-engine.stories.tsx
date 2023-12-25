import { CssEngine } from "./css-engine";
import { StyleSheetRegular } from "./style-sheet-regular";

export default {
  component: "CssEngine",
};

const style0 = {
  color: { type: "keyword", value: "red" },
} as const;

const mediaRuleOptions0 = { minWidth: 0 } as const;
const mediaId = "0";

export const Basic = () => {
  const sheet = new StyleSheetRegular();
  const engine = new CssEngine({ name: "test", sheet });
  sheet.addMediaRule(mediaId, mediaRuleOptions0);
  const rule = sheet.addStyleRule(".test", {
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
          sheet.addStyleRule(".test", {
            style: {
              backgroundColor: { type: "keyword", value: "yellow" },
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
