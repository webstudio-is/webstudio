import { expect, test } from "@jest/globals";
import stripIndent from "strip-indent";
import {
  createScope,
  type DataSource,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import { showAttribute } from "./props";
import { collectionComponent } from "./core-components";
import {
  generateJsxChildren,
  generateJsxElement,
  generateWebstudioComponent,
} from "./component-generator";

const clear = (input: string) =>
  stripIndent(input).trimStart().replace(/ +$/, "");

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item] as const));

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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
          name: "onChange",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `$ws$dataSource$variableId = 1`,
            },
            {
              type: "execute",
              args: ["value"],
              code: `$ws$dataSource$variableId = value`,
            },
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
      usedDataSources: new Map(),
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
      onChange={(value: any) => {
      variableName = 1
      variableName = value
      set$variableName(variableName)
      }} />
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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

test("generate jsx children with expression", () => {
  expect(
    generateJsxChildren({
      scope: createScope(),
      children: [
        { type: "expression", value: "'Hello ' + $ws$dataSource$var" },
      ],
      instances: new Map(),
      props: new Map(),
      dataSources: new Map([
        createDataSourcePair({
          id: "var",
          scopeInstanceId: "body",
          name: "my var",
          type: "variable",
          value: { type: "string", value: "world" },
        }),
      ]),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
      {'Hello ' + myvar}
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
    {data?.map((element: any, index: number) =>
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

test("generate component with variables and actions", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
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
      const Page = () => {
      let [variableName, set$variableName] = useState<any>("initial")
      return <Body
      data-ws-id="body"
      data-ws-component="Body">
      <Input
      data-ws-id="input"
      data-ws-component="Input"
      data-ws-index="0"
      value={variableName}
      onChange={(value: any) => {
      variableName = value
      set$variableName(variableName)
      }} />
      </Body>
      }
    `)
  );
});

test("add classes and merge classes", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map([["body", ["cls1"]]]),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      instances: new Map([createInstancePair("body", "Body", [])]),
      dataSources: new Map(),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "body",
          name: "className",
          type: "string",
          value: 'cls2 "cls3"',
        }),
      ]),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
    const Page = () => {
    return <Body
    data-ws-id="body"
    data-ws-component="Body"
    className="cls1 cls2 \\"cls3\\"" />
    }
    `)
  );
});

test("avoid generating collection parameter variable as state", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
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
    const Page = () => {
    let [data, set$data] = useState<any>(["apple","orange","mango"])
    return <Body
    data-ws-id="body"
    data-ws-component="Body">
    {data?.map((element: any, index: number) =>
    <Fragment key={index}>
    </Fragment>
    )}
    </Body>
    }
    `)
  );
});

test("generate system variable when present", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(["system"]),
      name: "Page",
      rootInstanceId: "body",
      parameters: [
        {
          id: "pathSystemPropId",
          type: "parameter",
          instanceId: "",
          name: "system",
          value: "systemId",
        },
      ],
      instances: new Map([createInstancePair("body", "Body", [])]),
      dataSources: new Map([
        createDataSourcePair({
          id: "systemId",
          scopeInstanceId: "body",
          type: "parameter",
          name: "system",
        }),
      ]),
      props: new Map([
        createPropPair({
          id: "paramPropId",
          instanceId: "body",
          name: "data-slug",
          type: "expression",
          value: "$ws$dataSource$systemId.params.slug",
        }),
      ]),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
    const Page = ({ system: system_1, }: { system: any; }) => {
    return <Body
    data-ws-id="body"
    data-ws-component="Body"
    data-slug={system_1?.params?.slug} />
    }
    `)
  );
});

test("generate resources loading", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      instances: new Map([createInstancePair("body", "Body", [])]),
      dataSources: new Map([
        createDataSourcePair({
          id: "dataSourceDataId",
          scopeInstanceId: "body",
          type: "variable",
          name: "data",
          value: { type: "json", value: "data" },
        }),
        createDataSourcePair({
          id: "dataSourceResourceId",
          scopeInstanceId: "body",
          type: "resource",
          name: "data",
          resourceId: "resourceId",
        }),
      ]),
      props: new Map([
        createPropPair({
          id: "propDataId",
          instanceId: "body",
          name: "data-data",
          type: "expression",
          value: "$ws$dataSource$dataSourceDataId",
        }),
        createPropPair({
          id: "propResourceId",
          instanceId: "body",
          name: "data-resource",
          type: "expression",
          value: "$ws$dataSource$dataSourceResourceId",
        }),
      ]),
      indexesWithinAncestors: new Map(),
    })
  ).toEqual(
    clear(`
    const Page = () => {
    let [data, set$data] = useState<any>("data")
    let data_1 = useResource("data_2")
    return <Body
    data-ws-id="body"
    data-ws-component="Body"
    data-data={data}
    data-resource={data_1} />
    }
    `)
  );
});

test("avoid generating unused variables", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [
        {
          id: "systemPropId",
          type: "parameter",
          instanceId: "",
          name: "system",
          value: "unusedParameterId",
        },
      ],

      instances: new Map([createInstancePair("body", "Body", [])]),
      dataSources: toMap([
        {
          id: "usedVariableId",
          scopeInstanceId: "body",
          name: "Used Variable Name",
          type: "variable",
          value: { type: "string", value: "initial" },
        },
        {
          id: "unusedVariableId",
          scopeInstanceId: "body",
          name: "Unused Variable Name",
          type: "variable",
          value: { type: "string", value: "initial" },
        },
        {
          id: "unusedParameterId",
          scopeInstanceId: "body",
          name: "Unused Parameter Name",
          type: "parameter",
        },
        {
          id: "unusedResourceVariableId",
          scopeInstanceId: "body",
          name: "Unused Resource Name",
          type: "resource",
          resourceId: "resourceId",
        },
      ]),
      props: toMap([
        {
          id: "propId",
          instanceId: "body",
          name: "data-data",
          type: "expression",
          value: "$ws$dataSource$usedVariableId",
        },
      ]),
      indexesWithinAncestors: new Map(),
    })
  ).toMatchInlineSnapshot(`
"const Page = ({ }: { system: any; }) => {
let [UsedVariableName, set$UsedVariableName] = useState<any>("initial")
return <Body
data-ws-id="body"
data-ws-component="Body"
data-data={UsedVariableName} />
}
"
`);
});
