import { expect, test } from "@jest/globals";
import {
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  executeComputingExpressions,
  executeEffectfulExpression,
  computeExpressionsDependencies,
  generateComputingExpressions,
  generateEffectfulExpression,
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

test("generate computing expressions", () => {
  const variables = new Set(["var0"]);
  const expressions = new Map([
    ["exp3", "exp2 + exp1"],
    ["exp1", "var0"],
    ["exp2", "exp1"],
    ["exp4", "exp2"],
  ]);
  expect(generateComputingExpressions(expressions, variables))
    .toMatchInlineSnapshot(`
    "const var0 = _variables.get('var0');
    const exp1 = (var0);
    const exp2 = (exp1);
    const exp3 = (exp2 + exp1);
    const exp4 = (exp2);
    return new Map([
      ['exp1', exp1],
      ['exp2', exp2],
      ['exp3', exp3],
      ['exp4', exp4],
    ]);"
  `);
});

test("add only used variables in computing expression", () => {
  const expressions = new Map([["exp1", "var0"]]);
  expect(generateComputingExpressions(expressions, new Set(["var0", "var1"])))
    .toMatchInlineSnapshot(`
    "const var0 = _variables.get('var0');
    const exp1 = (var0);
    return new Map([
      ['exp1', exp1],
    ]);"
  `);
});

test("execute expression", () => {
  const variables = new Map();
  const expressions = new Map([["exp1", "1 + 1"]]);
  expect(executeComputingExpressions(expressions, variables)).toEqual(
    new Map([["exp1", 2]])
  );
});

test("execute expression dependent on variables", () => {
  const variables = new Map([["var1", 5]]);
  const expressions = new Map([["exp1", "var1 + 1"]]);
  expect(executeComputingExpressions(expressions, variables)).toEqual(
    new Map([["exp1", 6]])
  );
});

test("execute expression dependent on another expressions", () => {
  const variables = new Map([["var1", 3]]);
  const expressions = new Map([
    ["exp1", "exp0 + 1"],
    ["exp0", "var1 + 2"],
  ]);
  expect(executeComputingExpressions(expressions, variables)).toEqual(
    new Map([
      ["exp1", 6],
      ["exp0", 5],
    ])
  );
});

test("forbid circular expressions", () => {
  const variables = new Map([["var1", 3]]);
  const expressions = new Map([
    ["exp0", "exp2 + 1"],
    ["exp1", "exp0 + 2"],
    ["exp2", "exp1 + 3"],
  ]);
  expect(() => {
    executeComputingExpressions(expressions, variables);
  }).toThrowError(/Cannot access 'exp0' before initialization/);
});

test("make sure dependency exists", () => {
  const variables = new Map();
  const expressions = new Map([["exp1", "var1 + 1"]]);
  expect(() => {
    executeComputingExpressions(expressions, variables);
  }).toThrowError(/Unknown dependency "var1"/);
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

test("generate effectful expression", () => {
  expect(
    generateEffectfulExpression(
      `var0 = var0 + var1`,
      new Set(),
      new Set(["var0", "var1"])
    )
  ).toMatchInlineSnapshot(`
    "let var0 = _variables.get('var0');
    let var1 = _variables.get('var1');
    var0 = var0 + var1;
    return new Map([
      ['var0', var0],
    ]);"
  `);

  expect(
    generateEffectfulExpression(
      `var0 = var1 + 1`,
      new Set(),
      new Set(["var0", "var1"])
    )
  ).toMatchInlineSnapshot(`
    "let var1 = _variables.get('var1');
    let var0;
    var0 = var1 + 1;
    return new Map([
      ['var0', var0],
    ]);"
  `);
});

test("add only used variables in effectful expression", () => {
  expect(
    generateEffectfulExpression(
      `var0 = var1 + 1`,
      new Set(),
      new Set(["var0", "var1", "var2"])
    )
  ).toMatchInlineSnapshot(`
    "let var1 = _variables.get('var1');
    let var0;
    var0 = var1 + 1;
    return new Map([
      ['var0', var0],
    ]);"
  `);
});

test("support effectful expression arguments", () => {
  expect(
    generateEffectfulExpression(
      `var0 = arg0 + 1`,
      new Set(["arg0"]),
      new Set(["var0"])
    )
  ).toMatchInlineSnapshot(`
    "let arg0 = _args.get('arg0');
    let var0;
    var0 = arg0 + 1;
    return new Map([
      ['var0', var0],
    ]);"
  `);
});

test("forbid not allowed variables or arguments in effectful expression", () => {
  expect(() => {
    generateEffectfulExpression(
      `var0 = var0 + var1`,
      new Set(),
      new Set(["var0"])
    );
  }).toThrowError(/Unknown dependency "var1"/);
  expect(() => {
    generateEffectfulExpression(`var0 = arg0`, new Set(), new Set(["var0"]));
  }).toThrowError(/Unknown dependency "arg0"/);
});

test("execute effectful expression", () => {
  const variables = new Map([
    ["var0", 2],
    ["var1", 3],
  ]);
  expect(
    executeEffectfulExpression(`var0 = var0 + var1`, new Map(), variables)
  ).toEqual(new Map([["var0", 5]]));

  expect(
    executeEffectfulExpression(`arg0 = 5`, new Map([["arg0", 0]]), new Map())
  ).toEqual(new Map());
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

test("generate variables with sorted expressions", () => {
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
          code: `$ws$dataSource$dataSource3 + "Name"`,
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
    props: new Map(),
  });
  expect(generated.body).toMatchInlineSnapshot(`
"let myExp = (myVar + "Value");
let myExp_1 = (myExp + "Name");
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
      ["dataSource2", "myExp_1"],
      ["dataSource3", "myExp"],
    ])
  );
});
