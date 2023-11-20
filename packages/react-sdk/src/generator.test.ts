import { expect, test } from "@jest/globals";
import { generateUtilsExport } from "./generator";

const createPage = (path: string) => ({
  id: "",
  path,
  name: "",
  title: "",
  rootInstanceId: "",
  meta: {},
});

test("generates forms properties", () => {
  expect(
    generateUtilsExport({
      pages: {
        meta: {},
        homePage: createPage("1"),
        pages: [],
      },
      props: new Map([
        [
          "method1Id",
          {
            id: "method1Id",
            instanceId: "1",
            name: "method",
            type: "string",
            value: "post",
          },
        ],

        [
          "method2Id",
          {
            id: "method2Id",
            instanceId: "2",
            name: "method",
            type: "string",
            value: "get",
          },
        ],

        [
          "action1Id",
          {
            id: "action1Id",
            instanceId: "2",
            name: "action",
            type: "string",
            value: "/index.php",
          },
        ],
      ]),
    })
  ).toMatchInlineSnapshot(`
  "
    export const pagesPaths = new Set(["1"])

    export const formsProperties = new Map<string, { method?: string, action?: string }>([["1",{"method":"post"}],["2",{"method":"get","action":"/index.php"}]])
    "
  `);
});

test("generates list of pages paths", () => {
  expect(
    generateUtilsExport({
      pages: {
        meta: {},
        homePage: createPage("/path1"),
        pages: [createPage("/path2"), createPage("/path3")],
      },
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
  "
    export const pagesPaths = new Set(["/path1","/path2","/path3"])

    export const formsProperties = new Map<string, { method?: string, action?: string }>([])
    "
  `);
});
