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

test("accepts optional source origin metadata", () => {
  const result = parsePageTransferData(
    JSON.stringify({
      "@webstudio/page/v0.1": {
        ...pageTransferItem,
        sourceOrigin: "https://source.example.com",
      },
    })
  );

  expect(result).toMatchObject({
    owned: true,
    valid: true,
    data: {
      type: "page",
      sourceOrigin: "https://source.example.com",
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
