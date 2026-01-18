import { describe, test, expect } from "vitest";
import { generateCompletionOptions } from "./expression-editor";

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
      expect(labels).toContain("filter()");
      expect(labels).toContain("slice()");

      // Check specific values
      const lengthOption = options.find((o) => o.label === "length");
      expect(lengthOption).toEqual({
        label: "length",
        detail: "3",
        type: "property",
      });
    });

    test("includes array methods when searching", () => {
      const target = [1, 2, 3];
      const options = generateCompletionOptions({
        target,
        pathName: "fil",
        pathLength: 1,
      });

      const methodOptions = options.filter((o) => o.type === "method");
      expect(methodOptions).toContainEqual({
        label: "filter()",
        detail: "array method",
        type: "method",
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
  });

  describe("string methods", () => {
    test("returns string methods when target is a string", () => {
      const target = "hello world";
      const options = generateCompletionOptions({
        target,
        pathName: "",
        pathLength: 1,
      });

      const methodLabels = options.map((o) => o.label);
      expect(methodLabels).toContain("toUpperCase()");
      expect(methodLabels).toContain("toLowerCase()");
      expect(methodLabels).toContain("replace()");
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
      expect(labels).toContain("toUpperCase()");
      expect(labels).toContain("toLocaleUpperCase()");
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
      expect(labels).toContain("filter()");
      expect(labels).toContain("slice()");

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
