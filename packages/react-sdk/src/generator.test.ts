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
          "_open",
          {
            type: "dataSource",
            id: "_open",
            instanceId: "tabs",
            name: "open",
            value: "_tabsOpen",
          },
        ],

        [
          "_onOpenChange",
          {
            type: "action",
            id: "_onOpenChange",
            instanceId: "tabs",
            name: "onOpenChange",
            value: [
              {
                type: "execute",
                args: ["open"],
                code: `$ws$dataSource$_tabsOpen = open`,
              },
            ],
          },
        ],

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
      dataSources: new Map([
        [
          "_tabsOpen",
          {
            id: "_tabsOpen",
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

    const getDataSourcesLogic = (
    _getVariable: (id: string) => unknown,
    _setVariable: (id: string, value: unknown) => void
  ) => {
  let tabsOpen = _getVariable("_tabsOpen") ?? "0";
  let set$tabsOpen = (value: unknown) => _setVariable("_tabsOpen", value);
  let onOpenChange = (open: any) => {
  tabsOpen = open
  set$tabsOpen(tabsOpen)
  }
  let _output = new Map();
  _output.set('_tabsOpen', tabsOpen)
  _output.set('_onOpenChange', onOpenChange)
  return _output
  }


    export const formsProperties = new Map<string, { method?: string, action?: string }>([["1",{"method":"post"}],["2",{"method":"get","action":"/index.php"}]])

    export const utils = {
      indexesWithinAncestors,
      getDataSourcesLogic,
    };

    /* eslint-enable */
    "
  `);
});
