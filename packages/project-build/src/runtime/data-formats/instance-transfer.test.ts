import { expect, test } from "vitest";
import { parseInstanceTransferData } from "./instance-transfer";

const fragment = {
  children: [{ type: "id", value: "box" }],
  instances: [{ type: "instance", id: "box", component: "Box", children: [] }],
  assets: [],
  dataSources: [],
  resources: [],
  props: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
};

test("validates instance transfer data", () => {
  const valid = parseInstanceTransferData(
    JSON.stringify({
      "@webstudio/instance/v0.1": {
        instanceSelector: ["box", "body"],
        ...fragment,
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

test("accepts optional source origin metadata", () => {
  const result = parseInstanceTransferData(
    JSON.stringify({
      "@webstudio/instance/v0.1": {
        sourceOrigin: "https://source.example.com",
        instanceSelector: ["box", "body"],
        ...fragment,
      },
    })
  );

  expect(result).toMatchObject({
    owned: true,
    valid: true,
    type: "single-root",
    data: { sourceOrigin: "https://source.example.com" },
  });
});
