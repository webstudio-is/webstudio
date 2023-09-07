import { expect, test } from "@jest/globals";
import stripIndent from "strip-indent";
import { createScope, type Instance, type Prop } from "@webstudio-is/sdk";
import { showAttribute } from "./tree/webstudio-component";
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

test("generate jsx element with children and without them", () => {
  expect(
    generateJsxElement({
      scope: createScope(),
      instance: createInstance("body", "Body", [
        { type: "id", value: "childId" },
      ]),
      props: new Map(),
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
          type: "dataSource",
          name: "variable",
          value: "variableId",
        }),
        createPropPair({
          id: "2",
          instanceId: "box",
          type: "dataSource",
          name: "expression",
          value: "expressionId",
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
      indexesWithinAncestors: new Map(),
      children: "",
    })
  ).toEqual(
    clear(`
      <Box
      data-ws-id="box"
      data-ws-component="Box"
      variable={$ws$dataSource$variableId}
      expression={$ws$dataSource$expressionId}
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
          type: "dataSource",
          name: showAttribute,
          value: "condition",
        }),
      ]),
      indexesWithinAncestors: new Map(),
      children: "",
    })
  ).toEqual(
    clear(`
      {$ws$dataSource$condition &&
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

test("generate page component", () => {
  expect(
    generatePageComponent({
      scope: createScope(),
      rootInstanceId: "body",
      instances: new Map([
        createInstancePair("body", "Body", [{ type: "id", value: "input" }]),
        createInstancePair("input", "Input", []),
      ]),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "input",
          name: "value",
          type: "dataSource",
          value: "variable",
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
              code: `$ws$dataSource$variable = value`,
            },
          ],
        }),
      ]),
      indexesWithinAncestors: new Map([["input", 0]]),
    })
  ).toEqual(
    clear(`
      export const Page = (props: { scripts: ReactNode }) => {
      const { dataSourceValuesStore, setDataSourceValues, executeEffectfulExpression } = useContext(ReactSdkContext);
      const dataSourceValues = useStore(dataSourceValuesStore);
      const $ws$dataSource$variable = dataSourceValues.get("variable");
      const onChange = (value: unknown) => {
      const newValues = executeEffectfulExpression(
      value.code,
      new Map([["value", value]]),
      dataSourceValues
      );
      setDataSourceValues(newValues);
      };
      return <Body
      data-ws-id="body"
      data-ws-component="Body">
      <Input
      data-ws-id="input"
      data-ws-component="Input"
      data-ws-index="0"
      value={$ws$dataSource$variable}
      onChange={onChange} />
      {props.scripts}
      </Body>
      };
    `)
  );
});

test("deduplicate action names", () => {
  expect(
    generatePageComponent({
      scope: createScope(),
      rootInstanceId: "body",
      instances: new Map([
        createInstancePair("body", "Body", [
          { type: "id", value: "button1" },
          { type: "id", value: "button2" },
        ]),
        createInstancePair("button1", "Button", []),
        createInstancePair("button2", "Button", []),
      ]),
      props: new Map([
        createPropPair({
          id: "1",
          instanceId: "button1",
          name: "onChange",
          type: "action",
          value: [{ type: "execute", args: [], code: "" }],
        }),
        createPropPair({
          id: "2",
          instanceId: "button2",
          name: "onChange",
          type: "action",
          value: [{ type: "execute", args: [], code: "" }],
        }),
      ]),
      indexesWithinAncestors: new Map([["input", 0]]),
    })
  ).toEqual(
    clear(`
      export const Page = (props: { scripts: ReactNode }) => {
      const { dataSourceValuesStore, setDataSourceValues, executeEffectfulExpression } = useContext(ReactSdkContext);
      const dataSourceValues = useStore(dataSourceValuesStore);
      const onChange = () => {
      const newValues = executeEffectfulExpression(
      value.code,
      new Map([]),
      dataSourceValues
      );
      setDataSourceValues(newValues);
      };
      const onChange_1 = () => {
      const newValues = executeEffectfulExpression(
      value.code,
      new Map([]),
      dataSourceValues
      );
      setDataSourceValues(newValues);
      };
      return <Body
      data-ws-id="body"
      data-ws-component="Body">
      <Button
      data-ws-id="button1"
      data-ws-component="Button"
      onChange={onChange} />
      <Button
      data-ws-id="button2"
      data-ws-component="Button"
      onChange={onChange_1} />
      {props.scripts}
      </Body>
      };
    `)
  );
});
