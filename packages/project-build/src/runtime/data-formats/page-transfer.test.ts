import { expect, test } from "vitest";
import { blockComponent, type WebstudioFragment } from "@webstudio-is/sdk";
import { parsePageTransferData } from "./page-transfer";

const emptyFragment: WebstudioFragment = {
  children: [],
  instances: [],
  assets: [],
  dataSources: [],
  resources: [],
  props: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
};

test("validates page transfer data", () => {
  const valid = parsePageTransferData(
    JSON.stringify({
      "@webstudio/page/v0.1": {
        type: "page",
        page: {
          id: "page",
          name: "Page",
          path: "/page",
          title: `"Page"`,
          meta: {},
          rootInstanceId: "body",
        },
        rootFragment: emptyFragment,
        bodyFragment: emptyFragment,
      },
    })
  );

  expect(valid).toMatchObject({
    owned: true,
    valid: true,
    data: { type: "page" },
  });

  expect(
    parsePageTransferData(`{  "@webstudio/page/v0.1":{"type":"page"`)
  ).toEqual({ owned: true, valid: false });

  expect(parsePageTransferData("plain text")).toEqual({
    owned: false,
    valid: false,
  });
});

test("validates Content Block sources in copied page data", () => {
  const bodyFragment: WebstudioFragment = {
    ...emptyFragment,
    children: [{ type: "id", value: "block" }],
    instances: [
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [],
      },
    ],
    props: [
      {
        id: "source",
        instanceId: "block",
        name: "src",
        type: "asset",
        value: "missing-post",
      },
    ],
  };

  expect(
    parsePageTransferData(
      JSON.stringify({
        "@webstudio/page/v0.1": {
          type: "page",
          page: {},
          rootFragment: emptyFragment,
          bodyFragment,
        },
      })
    )
  ).toEqual({ owned: true, valid: false });
});
