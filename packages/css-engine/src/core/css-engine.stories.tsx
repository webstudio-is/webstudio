import { createRegularStyleSheet } from "./create-style-sheet";

export default {
  component: "CssEngine",
};

const style0 = {
  color: { type: "keyword", value: "red" },
} as const;

const mediaRuleOptions0 = { minWidth: 0 } as const;
const mediaId = "0";

export const Basic = () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule(mediaId, mediaRuleOptions0);
  const rule = sheet.addStyleRule({ style: style0, breakpoint: "0" }, ".test");
  sheet.render();
  return (
    <>
      <div className="test">Should be red</div>
      <button
        onClick={() => {
          rule.styleMap.set("color", { type: "keyword", value: "green" });
          sheet.render();
        }}
      >
        Make it green
      </button>
      <button
        onClick={() => {
          sheet.addStyleRule(
            {
              style: { backgroundColor: { type: "keyword", value: "yellow" } },
              breakpoint: "0",
            },
            ".test"
          );
          sheet.render();
        }}
      >
        Add rule with yellow background
      </button>
    </>
  );
};
