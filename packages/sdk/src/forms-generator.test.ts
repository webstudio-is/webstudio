import { expect, test } from "@jest/globals";
import { generateFormsProperties } from "./forms-generator";

test("generates forms properties", () => {
  expect(
    generateFormsProperties(
      new Map([
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
      ])
    )
  ).toMatchInlineSnapshot(`
"type FormProperties = { method?: string, action?: string }
export const formsProperties = new Map<string, FormProperties>([["1",{"method":"post"}],["2",{"method":"get","action":"/index.php"}]])
"
`);

  expect(generateFormsProperties(new Map())).toMatchInlineSnapshot(`
"type FormProperties = { method?: string, action?: string }
export const formsProperties = new Map<string, FormProperties>([])
"
`);
});
