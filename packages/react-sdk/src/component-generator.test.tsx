import ts from "typescript";
import { expect, test } from "vitest";
import stripIndent from "strip-indent";
import {
  createScope,
  ROOT_INSTANCE_ID,
  SYSTEM_VARIABLE_ID,
  WsComponentMeta,
} from "@webstudio-is/sdk";
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
    {data?.map?.((element: any, index: number) =>
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
      metas: new Map(),
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
      metas: new Map(),
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
      metas: new Map(),
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
      metas: new Map(),
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
      metas: new Map(),
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
      metas: new Map(),
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
    {data?.map?.((element: any, index: number) =>
    <Fragment key={index}>
    </Fragment>
    )}
    </Body>
    }
    `)
    )
  );
});

test("generate both page system and global system variables when present", () => {
  const system = new Parameter("system");
  const data = renderData(
    <$.Body
      ws:id="body"
      data-page={expression`${system}.params.slug`}
      data-global={expression`$ws$system.params.slug`}
    ></$.Body>
  );
  expect(data.dataSources.size).toEqual(1);
  const [pageSystemVariableId] = data.dataSources.keys();
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(["system"]),
      name: "Page",
      rootInstanceId: "body",
      parameters: [
        {
          id: "pathSystemPropId1",
          type: "parameter",
          instanceId: "",
          name: "system",
          value: pageSystemVariableId,
        },
        {
          id: "pathSystemPropId2",
          type: "parameter",
          instanceId: "",
          name: "system",
          value: SYSTEM_VARIABLE_ID,
        },
      ],
      metas: new Map(),
      ...data,
    })
  ).toEqual(
    validateJSX(
      clear(`
    const Page = (_props: { system: any; }) => {
    const system_1 = _props.system;
    const system_2 = _props.system;
    return <Body
    data-page={system_1?.params?.slug}
    data-global={system_2?.params?.slug} />
    }
    `)
    )
  );
});

test("generate resources loading", () => {
  const dataVariable = new Variable("data", "data");
  const dataResource = new ResourceValue("data", {
    url: expression`""`,
    method: "get",
    headers: [],
  });
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      metas: new Map(),
      ...renderData(
        <$.Body
          ws:id="body"
          data-data={expression`${dataVariable}`}
          data-resource={expression`${dataResource}`}
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
  const usedVariable = new Variable("Used Variable Name", "initial");
  const unusedVariable = new Variable("Unused Variable Name", "initial");
  const unusedParameter = new Parameter("Unused Parameter Name");
  const unusedResource = new ResourceValue("Unused Resource Name", {
    url: expression`""`,
    method: "get",
    headers: [],
  });
  const data = renderData(
    <$.Body
      ws:id="body"
      data-used={expression`${usedVariable}`}
      data-unused={expression`${unusedVariable} ${unusedParameter} ${unusedResource}`}
    ></$.Body>
  );
  expect(Array.from(data.props.values())).toEqual([
    expect.objectContaining({ name: "data-used" }),
    expect.objectContaining({ name: "data-unused" }),
  ]);
  // make variables unused
  data.props.delete(Array.from(data.props.values())[1].id);
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
      metas: new Map(),
      ...data,
    })
  ).toMatchInlineSnapshot(`
"const Page = (_props: { system: any; }) => {
let [UsedVariableName, set$UsedVariableName] = useVariableState<any>("initial")
return <Body
data-used={UsedVariableName} />
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
      metas: new Map(),
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
      metas: new Map(),
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
{[]?.map?.((collectionItem: any, index: number) =>
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
      metas: new Map(),
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
  const myResource = new ResourceValue("myResource", {
    url: expression`"https://my-url.com?with-secret"`,
    method: "get",
    headers: [],
  });
  const anotherResource = new ResourceValue("anotherResource", {
    url: expression`"https://another-url.com?with-secret"`,
    method: "get",
    headers: [],
  });
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      metas: new Map(),
      ...renderData(
        <$.Body ws:id="body">
          <$.Form ws:id="form1" action={myResource}></$.Form>
          <$.Form ws:id="form2" action={anotherResource}></$.Form>
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
      metas: new Map(),
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
      metas: new Map(),
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
      metas: new Map(),
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
      metas: new Map(),
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
      metas: new Map(),
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

test("generate global variables", () => {
  const rootVariable = new Variable("rootVariable", "root");
  const data = renderData(
    <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${rootVariable}`}>
      <$.Body ws:id="body">
        <$.Box>{expression`${rootVariable}`}</$.Box>
      </$.Body>
    </ws.root>
  );
  data.instances.delete(ROOT_INSTANCE_ID);
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      metas: new Map(),
      ...data,
    })
  ).toEqual(
    validateJSX(
      clear(`
      const Page = () => {
      let [rootVariable, set$rootVariable] = useVariableState<any>("root")
      return <Body>
      <Box>
      {rootVariable}
      </Box>
      </Body>
      }
    `)
    )
  );
});

test("ignore unused global variables", () => {
  const rootVariable = new Variable("rootVariable", "root");
  const data = renderData(
    <ws.root ws:id={ROOT_INSTANCE_ID} vars={expression`${rootVariable}`}>
      <$.Body ws:id="body">
        <$.Box></$.Box>
      </$.Body>
    </ws.root>
  );
  data.instances.delete(ROOT_INSTANCE_ID);
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      metas: new Map(),
      ...data,
    })
  ).toEqual(
    validateJSX(
      clear(`
      const Page = () => {
      return <Body>
      <Box />
      </Body>
      }
    `)
    )
  );
});

test("generate prop with index within ancestor", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "body",
      parameters: [],
      metas: new Map<string, WsComponentMeta>([
        [
          "TabsTrigger",
          { type: "container", icon: "", indexWithinAncestor: "Tabs" },
        ],
        [
          "TabsContent",
          { type: "container", icon: "", indexWithinAncestor: "Tabs" },
        ],
      ]),
      ...renderData(
        <$.Body ws:id="body">
          <$.Tabs>
            <$.TabsList>
              <$.TabsTrigger></$.TabsTrigger>
              <$.Box>
                <$.TabsTrigger></$.TabsTrigger>
              </$.Box>
            </$.TabsList>
            <$.Box>
              <$.TabsContent></$.TabsContent>
            </$.Box>
            <$.TabsContent></$.TabsContent>
          </$.Tabs>
        </$.Body>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
      const Page = () => {
      return <Body>
      <Tabs>
      <TabsList>
      <TabsTrigger
      data-ws-index="0" />
      <Box>
      <TabsTrigger
      data-ws-index="1" />
      </Box>
      </TabsList>
      <Box>
      <TabsContent
      data-ws-index="0" />
      </Box>
      <TabsContent
      data-ws-index="1" />
      </Tabs>
      </Body>
      }
    `)
    )
  );
});

test("ignore ws:block-template when generate index attribute", () => {
  const BlockTemplate = ws["block-template"];
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "bodyId",
      parameters: [],
      metas: new Map<string, WsComponentMeta>([
        [
          "TabsTrigger",
          { type: "container", icon: "", indexWithinAncestor: "Tabs" },
        ],
      ]),
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Tabs>
            <BlockTemplate>
              <$.TabsTrigger></$.TabsTrigger>
            </BlockTemplate>
            <$.Box>
              <$.TabsTrigger></$.TabsTrigger>
            </$.Box>
            <$.TabsTrigger></$.TabsTrigger>
          </$.Tabs>
        </$.Body>
      ),
    })
  ).toEqual(
    validateJSX(
      clear(`
      const Page = () => {
      return <Body>
      <Tabs>
      <Box>
      <TabsTrigger
      data-ws-index="0" />
      </Box>
      <TabsTrigger
      data-ws-index="1" />
      </Tabs>
      </Body>
      }
    `)
    )
  );
});

test("render empty component when no instances found", () => {
  expect(
    generateWebstudioComponent({
      classesMap: new Map(),
      scope: createScope(),
      name: "Page",
      rootInstanceId: "",
      parameters: [],
      metas: new Map(),
      ...renderData(<$.Body ws:id="bodyId"></$.Body>),
    })
  ).toEqual(
    validateJSX(
      clear(`
      const Page = () => {
      return <></>
      }
    `)
    )
  );
});
