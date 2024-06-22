import { createRegularStyleSheet } from "./create-style-sheet";

export default {
  component: "CssEngine",
};

const mediaRuleOptions0 = { minWidth: 0 } as const;
const mediaId = "0";

export const Basic = () => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule(mediaId, mediaRuleOptions0);
  const rule = sheet.addNestingRule(".test");
  rule.setDeclaration({
    breakpoint: "0",
    selector: "",
    property: "color",
    value: { type: "keyword", value: "red" },
  });
  sheet.render();
  return (
    <>
      <div className="test">Should be red</div>
      <button
        onClick={() => {
          rule.setDeclaration({
            breakpoint: "0",
            selector: "",
            property: "color",
            value: { type: "keyword", value: "green" },
          });
          sheet.render();
        }}
      >
        Make it green
      </button>
      <button
        onClick={() => {
          const rule = sheet.addNestingRule(".test");
          rule.setDeclaration({
            breakpoint: "0",
            selector: "",
            property: "backgroundColor",
            value: { type: "keyword", value: "yellow" },
          });
          sheet.render();
        }}
      >
        Add rule with yellow background
      </button>
    </>
  );
};
