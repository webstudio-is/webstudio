import { expect, test } from "@jest/globals";
import stripIndent from "strip-indent";
import {
  createScope,
  type DataSource,
  type Instance,
  type Page,
  type Prop,
} from "@webstudio-is/sdk";
import { showAttribute } from "./props";
import { collectionComponent } from "./core-components";
import {
  generateJsxChildren,
  generateJsxElement,
  generatePageComponent,
} from "./component-generator";

const clear = (input: string) =>
  stripIndent(input).trimStart().replace(/ +$/, "");

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): [Instance["id"], Instance] => {
  return [id, createInstance(id, component, children)];
};

const createPropPair = (prop: Prop): [Prop["id"], Prop] => {
  return [prop.id, prop];
};

const createDataSourcePair = (
  dataSource: DataSource
): [DataSource["id"], DataSource] => {
  return [dataSource.id, dataSource];
};

test("generate jsx element with children and without them", () => {
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("body", "Body", [
        { type: "id", value: "childId" },
      ]),
      props: new Map(),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: "Children\n",
    })
  ).toEqual(
    clear(`
      <Body
      data-ws-id="body"
      data-ws-component="Body">
      Children
      </Body>
    `)
  );
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("image", "Image", []),
      props: new Map(),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: "Children\n",
    })
  ).toEqual(
    clear(`
      <Image
      data-ws-id="image"
      data-ws-component="Image" />
    `)
  );
});

test("generate jsx element with namespaces components", () => {
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("body", "@webstudio-is/library:Body", [
        { type: "id", value: "childId" },
      ]),
      props: new Map(),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: "Children\n",
    })
  ).toEqual(
    clear(`
      <Body
      data-ws-id="body"
      data-ws-component="@webstudio-is/library:Body">
      Children
      </Body>
    `)
  );
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("image", "@webstudio-is/library:Image", []),
      props: new Map(),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: "Children\n",
    })
  ).toEqual(
    clear(`
      <Image
      data-ws-id="image"
      data-ws-component="@webstudio-is/library:Image" />
    `)
  );
});

test("generate jsx element with literal props", () => {
  const props = new Map([
    createPropPair({
      id: "1",
      instanceId: "body",
      type: "string",
      name: "string",
      value: "string",
    }),
    createPropPair({
      id: "2",
      instanceId: "body",
      type: "number",
      name: "number",
      value: 0,
    }),
    createPropPair({
      id: "3",
      instanceId: "image",
      type: "boolean",
      name: "boolean",
      value: true,
    }),
    createPropPair({
      id: "4",
      instanceId: "image",
      type: "string[]",
      name: "stringArray",
      value: ["value1", "value2"],
    }),
  ]);
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("body", "Body", [
        { type: "id", value: "image" },
      ]),
      props,
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: "Children\n",
    })
  ).toEqual(
    clear(`
      <Body
      data-ws-id="body"
      data-ws-component="Body"
      string={"string"}
      number={0}>
      Children
      </Body>
    `)
  );
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("image", "Image", []),
      props,
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: "",
    })
  ).toEqual(
    clear(`
      <Image
      data-ws-id="image"
      data-ws-component="Image"
      boolean={true}
      stringArray={["value1","value2"]} />
    `)
  );
});

test("ignore asset and page props", () => {
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("box", "Box", []),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "box",
          type: "page",
          name: "page",
          value: "pageId",
        }),
        createPropPair({
          id: "2",
          instanceId: "box",
          type: "asset",
          name: "asset",
          value: "assetId",
        }),
      ]),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: "",
    })
  ).toEqual(
    clear(`
      <Box
      data-ws-id="box"
      data-ws-component="Box" />
    `)
  );
});

test("generate jsx element with data sources and action", () => {
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("box", "Box", []),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "box",
          type: "expression",
          name: "variable",
          value: "$ws$dataSource$variableId",
        }),
        createPropPair({
          id: "2",
          instanceId: "box",
          type: "expression",
          name: "expression",
          value: `$ws$dataSource$variableId + 1`,
        }),
        createPropPair({
          id: "3",
          instanceId: "box",
          type: "action",
          name: "onClick",
          value: [{ type: "execute", args: [], code: `variableName = 1` }],
        }),
        createPropPair({
          id: "4",
          instanceId: "box",
          type: "action",
          name: "onChange",
          value: [
            { type: "execute", args: ["value"], code: `variableName = value` },
            { type: "execute", args: ["value"], code: `variableName = value` },
          ],
        }),
      ]),
      dataSources: new Map([
        createDataSourcePair({
          type: "variable",
          id: "variableId",
          name: "variableName",
          value: { type: "number", value: 0 },
        }),
      ]),
      indexesWithinAncestors: new Map(),
      children: "",
    })
  ).toEqual(
    clear(`
      <Box
      data-ws-id="box"
      data-ws-component="Box"
      variable={variableName}
      expression={variableName + 1}
      onClick={onClick}
      onChange={onChange} />
    `)
  );
});

test("generate jsx element with condition based on show prop", () => {
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("box", "Box", []),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "box",
          type: "boolean",
          name: showAttribute,
          value: true,
        }),
      ]),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: "",
    })
  ).toEqual(
    clear(`
      <Box
      data-ws-id="box"
      data-ws-component="Box" />
    `)
  );
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("box", "Box", []),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "box",
          type: "boolean",
          name: showAttribute,
          value: false,
        }),
      ]),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: "",
    })
  ).toEqual("");
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("box", "Box", []),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "box",
          name: showAttribute,
          type: "expression",
          value: "$ws$dataSource$conditionId",
        }),
      ]),
      dataSources: new Map([
        createDataSourcePair({
          type: "variable",
          id: "conditionId",
          name: "conditionName",
          value: { type: "boolean", value: false },
        }),
      ]),
      indexesWithinAncestors: new Map(),
      children: "",
    })
  ).toEqual(
    clear(`
      {(conditionName) &&
      <Box
      data-ws-id="box"
      data-ws-component="Box" />
      }
    `)
  );
});

test("generate jsx element with index prop", () => {
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("box", "Box", []),
      props: new Map(),
      dataSources: new Map(),
      indexesWithinAncestors: new Map([["box", 5]]),
      children: "",
    })
  ).toEqual(
    clear(`
      <Box
      data-ws-id="box"
      data-ws-component="Box"
      data-ws-index="5" />
    `)
  );
});

test("generate jsx children with text", () => {
  expect(
    generateJsxChildren({
      scope: createScope(),
      children: [
        { type: "text", value: "Some\ntext" },
        { type: "text", value: 'Escaped "text"' },
      ],
      instances: new Map(),
      props: new Map(),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
      {"Some"}
      <br />
      {"text"}
      {"Escaped \\"text\\""}
    `)
  );
});

test("generate jsx children with nested instances", () => {
  expect(
    generateJsxChildren({
      scope: createScope(),
      children: [{ type: "id", value: "form" }],
      instances: new Map([
        createInstancePair("form", "Form", [
          { type: "id", value: "input" },
          { type: "id", value: "button" },
        ]),
        createInstancePair("input", "Input", []),
        createInstancePair("button", "Button", []),
      ]),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "form",
          name: "prop",
          type: "string",
          value: "value",
        }),
      ]),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
    <Form
    data-ws-id="form"
    data-ws-component="Form"
    prop={"value"}>
    <Input
    data-ws-id="input"
    data-ws-component="Input" />
    <Button
    data-ws-id="button"
    data-ws-component="Button" />
    </Form>
    `)
  );
});

test("deduplicate base and namespaced components with same short name", () => {
  expect(
    generateJsxChildren({
      scope: createScope(),
      children: [
        { type: "id", value: "button1" },
        { type: "id", value: "button2" },
      ],
      instances: new Map([
        createInstancePair("button1", "Button", []),
        createInstancePair(
          "button2",
          "@webstudio-is/sdk-component-react-radix:Button",
          []
        ),
      ]),
      props: new Map(),
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
    <Button
    data-ws-id="button1"
    data-ws-component="Button" />
    <Button_1
    data-ws-id="button2"
    data-ws-component="@webstudio-is/sdk-component-react-radix:Button" />
    `)
  );
});

test("generate collection component as map", () => {
  expect(
    generateJsxChildren({
      scope: createScope(),
      children: [{ type: "id", value: "list" }],
      instances: new Map([
        createInstancePair("list", collectionComponent, [
          { type: "id", value: "label" },
          { type: "id", value: "button" },
        ]),
        createInstancePair("label", "Label", []),
        createInstancePair("button", "Button", []),
      ]),
      dataSources: new Map([
        createDataSourcePair({
          id: "dataSourceList",
          scopeInstanceId: "list",
          type: "variable",
          name: "data",
          value: { type: "json", value: ["apple", "orange", "mango"] },
        }),
        createDataSourcePair({
          id: "dataSourceItem",
          scopeInstanceId: "list",
          type: "variable",
          name: "element",
          value: { type: "json", value: `` },
        }),
      ]),
      props: new Map([
        createPropPair({
          id: "propData",
          instanceId: "list",
          name: "data",
          type: "expression",
          value: "$ws$dataSource$dataSourceList",
        }),
        createPropPair({
          id: "propItem",
          instanceId: "list",
          name: "item",
          type: "parameter",
          value: "dataSourceItem",
        }),
        createPropPair({
          id: "buttonAriaLabel",
          instanceId: "button",
          name: "aria-label",
          type: "expression",
          value: "$ws$dataSource$dataSourceItem",
        }),
      ]),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
    {data.map((element, index) =>
    <Fragment key={index}>
    <Label
    data-ws-id="label"
    data-ws-component="Label" />
    <Button
    data-ws-id="button"
    data-ws-component="Button"
    aria-label={element} />
    </Fragment>
    )}
    `)
  );
});

test("generate page component with variables and actions", () => {
  expect(
    generatePageComponent({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      instances: new Map([
        createInstancePair("body", "Body", [{ type: "id", value: "input" }]),
        createInstancePair("input", "Input", []),
      ]),
      dataSources: new Map([
        createDataSourcePair({
          type: "variable",
          id: "variableId",
          name: "variableName",
          value: { type: "string", value: "initial" },
        }),
      ]),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "input",
          name: "value",
          type: "expression",
          value: "$ws$dataSource$variableId",
        }),
        createPropPair({
          id: "2",
          instanceId: "input",
          name: "onChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `$ws$dataSource$variableId = value`,
            },
          ],
        }),
      ]),
      indexesWithinAncestors: new Map([["input", 0]]),
    })
  ).toEqual(
    clear(`
      type Params = Record<string, string | undefined>
      const Page = (_props: { params: Params }) => {
      let [variableName, set$variableName] = useState<any>("initial")
      let onChange = (value: any) => {
      variableName = value
      set$variableName(variableName)
      }
      return <Body
      data-ws-id="body"
      data-ws-component="Body">
      <Input
      data-ws-id="input"
      data-ws-component="Input"
      data-ws-index="0"
      value={variableName}
      onChange={onChange} />
      </Body>
      }
    `)
  );
});

test("avoid generating collection parameter variable as state", () => {
  expect(
    generatePageComponent({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      instances: new Map([
        createInstancePair("body", "Body", [{ type: "id", value: "list" }]),
        createInstancePair("list", collectionComponent, []),
      ]),
      dataSources: new Map([
        createDataSourcePair({
          id: "dataSourceList",
          scopeInstanceId: "list",
          type: "variable",
          name: "data",
          value: { type: "json", value: ["apple", "orange", "mango"] },
        }),
        createDataSourcePair({
          id: "dataSourceItem",
          scopeInstanceId: "list",
          type: "parameter",
          name: "element",
        }),
      ]),
      props: new Map([
        createPropPair({
          id: "propData",
          instanceId: "list",
          name: "data",
          type: "expression",
          value: "$ws$dataSource$dataSourceList",
        }),
        createPropPair({
          id: "propItem",
          instanceId: "list",
          name: "item",
          type: "parameter",
          value: "dataSourceItem",
        }),
      ]),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
    type Params = Record<string, string | undefined>
    const Page = (_props: { params: Params }) => {
    let [data, set$data] = useState<any>(["apple","orange","mango"])
    return <Body
    data-ws-id="body"
    data-ws-component="Body">
    {data.map((element, index) =>
    <Fragment key={index}>
    </Fragment>
    )}
    </Body>
    }
    `)
  );
});

test("generate params variable when present", () => {
  expect(
    generatePageComponent({
      scope: createScope(["params"]),
      page: { rootInstanceId: "body", pathVariableId: "pathParamsId" } as Page,
      instances: new Map([createInstancePair("body", "Body", [])]),
      dataSources: new Map([
        createDataSourcePair({
          id: "pathParamsId",
          scopeInstanceId: "body",
          type: "parameter",
          name: "params",
        }),
      ]),
      props: new Map([
        createPropPair({
          id: "paramPropId",
          instanceId: "body",
          name: "data-slug",
          type: "expression",
          value: "$ws$dataSource$pathParamsId.slug",
        }),
      ]),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
    type Params = Record<string, string | undefined>
    const Page = (_props: { params: Params }) => {
    let params_1 = _props.params
    return <Body
    data-ws-id="body"
    data-ws-component="Body"
    data-slug={params_1?.slug} />
    }
    `)
  );
});
