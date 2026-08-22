import { expect, test } from "vitest";
import { blockComponent, type WebstudioFragment } from "@webstudio-is/sdk";
import { parseInstanceTransferData } from "./instance-transfer";

const createContentBlockFragment = ({
  sourceType = "asset",
  assets = [],
}: {
  sourceType?: "asset" | "expression" | "string";
  assets?: WebstudioFragment["assets"];
} = {}): WebstudioFragment => ({
  children: [{ type: "id", value: "block" }],
  instances: [
    {
      type: "instance",
      id: "block",
      component: blockComponent,
      children: [],
    },
  ],
  assets,
  dataSources: [],
  resources: [],
  props: [
    {
      id: "source",
      instanceId: "block",
      name: "src",
      type: sourceType,
      value: "post",
    },
  ],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
});

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

test("validates Content Block sources in copied instance data", () => {
  const mdxAsset: WebstudioFragment["assets"][number] = {
    id: "post",
    projectId: "project",
    type: "file",
    name: "post_hash.mdx",
    filename: "post",
    format: "mdx",
    size: 1,
    meta: {},
    description: null,
    createdAt: "2026-08-14T00:00:00.000Z",
  };
  const parse = (fragment: WebstudioFragment) =>
    parseInstanceTransferData(
      JSON.stringify({
        "@webstudio/instance/v0.1": {
          ...fragment,
          instanceSelector: ["block", "body"],
        },
      })
    );

  expect(
    parse(createContentBlockFragment({ assets: [mdxAsset] }))
  ).toMatchObject({ owned: true, valid: true });
  expect(
    parse(createContentBlockFragment({ sourceType: "expression" }))
  ).toMatchObject({ owned: true, valid: true });
  expect(parse(createContentBlockFragment())).toEqual({
    owned: true,
    valid: false,
  });
  expect(
    parse(
      createContentBlockFragment({ sourceType: "string", assets: [mdxAsset] })
    )
  ).toEqual({ owned: true, valid: false });
});
