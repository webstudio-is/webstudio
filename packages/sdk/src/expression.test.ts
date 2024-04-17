import { describe, expect, test } from "@jest/globals";
import {
  type Diagnostic,
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  executeExpression,
  isLiteralExpression,
  lintExpression,
  transpileExpression,
  getExpressionIdentifiers,
} from "./expression";

describe("lint expression", () => {
  const error = (from: number, to: number, message: string): Diagnostic => ({
    from,
    to,
    severity: "error",
    message,
  });

  test("forbid empty expression", () => {
    expect(lintExpression({ expression: `` })).toEqual([
      error(0, 0, `Expression cannot be empty`),
    ]);
    expect(lintExpression({ expression: `  ` })).toEqual([
      error(0, 0, `Expression cannot be empty`),
    ]);
  });

  test("output parse error as diagnostic", () => {
    expect(lintExpression({ expression: `a + ` })).toEqual([
      error(4, 4, "Unexpected token (1:4)"),
    ]);
  });

  test("restrict expression syntax", () => {
    expect(lintExpression({ expression: `var a = 1` })).toEqual([
      error(0, 0, "Unexpected token (1:0)"),
    ]);
  });

  test("supports accessing variable fields", () => {
    expect(
      lintExpression({
        expression: `a.b.c`,
        availableVariables: new Set(["a"]),
      })
    ).toEqual([]);
  });

  test("supports literals", () => {
    expect(
      lintExpression({
        expression: `"" + 0 + true + [] + {}`,
      })
    ).toEqual([]);
  });

  test("supports ternary operator", () => {
    expect(
      lintExpression({
        expression: `true ? false : true`,
      })
    ).toEqual([]);
  });

  test("supports template literals", () => {
    expect(
      lintExpression({
        expression: "`my ${1} template ${'2'}`",
      })
    ).toEqual([]);
    expect(
      lintExpression({
        expression: "`my template",
      })
    ).toEqual([error(1, 1, "Unterminated template (1:1)")]);
  });

  test("supports parentheses", () => {
    expect(
      lintExpression({
        expression: "(1 + 1) * 2",
      })
    ).toEqual([]);
  });

  test("forbid assignment until enabled", () => {
    expect(
      lintExpression({
        expression: ` a = 1`,
        availableVariables: new Set(["a"]),
      })
    ).toEqual([error(1, 6, "Assignment is supported only inside actions")]);
    expect(
      lintExpression({
        expression: ` a = 1`,
        allowAssignment: true,
        availableVariables: new Set(["a"]),
      })
    ).toEqual([]);
  });

  test("forbid unavailable variables", () => {
    expect(
      lintExpression({ expression: ` a = b + 1`, allowAssignment: true })
    ).toEqual([
      error(5, 6, `"b" is not available in the scope`),
      error(1, 2, `"a" is not available in the scope`),
    ]);
    expect(
      lintExpression({
        expression: ` a = b + 1`,
        allowAssignment: true,
        availableVariables: new Set(["a", "b"]),
      })
    ).toEqual([]);
  });

  test(`forbid "this" keyword`, () => {
    expect(lintExpression({ expression: ` this.name` })).toEqual([
      error(1, 5, `"this" keyword is not supported`),
    ]);
  });

  test("forbid functions", () => {
    expect(
      lintExpression({
        expression: ` function(){} + (() => {}) + fn()`,
        availableVariables: new Set(["fn"]),
      })
    ).toEqual([
      error(1, 13, "Functions are not supported"),
      error(17, 25, "Functions are not supported"),
      error(29, 33, "Functions are not supported"),
    ]);
  });

  test("forbid increment and decrement", () => {
    expect(
      lintExpression({
        expression: ` ++i + --j`,
        availableVariables: new Set(["j", "i"]),
      })
    ).toEqual([
      error(1, 4, "Increment and decrement are not supported"),
      error(7, 10, "Increment and decrement are not supported"),
    ]);
  });

  test("forbid sequence expression", () => {
    expect(lintExpression({ expression: ` 1, 2, 3` })).toEqual([
      error(1, 8, "Only single expression is supported"),
    ]);
  });

  test(`forbid "yield" keyword`, () => {
    expect(lintExpression({ expression: ` yield 1` })).toEqual([
      error(1, 1, `The keyword 'yield' is reserved (1:1)`),
    ]);
  });

  test("forbid tagged template", () => {
    expect(
      lintExpression({
        expression: " tag`hello`",
        availableVariables: new Set(["tag"]),
      })
    ).toEqual([error(1, 11, "Tagged template is not supported")]);
  });

  test("forbid classes", () => {
    expect(
      lintExpression({
        expression: ` class {} + new MyClass()`,
        availableVariables: new Set(["MyClass"]),
      })
    ).toEqual([
      error(1, 9, "Classes are not supported"),
      error(12, 25, "Classes are not supported"),
    ]);
  });

  test("forbid imports", () => {
    expect(
      lintExpression({ expression: ` import("") + import.meta.url` })
    ).toEqual([
      error(1, 11, "Imports are not supported"),
      error(14, 25, "Imports are not supported"),
    ]);
  });

  test(`forbid "await" keyword`, () => {
    expect(lintExpression({ expression: ` await 1` })).toEqual([
      error(1, 8, `"await" keyword is not supported`),
    ]);
  });
});

test("check simple literals", () => {
  expect(isLiteralExpression(`""`)).toEqual(true);
  expect(isLiteralExpression(`''`)).toEqual(true);
  expect(isLiteralExpression(`0`)).toEqual(true);
  expect(isLiteralExpression(`true`)).toEqual(true);
  expect(isLiteralExpression(`[]`)).toEqual(true);
  expect(isLiteralExpression(`{}`)).toEqual(true);
  expect(isLiteralExpression(`"" + ""`)).toEqual(false);
  expect(isLiteralExpression(`{}.field`)).toEqual(false);
  expect(isLiteralExpression(`variable`)).toEqual(false);
});

test("check complex objects and arrays", () => {
  expect(isLiteralExpression(`[1, 2, 3]`)).toEqual(true);
  expect(isLiteralExpression(`[1, 2, variable]`)).toEqual(false);
  expect(isLiteralExpression(`[...variable]`)).toEqual(false);
  expect(isLiteralExpression(`{ param: 0 }`)).toEqual(true);
  expect(isLiteralExpression(`{ "param": 0 }`)).toEqual(true);
  expect(isLiteralExpression(`{ param: variable }`)).toEqual(false);
  expect(isLiteralExpression(`{ ["param"]: 0 }`)).toEqual(true);
  expect(isLiteralExpression(`{ [variable]: 0 }`)).toEqual(false);
  expect(isLiteralExpression(`{ ...variable }`)).toEqual(false);
});

describe("get expression identifiers", () => {
  test("find all identifiers", () => {
    expect(getExpressionIdentifiers("a = b * c.d")).toEqual(
      new Set(["a", "b", "c"])
    );
  });

  test("deduplicate identifiers", () => {
    expect(getExpressionIdentifiers("a = a + b")).toEqual(new Set(["a", "b"]));
  });

  test("not fail when invalid syntax", () => {
    expect(getExpressionIdentifiers("")).toEqual(new Set());
    expect(getExpressionIdentifiers("a = a +")).toEqual(new Set());
  });
});

describe("transpile expression", () => {
  test("preserve spaces and parentheses", () => {
    expect(
      transpileExpression({ expression: " 1 + (2 + 3) ", executable: true })
    ).toEqual(" 1 + (2 + 3) ");
  });

  test("add optional chaining with dot syntax", () => {
    expect(
      transpileExpression({ expression: "a.b . c", executable: true })
    ).toEqual("a?.b ?. c");
  });

  test("add optional chaining with computed", () => {
    expect(
      transpileExpression({ expression: "a['b'] [c]", executable: true })
    ).toEqual("a?.['b'] ?.[c]");
  });

  test("skip optional chaining", () => {
    expect(
      transpileExpression({ expression: "a?.['b']?.c", executable: true })
    ).toEqual("a?.['b']?.c");
  });

  test("replace variable", () => {
    expect(
      transpileExpression({
        expression: "(a + c) * b",
        replaceVariable: (identifier) => identifier + "_1",
      })
    ).toEqual("(a_1 + c_1) * b_1");
    expect(
      transpileExpression({
        expression: "a = c",
        replaceVariable: (identifier) => identifier + "_1",
      })
    ).toEqual("a_1 = c_1");
  });

  test("skip identifiers in nested member expressions", () => {
    const identifiers: string[] = [];
    const transpiled = transpileExpression({
      expression: "a.b + c.d * e[f]",
      replaceVariable: (identifier) => {
        identifiers.push(identifier);
        return identifier + "_1";
      },
    });
    expect(identifiers).toEqual(["a", "c", "e", "f"]);
    expect(transpiled).toEqual("a_1.b + c_1.d * e_1[f_1]");
  });

  test("inform identifier is an assignee", () => {
    expect(
      transpileExpression({
        expression: "a = b",
        replaceVariable: (identifier, assignee) => {
          const suffix = assignee ? "_assignee" : "_assigner";
          return identifier + suffix;
        },
      })
    ).toEqual("a_assignee = b_assigner");
  });

  test("transpile object literal without changes", () => {
    expect(
      transpileExpression({
        expression: `{ ...name }`,
      })
    ).toEqual(`{ ...name }`);
  });

  test("output more readable syntax error", () => {
    let errorString = "";
    try {
      transpileExpression({ expression: `` });
    } catch (error) {
      errorString = (error as Error).message;
    }
    expect(errorString).toEqual(`Unexpected token (1:0) in ""`);
  });
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

test("execute expression", () => {
  expect(executeExpression(undefined)).toEqual(undefined);
  expect(executeExpression("1 + 1")).toEqual(2);
  expect(executeExpression("someVariable + 1")).toEqual(undefined);
});
