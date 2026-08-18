import { expect, test } from "vitest";
import { parseInstanceTransferData } from "./instance-transfer";

test("validates instance transfer data", () => {
  const valid = parseInstanceTransferData(
    JSON.stringify({
      "@webstudio/instance/v0.1": {
        instanceSelector: ["box", "body"],
        children: [{ type: "id", value: "box" }],
        instances: [
          { type: "instance", id: "box", component: "Box", children: [] },
        ],
        assets: [],
        dataSources: [],
        resources: [],
        props: [],
        breakpoints: [],
        styleSourceSelections: [],
        styleSources: [],
        styles: [],
      },
    })
  );

  expect(valid).toMatchObject({
    owned: true,
    valid: true,
    type: "single-root",
  });

  expect(
    parseInstanceTransferData(
      `{  "@webstudio/instance/v0.1":{"instanceSelector":["box","body"]`
    )
  ).toEqual({ owned: true, valid: false });

  expect(parseInstanceTransferData("plain text")).toEqual({
    owned: false,
    valid: false,
  });
});
