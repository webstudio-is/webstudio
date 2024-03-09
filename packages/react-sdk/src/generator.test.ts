import { expect, test } from "@jest/globals";
import { generateUtilsExport } from "./generator";

test("generates forms properties", () => {
  expect(
    generateUtilsExport({
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
  export const formsProperties = new Map<string, { method?: string, action?: string }>([["1",{"method":"post"}],["2",{"method":"get","action":"/index.php"}]])
  "
`);
});

test("generates list of pages paths", () => {
  expect(
    generateUtilsExport({
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
"
  export const formsProperties = new Map<string, { method?: string, action?: string }>([])
  "
`);
});
