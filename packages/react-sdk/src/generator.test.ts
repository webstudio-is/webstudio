import { expect, test } from "@jest/globals";
import { generateUtilsExport } from "./generator";

test("generates utils", () => {
  expect(
    generateUtilsExport({
      page: {
        id: "",
        path: "",
        name: "",
        title: "",
        meta: {},
        rootInstanceId: "tabs",
      },
      metas: new Map([
        ["Tabs", { type: "container", label: "", icon: "" }],
        [
          "TabsContent",
          {
            type: "container",
            label: "",
            icon: "",
            indexWithinAncestor: "Tabs",
          },
        ],
      ]),
      instances: new Map([
        [
          "tabs",
          {
            id: "tabs",
            type: "instance",
            component: "Tabs",
            children: [
              { type: "id", value: "content1" },
              { type: "id", value: "content2" },
            ],
          },
        ],

        [
          "content1",
          {
            id: "content1",
            type: "instance",
            component: "TabsContent",
            children: [],
          },
        ],

        [
          "content2",
          {
            id: "content2",
            type: "instance",
            component: "TabsContent",
            children: [],
          },
        ],
      ]),
      props: new Map([
        [
          "open",
          {
            type: "dataSource",
            id: "open",
            instanceId: "tabs",
            name: "open",
            value: "tabsOpen",
          },
        ],

        [
          "onOpenChange",
          {
            type: "action",
            id: "onOpenChange",
            instanceId: "tabs",
            name: "onOpenChange",
            value: [
              {
                type: "execute",
                args: ["open"],
                code: `$ws$dataSource$tabsOpen = open`,
              },
            ],
          },
        ],
      ]),
      dataSources: new Map([
        [
          "tabsOpen",
          {
            id: "tabsOpen",
            name: "tabsOpen",
            scopeInstanceId: "tabs",
            type: "variable",
            value: { type: "string", value: "0" },
          },
        ],
      ]),
    })
  ).toMatchInlineSnapshot(`
"
  /* eslint-disable */

  const indexesWithinAncestors = new Map<string, number>([
  ["content1", 0],
["content2", 1],

  ]);

  const rawExecuteComputingExpressions = (
    _variables: Map<string, unknown>
  ): Map<string, unknown> => {
    return new Map([
]);
  };
  const executeComputingExpressions = (variables: Map<string, unknown>) => {
    const encodedvariables = sdk.encodeVariablesMap(variables);
    const encodedResult = rawExecuteComputingExpressions(encodedvariables);
    return sdk.decodeVariablesMap(encodedResult);
  };

  const generatedEffectfulExpressions = new Map<
    string,
    (args: Map<string, any>, variables: Map<string, any>) => Map<string, unknown>
  >([
  ["$ws$dataSource$tabsOpen = open", (_args: Map<string, any>, _variables: Map<string, any>) => { let open = _args.get('open');
let $ws$dataSource$tabsOpen;
$ws$dataSource$tabsOpen = open;
return new Map([
  ['$ws$dataSource$tabsOpen', $ws$dataSource$tabsOpen],
]); }],

  ]);

  const rawExecuteEffectfulExpression = (
    code: string,
    args: Map<string, unknown>,
    variables: Map<string, unknown>
  ): Map<string, unknown> => {
    if(generatedEffectfulExpressions.has(code)) {
      return generatedEffectfulExpressions.get(code)!(args, variables);
    }
    console.error("Effectful expression not found", code);
    throw new Error("Effectful expression not found");
  };

  const executeEffectfulExpression = (
    code: string,
    args: Map<string, unknown>,
    variables: Map<string, unknown>
  ) => {
    const encodedvariables = sdk.encodeVariablesMap(variables);
    const encodedResult = rawExecuteEffectfulExpression(code, args, encodedvariables);
    return sdk.decodeVariablesMap(encodedResult);
  };

  export const utils = {
    indexesWithinAncestors,
    executeComputingExpressions,
    executeEffectfulExpression,
  };

  /* eslint-enable */
  "
`);
});
