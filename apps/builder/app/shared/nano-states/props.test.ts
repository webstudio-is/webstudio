import { expect, test } from "@jest/globals";
import { cleanStores } from "nanostores";
import type { Instance, Page } from "@webstudio-is/sdk";
import { collectionComponent } from "@webstudio-is/react-sdk";
import { $instances } from "./instances";
import { $propValuesByInstanceSelector } from "./props";
import { $pages, $selectedPageId } from "./pages";
import {
  $assets,
  $dataSourceVariables,
  $dataSources,
  $props,
} from "./nano-states";
import { $params } from "~/canvas/stores";

const getIdValuePair = <T extends { id: string }>(item: T) =>
  [item.id, item] as const;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map(getIdValuePair));

const setBoxInstance = (id: Instance["id"]) => {
  $instances.set(
    toMap([{ id, type: "instance", component: "Box", children: [] }])
  );
};

const selectPageRoot = (rootInstanceId: Instance["id"]) => {
  $pages.set({
    homePage: { id: "pageId", rootInstanceId, path: "/my-page" } as Page,
    pages: [],
  });
  $selectedPageId.set("pageId");
};

test("collect prop values", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $dataSources.set(new Map());
  $props.set(
    toMap([
      {
        id: "prop1",
        name: "first",
        instanceId: "box",
        type: "number",
        value: 0,
      },
      {
        id: "prop2",
        name: "second",
        instanceId: "box",
        type: "json",
        value: { name: "John" },
      },
    ])
  );
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(
    new Map<string, unknown>([
      ["first", 0],
      ["second", { name: "John" }],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("compute expression prop values", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $dataSources.set(
    toMap([
      {
        id: "var1",
        type: "variable",
        name: "",
        value: { type: "number", value: 1 },
      },
      {
        id: "var2",
        type: "variable",
        name: "",
        value: { type: "string", value: "Hello" },
      },
    ])
  );
  $props.set(
    toMap([
      {
        id: "prop1",
        name: "first",
        instanceId: "box",
        type: "expression",
        value: `$ws$dataSource$var1 + 2`,
      },
      {
        id: "prop2",
        name: "second",
        instanceId: "box",
        type: "expression",
        value: `$ws$dataSource$var2 + ' World!'`,
      },
    ])
  );
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(
    new Map<string, unknown>([
      ["first", 3],
      ["second", "Hello World!"],
    ])
  );

  $dataSourceVariables.set(new Map([["var1", 4]]));
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(
    new Map<string, unknown>([
      ["first", 6],
      ["second", "Hello World!"],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});

test("generate action prop callbacks", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $dataSources.set(
    toMap([
      {
        id: "var",
        type: "variable",
        name: "",
        value: { type: "number", value: 1 },
      },
    ])
  );
  $props.set(
    toMap([
      {
        id: "valueId",
        name: "value",
        instanceId: "box",
        type: "expression",
        value: `$ws$dataSource$var`,
      },
      {
        id: "actionId",
        name: "onChange",
        instanceId: "box",
        type: "action",
        value: [
          {
            type: "execute",
            args: [],
            code: `$ws$dataSource$var = $ws$dataSource$var + 1`,
          },
        ],
      },
    ])
  );
  const values1 = $propValuesByInstanceSelector
    .get()
    .get(JSON.stringify(["box"]));
  expect(values1?.get("value")).toEqual(1);

  (values1?.get("onChange") as () => void)();
  const values2 = $propValuesByInstanceSelector
    .get()
    .get(JSON.stringify(["box"]));
  expect(values2?.get("value")).toEqual(2);

  cleanStores($propValuesByInstanceSelector);
});

test("resolve asset prop values when params is provided", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $dataSources.set(new Map());
  $params.set(undefined);
  $assets.set(
    toMap([
      {
        id: "assetId",
        type: "image",
        name: "my-file.jpg",
        format: "jpeg",
        size: 0,
        projectId: "",
        createdAt: "",
        meta: { width: 0, height: 0 },
        description: "",
      },
    ])
  );
  $props.set(
    toMap([
      {
        id: "propId",
        name: "myAsset",
        instanceId: "box",
        type: "asset",
        value: "assetId",
      },
    ])
  );
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(new Map());

  $params.set({
    assetBaseUrl: "/asset/",
    imageBaseUrl: "/image/",
  });
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(new Map<string, unknown>([["myAsset", "/asset/my-file.jpg"]]));

  cleanStores($propValuesByInstanceSelector);
});

test("resolve page prop values when params is provided", () => {
  setBoxInstance("box");
  selectPageRoot("box");
  $params.set(undefined);
  $dataSources.set(new Map());
  $props.set(
    toMap([
      {
        id: "propId",
        name: "myPage",
        instanceId: "box",
        type: "page",
        value: "pageId",
      },
    ])
  );
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(new Map());

  $params.set({
    assetBaseUrl: "/asset/",
    imageBaseUrl: "/image/",
  });
  expect(
    $propValuesByInstanceSelector.get().get(JSON.stringify(["box"]))
  ).toEqual(new Map<string, unknown>([["myPage", "/my-page"]]));

  cleanStores($propValuesByInstanceSelector);
});

test("compute expression from collection items", () => {
  $instances.set(
    toMap([
      {
        id: "list",
        type: "instance",
        component: collectionComponent,
        children: [{ type: "id", value: "item" }],
      },
      {
        id: "item",
        type: "instance",
        component: "Box",
        children: [],
      },
    ])
  );
  selectPageRoot("list");
  $dataSources.set(
    toMap([
      {
        id: "itemId",
        type: "variable",
        name: "item",
        value: { type: "json", value: {} },
      },
    ])
  );
  $props.set(
    toMap([
      {
        id: "prop1",
        name: "data",
        instanceId: "list",
        type: "json",
        value: ["orange", "apple", "banana"],
      },
      {
        id: "prop2",
        name: "item",
        instanceId: "list",
        type: "parameter",
        value: "itemId",
      },
      {
        id: "prop3",
        name: "ariaLabel",
        instanceId: "item",
        type: "expression",
        value: `$ws$dataSource$itemId`,
      },
    ])
  );
  expect($propValuesByInstanceSelector.get()).toEqual(
    new Map([
      [
        JSON.stringify(["list"]),
        new Map<string, unknown>([["data", ["orange", "apple", "banana"]]]),
      ],
      [
        JSON.stringify(["item", "list[0]", "list"]),
        new Map<string, unknown>([["ariaLabel", "orange"]]),
      ],
      [
        JSON.stringify(["item", "list[1]", "list"]),
        new Map<string, unknown>([["ariaLabel", "apple"]]),
      ],
      [
        JSON.stringify(["item", "list[2]", "list"]),
        new Map<string, unknown>([["ariaLabel", "banana"]]),
      ],
    ])
  );

  cleanStores($propValuesByInstanceSelector);
});
