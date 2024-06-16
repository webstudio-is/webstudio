import { expect, test } from "@jest/globals";
import stripIndent from "strip-indent";
import { createScope, type DataSource } from "@webstudio-is/sdk";
import {
  $,
  ActionValue,
  AssetValue,
  ExpressionValue,
  PageValue,
  ParameterValue,
  createProxy,
  renderJsx,
  ws,
} from "@webstudio-is/sdk/testing";
import {
  generateJsxChildren,
  generateWebstudioComponent,
} from "./component-generator";

const clear = (input: string) =>
  stripIndent(input).trimStart().replace(/ +$/, "");

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item] as const));

test("generate jsx element with children and without them", () => {
  expect(
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "body" }],
      ...renderJsx(<$.Body ws:id="body">Children</$.Body>),
    })
  ).toEqual(
    clear(`
      <Body
      data-ws-id="body"
      data-ws-component="Body">
      {"Children"}
      </Body>
    `)
  );
  expect(
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "image" }],
      ...renderJsx(<$.Image ws:id="image"></$.Image>),
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
  const library = createProxy("@webstudio-is/library:");
  expect(
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "body" }],
      ...renderJsx(<library.Body ws:id="body"></library.Body>),
    })
  ).toEqual(
    clear(`
      <Body
      data-ws-id="body"
      data-ws-component="@webstudio-is/library:Body" />
    `)
  );
  expect(
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "image" }],
      ...renderJsx(<library.Image ws:id="image"></library.Image>),
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
  expect(
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "body" }],
      ...renderJsx(<$.Body ws:id="body" string="string" number={0}></$.Body>),
    })
  ).toEqual(
    clear(`
      <Body
      data-ws-id="body"
      data-ws-component="Body"
      string={"string"}
      number={0} />
    `)
  );
  expect(
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "image" }],
      ...renderJsx(
        <$.Image
          ws:id="image"
          boolean={true}
          stringArray={["value1", "value2"]}
        ></$.Image>
      ),
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
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderJsx(
        <$.Box
          ws:id="box"
          page={new PageValue("pageId")}
          asset={new AssetValue("assetId")}
        ></$.Box>
      ),
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
    generateJsxChildren({
      scope: createScope(),
      dataSources: toMap([
        {
          type: "variable",
          id: "variableId",
          name: "variableName",
          value: { type: "number", value: 0 },
        },
      ]),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderJsx(
        <$.Box
          ws:id="box"
          variable={new ExpressionValue("$ws$dataSource$variableId")}
          expression={new ExpressionValue(`$ws$dataSource$variableId + 1`)}
          onChange={
            new ActionValue(["value"], `$ws$dataSource$variableId = value`)
          }
        ></$.Box>
      ),
    })
  ).toEqual(
    clear(`
      <Box
      data-ws-id="box"
      data-ws-component="Box"
      variable={variableName}
      expression={variableName + 1}
      onChange={(value: any) => {
      variableName = value
      set$variableName(variableName)
      }} />
    `)
  );
});

test("generate jsx element with condition based on show prop", () => {
  expect(
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderJsx(<$.Box ws:id="box" data-ws-show={true}></$.Box>),
    })
  ).toEqual(
    clear(`
      <Box
      data-ws-id="box"
      data-ws-component="Box" />
    `)
  );
  expect(
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderJsx(<$.Box ws:id="box" data-ws-show={false}></$.Box>),
    })
  ).toEqual("");
  expect(
    generateJsxChildren({
      scope: createScope(),
      dataSources: toMap([
        {
          type: "variable",
          id: "conditionId",
          name: "conditionName",
          value: { type: "boolean", value: false },
        },
      ]),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderJsx(
        <$.Box
          ws:id="box"
          data-ws-show={new ExpressionValue("$ws$dataSource$conditionId")}
        ></$.Box>
      ),
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
    generateJsxChildren({
      scope: createScope(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map([["box", 5]]),
      children: [{ type: "id", value: "box" }],
      ...renderJsx(<$.Box ws:id="box"></$.Box>),
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

test("exclude text placeholders", () => {
  expect(
    generateJsxChildren({
      scope: createScope(),
      children: [
        { type: "text", value: "Text" },
        { type: "text", value: "Placeholder text", placeholder: true },
      ],
      instances: new Map(),
      props: new Map(),
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      excludePlaceholders: true,
    })
  ).toEqual(
    clear(`
      {"Text"}
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
      dataSources: toMap([
        {
          id: "var",
          scopeInstanceId: "body",
          name: "my var",
          type: "variable",
          value: { type: "string", value: "world" },
        },
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
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Form ws:id="form" prop="value">
          <$.Input></$.Input>
          <$.Button></$.Button>
        </$.Form>
      ),
    })
  ).toEqual(
    clear(`
    <Form
    data-ws-id="form"
    data-ws-component="Form"
    prop={"value"}>
    <Input
    data-ws-id="0"
    data-ws-component="Input" />
    <Button
    data-ws-id="1"
    data-ws-component="Button" />
    </Form>
    `)
  );
});

test("deduplicate base and namespaced components with same short name", () => {
  const radix = createProxy("@webstudio-is/sdk-component-react-radix:");
  expect(
    generateJsxChildren({
      scope: createScope(),
      children: [
        { type: "id", value: "button1" },
        { type: "id", value: "button2" },
      ],
      dataSources: new Map(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Fragment>
          <$.Button ws:id="button1"></$.Button>
          <radix.Button ws:id="button2"></radix.Button>
        </$.Fragment>
      ),
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
      dataSources: toMap([
        {
          id: "dataSourceList",
          scopeInstanceId: "list",
          type: "variable",
          name: "data",
          value: { type: "json", value: ["apple", "orange", "mango"] },
        },
        {
          id: "dataSourceItem",
          scopeInstanceId: "list",
          type: "variable",
          name: "element",
          value: { type: "json", value: `` },
        },
      ]),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <ws.collection
          ws:id="list"
          data={new ExpressionValue("$ws$dataSource$dataSourceList")}
          item={new ParameterValue("dataSourceItem")}
        >
          <$.Label></$.Label>
          <$.Button
            aria-label={new ExpressionValue("$ws$dataSource$dataSourceItem")}
          ></$.Button>
        </ws.collection>
      ),
    })
  ).toEqual(
    clear(`
    {data?.map((element: any, index: number) =>
    <Fragment key={index}>
    <Label
    data-ws-id="0"
    data-ws-component="Label" />
    <Button
    data-ws-id="1"
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
      dataSources: toMap([
        {
          type: "variable",
          id: "variableId",
          name: "variableName",
          value: { type: "string", value: "initial" },
        },
      ]),
      indexesWithinAncestors: new Map([["input", 0]]),
      ...renderJsx(
        <$.Body ws:id="body">
          <$.Input
            value={new ExpressionValue("$ws$dataSource$variableId")}
            onChange={
              new ActionValue(["value"], `$ws$dataSource$variableId = value`)
            }
          />
        </$.Body>
      ),
    })
  ).toEqual(
    clear(`
      const Page = () => {
      let [variableName, set$variableName] = useState<any>("initial")
      return <Body
      data-ws-id="body"
      data-ws-component="Body">
      <Input
      data-ws-id="0"
      data-ws-component="Input"
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
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderJsx(<$.Body ws:id="body" className='cls2 "cls3"'></$.Body>),
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
      dataSources: toMap([
        {
          id: "dataSourceList",
          scopeInstanceId: "list",
          type: "variable",
          name: "data",
          value: { type: "json", value: ["apple", "orange", "mango"] },
        },
        {
          id: "dataSourceItem",
          scopeInstanceId: "list",
          type: "parameter",
          name: "element",
        },
      ]),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Body ws:id="body">
          <ws.collection
            ws:id="list"
            data={new ExpressionValue("$ws$dataSource$dataSourceList")}
            item={new ParameterValue("dataSourceItem")}
          ></ws.collection>
        </$.Body>
      ),
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
      dataSources: toMap([
        {
          id: "systemId",
          scopeInstanceId: "body",
          type: "parameter",
          name: "system",
        },
      ]),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Body
          ws:id="body"
          data-slug={new ExpressionValue("$ws$dataSource$systemId.params.slug")}
        ></$.Body>
      ),
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
      dataSources: toMap([
        {
          id: "dataSourceDataId",
          scopeInstanceId: "body",
          type: "variable",
          name: "data",
          value: { type: "json", value: "data" },
        },
        {
          id: "dataSourceResourceId",
          scopeInstanceId: "body",
          type: "resource",
          name: "data",
          resourceId: "resourceId",
        },
      ]),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Body
          ws:id="body"
          data-data={new ExpressionValue("$ws$dataSource$dataSourceDataId")}
          data-resource={
            new ExpressionValue("$ws$dataSource$dataSourceResourceId")
          }
        ></$.Body>
      ),
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
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Body
          ws:id="body"
          data-data={new ExpressionValue("$ws$dataSource$usedVariableId")}
        ></$.Body>
      ),
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

test("avoid generating descendant component", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Body ws:id="body">
          <ws.descendant></ws.descendant>
        </$.Body>
      ),
    })
  ).toMatchInlineSnapshot(`
"const Page = () => {
return <Body
data-ws-id="body"
data-ws-component="Body">
</Body>
}
"
`);
});

test("generate conditional collection", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      dataSources: toMap<DataSource>([
        {
          id: "conditionId",
          scopeInstanceId: "list",
          name: "conditionName",
          type: "variable",
          value: { type: "boolean", value: false },
        },
        {
          id: "collectionItemId",
          scopeInstanceId: "list",
          name: "collectionItemName",
          type: "parameter",
        },
      ]),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Body ws:id="body">
          <ws.collection
            ws:id="list"
            data-ws-show={new ExpressionValue("$ws$dataSource$conditionId")}
            data={[]}
            item={new ParameterValue("collectionItemId")}
          ></ws.collection>
        </$.Body>
      ),
    })
  ).toMatchInlineSnapshot(`
    "const Page = () => {
    let [conditionName, set$conditionName] = useState<any>(false)
    return <Body
    data-ws-id="body"
    data-ws-component="Body">
    {(conditionName) &&
    <>
    {[]?.map((collectionItemName: any, index: number) =>
    <Fragment key={index}>
    </Fragment>
    )}
    </>
    }
    </Body>
    }
    "
    `);
});
