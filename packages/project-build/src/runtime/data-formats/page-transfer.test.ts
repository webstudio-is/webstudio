import { expect, test } from "vitest";
import { pageTransferItemInput, parsePageTransferData } from "./page-transfer";

const fragment = {
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

const pageTransferItem = {
  type: "page" as const,
  page: {
    id: "page",
    name: "Page",
    path: "/page",
    title: `"Page"`,
    meta: {},
    rootInstanceId: "body",
  },
  rootFragment: fragment,
  bodyFragment: fragment,
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
        rootFragment: fragment,
        bodyFragment: fragment,
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

test("accepts optional source Asset metadata", () => {
  const result = parsePageTransferData(
    JSON.stringify({
      "@webstudio/page/v0.1": {
        ...pageTransferItem,
        sourceOrigin: "https://source.example.com",
        assetPaths: { image: "media/hero.png" },
      },
    })
  );

  expect(result).toMatchObject({
    owned: true,
    valid: true,
    data: {
      type: "page",
      sourceOrigin: "https://source.example.com",
      assetPaths: { image: "media/hero.png" },
    },
  });
});

test("keeps clipboard source metadata out of the runtime input", () => {
  expect(
    pageTransferItemInput.parse({
      ...pageTransferItem,
      sourceOrigin: "https://source.example.com",
    })
  ).toEqual(pageTransferItem);
});

test("rejects ambiguous Form in a nested folder page before paste", () => {
  const bodyFragment = {
    ...fragment,
    instances: [
      { type: "instance", id: "form", component: "Form", children: [] },
    ],
  };
  const folder = {
    type: "folder",
    folder: { id: "folder", name: "Folder", slug: "folder", children: [] },
    children: [
      {
        type: "folder",
        folder: { id: "nested", name: "Nested", slug: "nested", children: [] },
        children: [{ ...pageTransferItem, bodyFragment }],
      },
    ],
  };
  expect(
    parsePageTransferData(JSON.stringify({ "@webstudio/page/v0.1": folder }))
  ).toMatchObject({
    owned: true,
    valid: false,
    error: expect.stringMatching(/Copy it again/),
  });
});

test.each(["ResourceForm", "WebhookForm", "NativeForm"])(
  "accepts unambiguous %s page clipboard data",
  (component) => {
    expect(
      parsePageTransferData(
        JSON.stringify({
          "@webstudio/page/v0.1": {
            ...pageTransferItem,
            bodyFragment: {
              ...fragment,
              instances: [
                { type: "instance", id: "form", component, children: [] },
              ],
            },
          },
        })
      )
    ).toMatchObject({ owned: true, valid: true });
  }
);
