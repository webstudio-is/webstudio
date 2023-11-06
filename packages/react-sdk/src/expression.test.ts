import { expect, test } from "@jest/globals";
import {
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  computeExpressionsDependencies,
  validateExpression,
  generateDataSources,
} from "./expression";
import { createScope } from "@webstudio-is/sdk";

test("allow literals and array expressions", () => {
  expect(
    validateExpression(`["", '', 0, true, false, null, undefined]`)
  ).toEqual(`["", '', 0, true, false, null, undefined]`);
});

test("allow unary and binary expressions", () => {
  expect(validateExpression(`[-1, 1 + 1]`)).toEqual(`[-1, 1 + 1]`);
});

test("optionally allow assignment expressions", () => {
  expect(() => {
    validateExpression(`a = 2`);
  }).toThrowError(/Cannot use assignment in this expression/);
  expect(validateExpression(`a = 2`, { effectful: true })).toEqual(`a = 2`);
});

test("forbid member expressions", () => {
  expect(() => {
    validateExpression("var1 + obj.param");
  }).toThrowError(/Cannot access "param" of "obj"/);
});

test("forbid this expressions", () => {
  expect(() => {
    validateExpression("var1 + this");
  }).toThrowError(/"this" is not supported/);
});

test("forbid call expressions", () => {
  expect(() => {
    validateExpression("var1 + fn1()");
  }).toThrowError(/Cannot call "fn1"/);
  expect(() => {
    validateExpression("var1 + this.fn1()");
  }).toThrowError(/Cannot call "this.fn1"/);
});

test("forbid ternary", () => {
  expect(() => {
    validateExpression("var1 ? var2 : var3");
  }).toThrowError(/Ternary operator is not supported/);
});

test("forbid increment and decrement", () => {
  expect(() => {
    validateExpression("++var1");
  }).toThrowError(/"\+\+" operator is not supported/);
  expect(() => {
    validateExpression("var1++");
  }).toThrowError(/"\+\+" operator is not supported/);
  expect(() => {
    validateExpression("--var1");
  }).toThrowError(/"--" operator is not supported/);
  expect(() => {
    validateExpression("var1--");
  }).toThrowError(/"--" operator is not supported/);
});

test("forbid multiple expressions", () => {
  expect(() => {
    validateExpression("a b");
  }).toThrowError(/Cannot use multiple expressions/);
  expect(() => {
    validateExpression("a, b");
  }).toThrowError(/Cannot use multiple expressions/);
  expect(() => {
    validateExpression("a; b");
  }).toThrowError(/Cannot use multiple expressions/);
});

test("transform identifiers", () => {
  expect(
    validateExpression(`a + b`, {
      transformIdentifier: (id) => `$ws$${id}`,
    })
  ).toEqual(`$ws$a + $ws$b`);
});

test("encode/decode variable names", () => {
  expect(encodeDataSourceVariable("my--id")).toEqual(
    "$ws$dataSource$my__DASH____DASH__id"
  );
  expect(decodeDataSourceVariable(encodeDataSourceVariable("my--id"))).toEqual(
    "my--id"
  );
  expect(decodeDataSourceVariable("myVarName")).toEqual(undefined);
});

test("compute expressions dependencies", () => {
  const expressions = new Map([
    ["exp1", `var1`],
    ["exp2", `exp1 + exp1`],
    ["exp3", `exp1 + exp2`],
    ["exp4", `var1 + exp1`],
  ]);
  expect(computeExpressionsDependencies(expressions)).toEqual(
    new Map([
      ["exp4", new Set(["var1", "exp1"])],
      ["exp3", new Set(["var1", "exp1", "exp2"])],
      ["exp2", new Set(["var1", "exp1"])],
      ["exp1", new Set(["var1"])],
    ])
  );
});

test("handle cyclic dependencies", () => {
  const expressions = new Map([
    ["exp1", `exp2 + var1`],
    ["exp2", `exp1 + var1`],
  ]);
  expect(computeExpressionsDependencies(expressions)).toEqual(
    new Map([
      ["exp2", new Set(["var1", "exp1", "exp2"])],
      ["exp1", new Set(["var1", "exp1", "exp2"])],
    ])
  );
});

test("generate variables with actions", () => {
  const generated = generateDataSources({
    scope: createScope(),
    dataSources: new Map([
      [
        "dataSource1",
        {
          id: "dataSource1",
          scopeInstanceId: "instance1",
          type: "variable",
          name: "myVar",
          value: { type: "string", value: "initial" },
        },
      ],
      [
        "dataSource2",
        {
          id: "dataSource2",
          scopeInstanceId: "instance1",
          type: "variable",
          name: "myVar",
          value: { type: "string", value: "initial" },
        },
      ],
    ]),
    props: new Map([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          type: "action",
          name: "onChange",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `$ws$dataSource$dataSource1 = value`,
            },
            {
              type: "execute",
              args: ["value"],
              code: `$ws$dataSource$dataSource1 = 'success'`,
            },
          ],
        },
      ],
      [
        "prop2",
        {
          id: "prop2",
          instanceId: "instance1",
          type: "action",
          name: "onSelect",
          value: [
            {
              type: "execute",
              args: [],
              code: `$ws$dataSource$dataSource2 = 'error'`,
            },
          ],
        },
      ],
    ]),
  });
  expect(generated.body).toMatchInlineSnapshot(`
    "let onChange = (value) => {
    myVar = value
    myVar = 'success'
    set$myVar(myVar)
    }
    let onSelect = () => {
    myVar_1 = 'error'
    set$myVar_1(myVar_1)
    }
    "
  `);
  expect(generated.variables).toEqual(
    new Map([
      [
        "dataSource1",
        {
          initialValue: "initial",
          setterName: "set$myVar",
          valueName: "myVar",
        },
      ],
      [
        "dataSource2",
        {
          initialValue: "initial",
          setterName: "set$myVar_1",
          valueName: "myVar_1",
        },
      ],
    ])
  );
  expect(generated.output).toEqual(
    new Map([
      ["dataSource1", "myVar"],
      ["dataSource2", "myVar_1"],
      ["prop1", "onChange"],
      ["prop2", "onSelect"],
    ])
  );
});

test("generate variables with expressions", () => {
  const generated = generateDataSources({
    scope: createScope(),
    dataSources: new Map([
      [
        "dataSource1",
        {
          id: "dataSource1",
          scopeInstanceId: "instance1",
          type: "variable",
          name: "myVar",
          value: { type: "string", value: "initial" },
        },
      ],
      [
        "dataSource2",
        {
          id: "dataSource2",
          scopeInstanceId: "instance1",
          type: "expression",
          name: "myExp",
          code: `$ws$dataSource$dataSource1 + "Name"`,
        },
      ],
      [
        "dataSource3",
        {
          id: "dataSource3",
          scopeInstanceId: "instance1",
          type: "expression",
          name: "myExp",
          code: `$ws$dataSource$dataSource1 + "Value"`,
        },
      ],
    ]),
    props: new Map([
      [
        "prop1",
        {
          id: "prop1",
          instanceId: "instance1",
          type: "dataSource",
          name: "exp",
          value: "dataSource2",
        },
      ],
      [
        "prop2",
        {
          id: "prop2",
          instanceId: "instance2",
          type: "dataSource",
          name: "exp",
          value: "dataSource3",
        },
      ],
    ]),
  });
  expect(generated.body).toMatchInlineSnapshot(`
"let exp = (myVar + "Name");
let exp_1 = (myVar + "Value");
"
`);
  expect(generated.variables).toEqual(
    new Map([
      [
        "dataSource1",
        {
          initialValue: "initial",
          setterName: "set$myVar",
          valueName: "myVar",
        },
      ],
    ])
  );
  expect(generated.output).toEqual(
    new Map([
      ["dataSource1", "myVar"],
      ["prop1", "exp"],
      ["prop2", "exp_1"],
    ])
  );
});
