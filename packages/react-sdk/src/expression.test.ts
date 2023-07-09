import { expect, test } from "@jest/globals";
import {
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  executeComputingExpressions,
  executeEffectfulExpression,
  generateComputingExpressions,
  generateEffectfulExpression,
  validateExpression,
} from "./expression";

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
    generateEffectfulExpression(`var0 = var0 + var1`, new Set(["var0", "var1"]))
  ).toMatchInlineSnapshot(`
    "let var0 = _variables.get('var0');
    let var1 = _variables.get('var1');
    var0 = var0 + var1;
    return new Map([
      ['var0', var0],
    ]);"
  `);

  expect(
    generateEffectfulExpression(`var0 = var1 + 1`, new Set(["var0", "var1"]))
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

test("forbid not allowed variables in effectful expression", () => {
  expect(() => {
    generateEffectfulExpression(`var0 = var0 + var1`, new Set(["var0"]));
  }).toThrowError(/Unknown dependency "var1"/);
});

test("execute effectful expression", () => {
  const variables = new Map([
    ["var0", 2],
    ["var1", 3],
  ]);
  expect(executeEffectfulExpression(`var0 = var0 + var1`, variables)).toEqual(
    new Map([["var0", 5]])
  );
});
