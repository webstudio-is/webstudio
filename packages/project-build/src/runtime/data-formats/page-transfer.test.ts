import { expect, test } from "vitest";
import { parsePageTransferData } from "./page-transfer";

test("validates page transfer data", () => {
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
