import { describe, test, expect } from "vitest";
import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { allowedArrayMethods, allowedStringMethods } from "@webstudio-is/sdk";
import {
  completionPath,
  generateCompletionOptions,
  getCompletionTarget,
  getCompletionReplacement,
} from "./expression-editor";

type CompletionReplacement = ReturnType<typeof getCompletionReplacement>;

const applyReplacement = (
  value: string,
  { text, from, to }: CompletionReplacement
) => {
  return `${value.slice(0, from)}${text}${value.slice(to)}`;
};

const expectMethodOptions = ({
  options,
  methods,
  detail,
}: {
  options: ReturnType<typeof generateCompletionOptions>;
  methods: ReadonlySet<string>;
  detail: string;
}) => {
  for (const method of methods) {
    expect(options).toContainEqual({
      label: method,
      displayLabel: `${method}()`,
      detail,
      type: "method",
      insertText: `${method}()`,
    });
  }
};

const expectMethodsInsertAsCalls = ({
  methods,
  objectName,
}: {
  methods: ReadonlySet<string>;
  objectName: string;
}) => {
  const memberPrefix = `${objectName}.`;

  for (const method of methods) {
    const value = `${memberPrefix}${method.slice(0, 3)}`;
    const result = applyReplacement(
      value,
      getCompletionReplacement({
        label: method,
        insertText: `${method}()`,
        type: "method",
        pathLength: 1,
        from: memberPrefix.length,
        to: value.length,
      })
    );

    expect(result).toEqual(`${memberPrefix}${method}()`);
    expect(result).not.toContain(`["${method}()"]`);
  }
};

const getCompletionPath = (value: string) => {
  const state = EditorState.create({
    doc: value,
    extensions: [javascript({})],
  });
  return completionPath(new CompletionContext(state, value.length, true));
};

describe("generateCompletionOptions", () => {
  describe("object properties", () => {
    test("returns object properties with preview values", () => {
      const target = { name: "John", age: 30, email: "john@example.com" };
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 1,
      });

      expect(options).toEqual([
        { label: "name", detail: `"John"` },
        { label: "age", detail: "30" },
        { label: "email", detail: `"john@example.com"` },
      ]);
    });

    test("returns all properties regardless of pathName (filtering happens in CodeMirror layer)", () => {
      const target = { name: "John", age: 30, email: "john@example.com" };
      const options = generateCompletionOptions({
        target,
        pathName: "na",
        pathLength: 1,
      });

      // generateCompletionOptions doesn't filter - that's done by matchSorter in scopeCompletionSource
      expect(options).toEqual([
        { label: "name", detail: `"John"` },
        { label: "age", detail: "30" },
        { label: "email", detail: `"john@example.com"` },
      ]);
    });

    test("handles properties with special characters", () => {
      const target = { "prop with spaces": "value", "123": "numeric key" };
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 1,
      });

      // Object.entries order for number-like keys may vary
      const labels = options.map((o) => o.label);
      expect(labels).toContain("prop with spaces");
      expect(labels).toContain("123");
    });
  });

  describe("array properties and methods", () => {
    test("returns array indices, length property, and methods", () => {
      const target = ["apple", "banana", "cherry"];
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 1,
      });

      // Should include indices, length, and all array methods
      const labels = options.map((o) => o.label);
      expect(labels).toContain("0");
      expect(labels).toContain("1");
      expect(labels).toContain("2");
      expect(labels).toContain("length");
      expectMethodOptions({
        options,
        methods: allowedArrayMethods,
        detail: "array method",
      });

      // Check specific values
      const lengthOption = options.find((o) => o.label === "length");
      expect(lengthOption).toEqual({
        label: "length",
        detail: "3",
        type: "property",
      });
    });

    test("filters length property by pathName", () => {
      const target = [1, 2, 3, 4, 5];
      const options = generateCompletionOptions({
        target,
        pathName: "len",
        pathLength: 1,
      });

      expect(options).toContainEqual({
        label: "length",
        detail: "5",
        type: "property",
      });
    });

    test("returns array methods after string method calls returning arrays", () => {
      const path = getCompletionPath("Test.split(2).");
      expect(path).toEqual({
        path: [],
        name: "",
        expression: "Test.split(2)",
      });

      const target = getCompletionTarget({
        ...path!,
        scope: { Test: "Test" },
      });
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 1,
      });

      expectMethodOptions({
        options,
        methods: allowedArrayMethods,
        detail: "array method",
      });
    });

    test("filters array methods after string method calls returning arrays", () => {
      const path = getCompletionPath("Test.split(2).toS");
      expect(path).toEqual({
        path: [],
        name: "toS",
        expression: "Test.split(2)",
      });

      const target = getCompletionTarget({
        ...path!,
        scope: { Test: "Test" },
      });
      const labels = generateCompletionOptions({
        target,
        pathName: path!.name,
        pathLength: 1,
      }).map((option) => option.label);

      expect(labels).toEqual(["toString"]);
    });
  });

  describe("string methods", () => {
    test("returns string methods when target is a string", () => {
      const target = "hello world";
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 1,
      });

      expectMethodOptions({
        options,
        methods: allowedStringMethods,
        detail: "string method",
      });
    });

    test("filters string methods by pathName", () => {
      const target = "test string";
      const options = generateCompletionOptions({
        target,
        pathName: "upper",
        pathLength: 1,
      });

      // Should include both toUpperCase and toLocaleUpperCase
      const labels = options.map((o) => o.label);
      expect(labels).toContain("toUpperCase");
      expect(labels).toContain("toLocaleUpperCase");
    });

    test("returns string methods after array method calls returning strings", () => {
      const path = getCompletionPath("items.join().");
      expect(path).toEqual({
        path: [],
        name: "",
        expression: "items.join()",
      });

      const target = getCompletionTarget({
        ...path!,
        scope: { items: ["T", "e", "s", "t"] },
      });
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 1,
      });

      expectMethodOptions({
        options,
        methods: allowedStringMethods,
        detail: "string method",
      });
    });

    test("returns string methods after string-only calls on unknown receivers", () => {
      const path = getCompletionPath(`Test.replace("e", "a").`);
      expect(path).toEqual({
        path: [],
        name: "",
        expression: `Test.replace("e", "a")`,
      });

      const target = getCompletionTarget({
        ...path!,
        scope: {},
      });
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 1,
      });

      expectMethodOptions({
        options,
        methods: allowedStringMethods,
        detail: "string method",
      });
    });

    test("does not infer conflicting return kinds for unknown receivers", () => {
      const path = getCompletionPath("value.slice().");
      expect(path).toEqual({
        path: [],
        name: "",
        expression: "value.slice()",
      });

      expect(
        getCompletionTarget({
          ...path!,
          scope: {},
        })
      ).toEqual(undefined);
    });

    test("does not return string methods for non-string targets", () => {
      const target = { name: "test" };
      const options = generateCompletionOptions({
        target,
        pathName: "upper",
        pathLength: 1,
      });

      // Should only return object properties, no string methods
      const methodOptions = options.filter((o) => o.type === "method");
      expect(methodOptions).toEqual([]);
    });
  });

  describe("method completion insertion", () => {
    test("inserts all supported string methods as method calls", () => {
      expectMethodsInsertAsCalls({
        methods: allowedStringMethods,
        objectName: "Test",
      });
    });

    test("inserts all supported array methods as method calls", () => {
      expectMethodsInsertAsCalls({
        methods: allowedArrayMethods,
        objectName: "items",
      });
    });

    test("keeps non-identifier properties as computed members", () => {
      const value = "Test.";

      expect(
        applyReplacement(
          value,
          getCompletionReplacement({
            label: "prop with spaces",
            pathLength: 1,
            from: value.length,
            to: value.length,
          })
        )
      ).toEqual(`Test["prop with spaces"]`);
    });

    test("keeps numeric properties as computed members", () => {
      const value = "items.";

      expect(
        applyReplacement(
          value,
          getCompletionReplacement({
            label: "0",
            pathLength: 1,
            from: value.length,
            to: value.length,
          })
        )
      ).toEqual("items[0]");
    });
  });

  describe("completion replacement ranges", () => {
    test("replaces only the typed identifier for identifier properties", () => {
      const value = "Test.na";

      expect(
        applyReplacement(
          value,
          getCompletionReplacement({
            label: "name",
            pathLength: 1,
            from: "Test.".length,
            to: value.length,
          })
        )
      ).toEqual("Test.name");
    });

    test("does not rewrite top-level non-identifier variables as computed members", () => {
      expect(
        getCompletionReplacement({
          label: "$ws$dataSource$example",
          pathLength: 0,
          from: 0,
          to: 0,
        })
      ).toEqual({
        text: "$ws$dataSource$example",
        from: 0,
        to: 0,
      });
    });
  });

  describe("pathLength === 0 (top-level variables)", () => {
    test("does not include methods for top-level variables", () => {
      const target = "hello";
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 0,
      });

      expect(options).toEqual([]);
    });

    test("returns array indices for top-level arrays (but no methods)", () => {
      const target = [1, 2, 3];
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 0,
      });

      // At pathLength === 0, we get array indices but no length/methods
      expect(options).toEqual([
        { label: "0", detail: "1" },
        { label: "1", detail: "2" },
        { label: "2", detail: "3" },
      ]);
    });
  });

  describe("non-object targets", () => {
    test("returns empty array for null", () => {
      const options = generateCompletionOptions({
        target: null,
        pathName: "",
        pathLength: 1,
      });

      expect(options).toEqual([]);
    });

    test("returns empty array for undefined", () => {
      const options = generateCompletionOptions({
        target: undefined,
        pathName: "",
        pathLength: 1,
      });

      expect(options).toEqual([]);
    });

    test("returns empty array for primitive numbers", () => {
      const options = generateCompletionOptions({
        target: 42,
        pathName: "",
        pathLength: 1,
      });

      expect(options).toEqual([]);
    });
  });

  describe("edge cases", () => {
    test("handles empty object", () => {
      const options = generateCompletionOptions({
        target: {},
        pathName: "",
        pathLength: 1,
      });

      expect(options).toEqual([]);
    });

    test("handles empty array", () => {
      const options = generateCompletionOptions({
        target: [],
        pathName: "",
        pathLength: 1,
      });

      // Empty array has length and all array methods
      const labels = options.map((o) => o.label);
      expect(labels).toContain("length");
      for (const method of allowedArrayMethods) {
        expect(labels).toContain(method);
      }

      const lengthOption = options.find((o) => o.label === "length");
      expect(lengthOption).toEqual({
        label: "length",
        detail: "0",
        type: "property",
      });
    });

    test("handles nested values in preview", () => {
      const target = {
        nested: { inner: "value" },
        arr: [1, 2, 3],
      };
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 1,
      });

      // formatValuePreview returns "JSON" for complex objects
      expect(options).toEqual([
        { label: "nested", detail: "JSON" },
        { label: "arr", detail: "JSON" },
      ]);
    });
  });
});
