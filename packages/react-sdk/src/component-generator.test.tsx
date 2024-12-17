import ts from "typescript";
import { expect, test } from "vitest";
import stripIndent from "strip-indent";
import { createScope, type DataSource } from "@webstudio-is/sdk";
import {
  $,
  ActionValue,
  AssetValue,
  ExpressionValue,
  PageValue,
  ParameterValue,
  ResourceValue,
  createProxy,
  renderJsx,
  ws,
} from "@webstudio-is/template";
import {
  generateJsxChildren,
  generateWebstudioComponent,
} from "./component-generator";

const isValidJSX = (code: string): boolean => {
  // Create a "virtual" TypeScript program
  const compilerHost = ts.createCompilerHost({});
  const fileName = "virtual.tsx";

  compilerHost.getSourceFile = (filename) => {
    if (filename === fileName) {
      return ts.createSourceFile(
        filename,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );
    }
    return undefined;
  };

  const program = ts.createProgram(
    [fileName],
    {
      jsx: ts.JsxEmit.React,
      strict: true,
    },
    compilerHost
  );

  const sourceFile = program.getSourceFile(fileName);

  if (!sourceFile) {
    return false;
  }

  const diagnostics = [
    ...program.getSyntacticDiagnostics(sourceFile),
    // ...program.getSemanticDiagnostics(sourceFile),
  ];

  return diagnostics.length === 0;
};

const validateJSX = (code: string) => {
  expect(isValidJSX(code)).toBeTruthy();
  return code;
};

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
    validateJSX(
      clear(`
      <Body>
      {"Children"}
      </Body>
    `)
    )
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
    validateJSX(
      clear(`
      <Image />
    `)
    )
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
    validateJSX(
      clear(`
      <Body />
    `)
    )
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
    validateJSX(
      clear(`
      <Image />
    `)
    )
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
    validateJSX(
      clear(`
      <Body
      string={"string"}
      number={0} />
    `)
    )
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
    validateJSX(
      clear(`
      <Image
      boolean={true}
      stringArray={["value1","value2"]} />
    `)
    )
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
    validateJSX(
      clear(`
      <Box />
    `)
    )
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
    validateJSX(
      clear(`
      <Box
      variable={variableName}
      expression={variableName + 1}
      onChange={(value: any) => {
      variableName = value
      set$variableName(variableName)
      }} />
    `)
    )
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
    validateJSX(
      clear(`
      <Box />
    `)
    )
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
    validateJSX(
      clear(`
      {(conditionName) &&
      <Box />
      }
    `)
    )
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
    validateJSX(
      clear(`
      <Box
      data-ws-index="5" />
    `)
    )
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
    validateJSX(
      clear(`
      {"Some"}
      <br />
      {"text"}
      {"Escaped \\"text\\""}
    `)
    )
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
    validateJSX(
      clear(`
      {"Text"}
    `)
    )
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
    validateJSX(
      clear(`
      {'Hello ' + myvar}
    `)
    )
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
    validateJSX(
      clear(`
    <Form
    prop={"value"}>
    <Input />
    <Button />
    </Form>
    `)
    )
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
    <Button />
    <Button_1 />
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
    validateJSX(
      clear(`
    {data?.map((element: any, index: number) =>
    <Fragment key={index}>
    <Label />
    <Button
    aria-label={element} />
    </Fragment>
    )}
    `)
    )
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
    validateJSX(
      clear(`
      const Page = () => {
      let [variableName, set$variableName] = useVariableState<any>("initial")
      return <Body>
      <Input
      value={variableName}
      onChange={(value: any) => {
      variableName = value
      set$variableName(variableName)
      }} />
      </Body>
      }
    `)
    )
  );
});

test("merge classes if no className", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map([["body", ["cls1"]]]),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderJsx(<$.Body ws:id="body"></$.Body>),
    })
  ).toEqual(
    validateJSX(
      clear(`
        const Page = () => {
        return <Body
        className={"cls1"} />
        }
    `)
    )
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
    validateJSX(
      clear(`
        const Page = () => {
        return <Body
        className={"cls1" + " " + "cls2 \\"cls3\\""} />
        }
    `)
    )
  );
});

test("add classes", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderJsx(<$.Body ws:id="body" className='cls2 "cls3"'></$.Body>),
    })
  ).toEqual(
    validateJSX(
      clear(`
        const Page = () => {
        return <Body
        className={"cls2 \\"cls3\\""} />
        }
    `)
    )
  );
});

test("add bind classes and merge classes", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map([["body", ["cls1"]]]),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      dataSources: toMap([
        {
          type: "variable",
          id: "variableId",
          name: "variableName",
          value: { type: "string", value: "cls3" },
        },
      ]),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Body
          ws:id="body"
          className={
            new ExpressionValue(`'cls2' + ' ' + $ws$dataSource$variableId`)
          }
        ></$.Body>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
        const Page = () => {
        let [variableName, set$variableName] = useVariableState<any>("cls3")
        return <Body
        className={"cls1" + " " + 'cls2' + ' ' + variableName} />
        }
    `)
    )
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
    validateJSX(
      clear(`
    const Page = () => {
    let [data, set$data] = useVariableState<any>(["apple","orange","mango"])
    return <Body>
    {data?.map((element: any, index: number) =>
    <Fragment key={index}>
    </Fragment>
    )}
    </Body>
    }
    `)
    )
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
    validateJSX(
      clear(`
    const Page = ({ system: system_1, }: { system: any; }) => {
    return <Body
    data-slug={system_1?.params?.slug} />
    }
    `)
    )
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
    validateJSX(
      clear(`
    const Page = () => {
    let [data, set$data] = useVariableState<any>("data")
    let data_1 = useResource("data_2")
    return <Body
    data-data={data}
    data-resource={data_1} />
    }
    `)
    )
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
let [UsedVariableName, set$UsedVariableName] = useVariableState<any>("initial")
return <Body
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
return <Body>
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
let [conditionName, set$conditionName] = useVariableState<any>(false)
return <Body>
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

test("generate conditional body", () => {
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
      ]),
      indexesWithinAncestors: new Map(),
      ...renderJsx(
        <$.Body
          ws:id="body"
          data-ws-show={new ExpressionValue("$ws$dataSource$conditionId")}
        ></$.Body>
      ),
    })
  ).toMatchInlineSnapshot(`
"const Page = () => {
let [conditionName, set$conditionName] = useVariableState<any>(false)
return (conditionName) &&
<Body />

}
"
`);
});

test("generate resource prop", () => {
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
          <$.Form
            ws:id="form1"
            action={new ResourceValue("https://my-url.com?with-secret")}
          ></$.Form>
          <$.Form
            ws:id="form2"
            action={new ResourceValue("https://another-url.com?with-secret")}
          ></$.Form>
        </$.Body>
      ),
    })
  ).toMatchInlineSnapshot(`
    "const Page = () => {
    return <Body>
    <Form
    action={"action"} />
    <Form
    action={"action_1"} />
    </Body>
    }
    "
  `);
});

test("skip unsafe properties", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      dataSources: new Map(),
      indexesWithinAncestors: new Map(),

      instances: toMap([
        { type: "instance", id: "body", component: "Body", children: [] },
      ]),
      props: toMap([
        {
          id: "unsafeProp",
          instanceId: "body",
          name: "",
          type: "string",
          value: "unsafe",
        },

        {
          id: "unsafeProp-2",
          instanceId: "body",
          name: "1-numeric-unsafe",
          type: "string",
          value: "unsafe",
        },

        {
          id: "unsafeProp-3",
          instanceId: "body",
          name: "click.prevent",
          type: "string",
          value: "unsafe",
        },
      ]),
    })
  ).toEqual(
    validateJSX(
      clear(`
        const Page = () => {
        return <Body />
        }
    `)
    )
  );
});

test("variable names can be js identifiers", () => {
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
          name: "switch",
          value: { type: "string", value: "initial" },
        },
      ]),
      indexesWithinAncestors: new Map(),
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
    validateJSX(
      clear(`
      const Page = () => {
      let [switch_, set$switch] = useVariableState<any>("initial")
      return <Body>
      <Input
      value={switch_}
      onChange={(value: any) => {
      switch_ = value
      set$switch(switch_)
      }} />
      </Body>
      }
    `)
    )
  );
});

test("Renders nothing if only templates are present in block", () => {
  const Bt = ws["block-template"];

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
          <ws.block ws:id="block">
            <Bt>
              <$.Box>Test</$.Box>
            </Bt>
          </ws.block>
        </$.Body>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
      const Page = () => {
      return <Body>
      </Body>
      }
    `)
    )
  );
});

test("Renders only block children", () => {
  const Bt = ws["block-template"];

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
          <ws.block ws:id="block">
            <Bt>
              <$.Box>Test</$.Box>
            </Bt>
            <$.Box>Child0</$.Box>
          </ws.block>
        </$.Body>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
      const Page = () => {
      return <Body>
      <Box>
      {"Child0"}
      </Box>
      </Body>
      }
    `)
    )
  );
});
