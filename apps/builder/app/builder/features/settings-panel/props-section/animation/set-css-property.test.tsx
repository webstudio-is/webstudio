import { createRegularStyleSheet } from "@webstudio-is/css-engine";
import { ROOT_INSTANCE_ID, type WebstudioData } from "@webstudio-is/sdk";
import { $, ws, css, renderData } from "@webstudio-is/template";
import { expect, test } from "vitest";
import { setListedCssProperty } from "./set-css-property";

const toCss = (data: Omit<WebstudioData, "pages">) => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("base");
  for (const { instanceId, values } of data.styleSourceSelections.values()) {
    for (const styleSourceId of values) {
      const styleSource = data.styleSources.get(styleSourceId);
      let name;
      if (styleSource?.type === "local") {
        name = `${instanceId}:local`;
      }
      if (styleSource?.type === "token") {
        name = `${instanceId}:token(${styleSource.name})`;
      }
      if (name) {
        const rule = sheet.addNestingRule(name);
        for (const styleDecl of data.styles.values()) {
          if (styleDecl.styleSourceId === styleSourceId) {
            rule.setDeclaration({
              breakpoint: styleDecl.breakpointId,
              selector: styleDecl.state ?? "",
              property: styleDecl.property,
              value: styleDecl.value,
            });
          }
        }
      }
    }
  }
  return sheet.cssText;
};

test("Add Css Property styles", () => {
  const data = renderData(
    <ws.root ws:id={ROOT_INSTANCE_ID}>
      <$.Body>
        <$.Box ws:id="boxId">
          <$.Box
            ws:id="boxChildId"
            ws:style={css`
              color: red;
            `}
          ></$.Box>
        </$.Box>
      </$.Body>
    </ws.root>
  );

  setListedCssProperty(
    data.breakpoints,
    data.styleSources,
    data.styleSourceSelections,
    data.styles
  )("boxChildId", "viewTimelineName", {
    type: "unparsed",
    value: "--view-timeline-name-child",
  });

  setListedCssProperty(
    data.breakpoints,
    data.styleSources,
    data.styleSourceSelections,
    data.styles
  )("boxId", "viewTimelineName", {
    type: "unparsed",
    value: "--view-timeline-name",
  });

  expect(toCss(data)).toMatchInlineSnapshot(`
    "@media all {
      boxChildId:local {
        color: red;
        --view-timeline-name: --view-timeline-name-child;
        view-timeline-name: --view-timeline-name-child
      }
      boxId:local {
        --view-timeline-name: --view-timeline-name;
        view-timeline-name: --view-timeline-name
      }
    }"
  `);
});
