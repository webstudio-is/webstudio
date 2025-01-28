import ts from "typescript";
import { expect, test } from "vitest";
import stripIndent from "strip-indent";
import { createScope } from "@webstudio-is/sdk";
import {
  $,
  ActionValue,
  AssetValue,
  PageValue,
  Parameter,
  ResourceValue,
  Variable,
  createProxy,
  expression,
  renderData,
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "body" }],
      ...renderData(<$.Body ws:id="body">Children</$.Body>),
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "image" }],
      ...renderData(<$.Image ws:id="image"></$.Image>),
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "body" }],
      ...renderData(<library.Body ws:id="body"></library.Body>),
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "image" }],
      ...renderData(<library.Image ws:id="image"></library.Image>),
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "body" }],
      ...renderData(<$.Body ws:id="body" string="string" number={0}></$.Body>),
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "image" }],
      ...renderData(
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderData(
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
  const variable = new Variable("variable", 0);
  expect(
    generateJsxChildren({
      scope: createScope(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderData(
        <$.Box
          ws:id="box"
          variable={expression`${variable}`}
          expression={expression`${variable} + 1`}
          onChange={new ActionValue(["value"], expression`${variable} = value`)}
        ></$.Box>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
      <Box
      variable={variable}
      expression={variable + 1}
      onChange={(value: any) => {
      variable = value
      set$variable(variable)
      }} />
    `)
    )
  );
});

test("generate jsx element with condition based on show prop", () => {
  expect(
    generateJsxChildren({
      scope: createScope(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderData(<$.Box ws:id="box" data-ws-show={true}></$.Box>),
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderData(<$.Box ws:id="box" data-ws-show={false}></$.Box>),
    })
  ).toEqual("");
  const condition = new Variable("condition", false);
  expect(
    generateJsxChildren({
      scope: createScope(),
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      children: [{ type: "id", value: "box" }],
      ...renderData(
        <$.Box ws:id="box" data-ws-show={expression`${condition}`}></$.Box>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
      {(condition) &&
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map([["box", 5]]),
      children: [{ type: "id", value: "box" }],
      ...renderData(<$.Box ws:id="box"></$.Box>),
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderData(
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
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderData(
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
  const data = new Variable("data", ["apple", "orange", "mango"]);
  const element = new Parameter("element");
  expect(
    generateJsxChildren({
      scope: createScope(),
      children: [{ type: "id", value: "list" }],
      usedDataSources: new Map(),
      indexesWithinAncestors: new Map(),
      ...renderData(
        <ws.collection ws:id="list" data={expression`${data}`} item={element}>
          <$.Label></$.Label>
          <$.Button aria-label={expression`${element}`}></$.Button>
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
  const variable = new Variable("variable", "initial");
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      indexesWithinAncestors: new Map([["input", 0]]),
      ...renderData(
        <$.Body ws:id="body">
          <$.Input
            value={expression`${variable}`}
            onChange={
              new ActionValue(["value"], expression`${variable} = value`)
            }
          />
        </$.Body>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
      const Page = () => {
      let [variable, set$variable] = useVariableState<any>("initial")
      return <Body>
      <Input
      value={variable}
      onChange={(value: any) => {
      variable = value
      set$variable(variable)
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
      indexesWithinAncestors: new Map(),
      ...renderData(<$.Body ws:id="body"></$.Body>),
    })
  ).toEqual(
    validateJSX(
      clear(`
        const Page = () => {
        return <Body
        className={\`cls1\`} />
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
      indexesWithinAncestors: new Map(),
      ...renderData(<$.Body ws:id="body" className='cls2 "cls3"'></$.Body>),
    })
  ).toEqual(
    validateJSX(
      clear(`
        const Page = () => {
        return <Body
        className={\`cls1 \${"cls2 \\"cls3\\""}\`} />
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
      indexesWithinAncestors: new Map(),
      ...renderData(<$.Body ws:id="body" className='cls2 "cls3"'></$.Body>),
    })
  ).toEqual(
    validateJSX(
      clear(`
        const Page = () => {
        return <Body
        className={\`\${"cls2 \\"cls3\\""}\`} />
        }
    `)
    )
  );
});

test("add bind classes and merge classes", () => {
  const hasClass2 = new Variable("variableName", false);
  expect(
    generateWebstudioComponent({
      classesMap: new Map([["body", ["cls1"]]]),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body
          ws:id="body"
          className={expression`${hasClass2} ? 'cls2' : ''`}
        ></$.Body>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
        const Page = () => {
        let [variableName, set$variableName] = useVariableState<any>(false)
        return <Body
        className={\`cls1 \${variableName ? 'cls2' : ''}\`} />
        }
    `)
    )
  );
});

test("avoid generating collection parameter variable as state", () => {
  const data = new Variable("data", ["apple", "orange", "mango"]);
  const element = new Parameter("element");
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body ws:id="body">
          <ws.collection
            ws:id="list"
            data={expression`${data}`}
            item={element}
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
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body
          ws:id="body"
          data-slug={expression`$ws$dataSource$systemId.params.slug`}
        ></$.Body>
      ),
      dataSources: toMap([
        {
          id: "systemId",
          scopeInstanceId: "body",
          type: "parameter",
          name: "system",
        },
      ]),
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
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body
          ws:id="body"
          data-data={expression`$ws$dataSource$dataSourceDataId`}
          data-resource={expression`$ws$dataSource$dataSourceResourceId`}
        ></$.Body>
      ),
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
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body
          ws:id="body"
          data-data={expression`$ws$dataSource$usedVariableId`}
        ></$.Body>
      ),
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
      indexesWithinAncestors: new Map(),
      ...renderData(
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
  const condition = new Variable("condition", false);
  const collectionItem = new Parameter("collectionItem");
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body ws:id="body">
          <ws.collection
            ws:id="list"
            data-ws-show={expression`${condition}`}
            data={[]}
            item={collectionItem}
          ></ws.collection>
        </$.Body>
      ),
    })
  ).toMatchInlineSnapshot(`
"const Page = () => {
let [condition, set$condition] = useVariableState<any>(false)
return <Body>
{(condition) &&
<>
{[]?.map((collectionItem: any, index: number) =>
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
  const condition = new Variable("condition", false);
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body ws:id="body" data-ws-show={expression`${condition}`}></$.Body>
      ),
    })
  ).toMatchInlineSnapshot(`
"const Page = () => {
let [condition, set$condition] = useVariableState<any>(false)
return (condition) &&
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
      indexesWithinAncestors: new Map(),
      ...renderData(
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
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body
          ws:id="body"
          {...{
            "": "unsafe",
            "1-numeric-unsafe": "unsafe",
            "click.prevent": "unsafe",
          }}
        ></$.Body>
      ),
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
  const variable = new Variable("switch", "initial");
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body ws:id="body">
          <$.Input
            value={expression`${variable}`}
            onChange={
              new ActionValue(["value"], expression`${variable} = value`)
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

test("renders nothing if only templates are present in block", () => {
  const BlockTemplate = ws["block-template"];
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body ws:id="body">
          <ws.block ws:id="block">
            <BlockTemplate>
              <$.Box>Test</$.Box>
            </BlockTemplate>
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

test("renders only block children", () => {
  const BlockTemplate = ws["block-template"];

  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body ws:id="body">
          <ws.block ws:id="block">
            <BlockTemplate>
              <$.Box>Test</$.Box>
            </BlockTemplate>
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

test("generate unset variables as undefined", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      indexesWithinAncestors: new Map(),
      ...renderData(
        <$.Body ws:id="body">
          <$.Box>{expression`a + b`}</$.Box>
        </$.Body>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
      const Page = () => {
      return <Body>
      <Box>
      {undefined + undefined}
      </Box>
      </Body>
      }
    `)
    )
  );
});
