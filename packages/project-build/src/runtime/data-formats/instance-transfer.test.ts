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
        assetPaths: { image: "media/hero.png" },
        instanceSelector: ["box", "body"],
        ...fragment,
      },
    })
  );

  expect(result).toMatchObject({
    owned: true,
    valid: true,
    type: "single-root",
    data: {
      sourceOrigin: "https://source.example.com",
      assetPaths: { image: "media/hero.png" },
    },
  });
});

test.each([
  ["@webstudio/instance/v0.1", { instanceSelector: ["form", "body"] }],
  ["@webstudio/instances/v0.1", { rootInstanceIds: ["form"] }],
] as const)(
  "rejects ambiguous historical Form in %s before paste",
  (version, metadata) => {
    const formFragment = {
      ...fragment,
      children: [{ type: "id", value: "form" }],
      instances: [
        { type: "instance", id: "form", component: "Form", children: [] },
      ],
    };
    const data =
      version === "@webstudio/instance/v0.1"
        ? { ...formFragment, ...metadata }
        : { fragment: formFragment, ...metadata };
    expect(
      parseInstanceTransferData(JSON.stringify({ [version]: data }))
    ).toMatchObject({
      owned: true,
      valid: false,
      error: expect.stringMatching(/Copy it again/),
    });
  }
);

test.each(["ResourceForm", "WebhookForm", "NativeForm"])(
  "accepts unambiguous %s clipboard data",
  (component) => {
    expect(
      parseInstanceTransferData(
        JSON.stringify({
          "@webstudio/instance/v0.1": {
            ...fragment,
            instanceSelector: ["form", "body"],
            instances: [
              { type: "instance", id: "form", component, children: [] },
            ],
          },
        })
      )
    ).toMatchObject({ owned: true, valid: true });
  }
);
