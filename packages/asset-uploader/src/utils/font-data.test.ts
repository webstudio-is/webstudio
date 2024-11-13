import { describe, test, expect } from "vitest";
import { parseSubfamily, __testing__ } from "./font-data";

const { normalizeFamily } = __testing__;

describe("font-data", () => {
  describe("parseSubfamily()", () => {
    test("Black Italic", () => {
      expect(parseSubfamily("Black Italic")).toEqual({
        style: "italic",
        weight: 900,
      });
    });
    test("Bold", () => {
      expect(parseSubfamily("Bold")).toEqual({
        style: "normal",
        weight: 700,
      });
    });
    test("Demi Bold Italic", () => {
      expect(parseSubfamily("Demi Bold Italic")).toEqual({
        style: "italic",
        weight: 600,
      });
    });
    test("Light", () => {
      expect(parseSubfamily("Light")).toEqual({
        style: "normal",
        weight: 300,
      });
    });
    test("Extra Light", () => {
      expect(parseSubfamily("Extra Light")).toEqual({
        style: "normal",
        weight: 200,
      });
    });
    test("Extra Light Italic", () => {
      expect(parseSubfamily("Extra Light Italic")).toEqual({
        style: "italic",
        weight: 200,
      });
    });
    test("Heavy Italic", () => {
      expect(parseSubfamily("Heavy Italic")).toEqual({
        style: "italic",
        weight: 900,
      });
    });
    test("Medium Italic", () => {
      expect(parseSubfamily("Medium Italic")).toEqual({
        style: "italic",
        weight: 500,
      });
    });
  });

  describe("normalizeFamily()", () => {
    test("basic", () => {
      expect(normalizeFamily("Roboto Black", "Black", "font.woff")).toBe(
        "Roboto"
      );
      expect(normalizeFamily("Roboto Light", "Light Italic", "font.woff")).toBe(
        "Roboto"
      );
      expect(normalizeFamily("Robolder Bold", "Bold", "font.woff")).toBe(
        "Robolder"
      );
      expect(normalizeFamily(" Roboto X Bold ", "Bold", "font.woff")).toBe(
        "Roboto X"
      );
      expect(normalizeFamily(" 'Roboto X' Bold ", "Bold", "font.woff")).toBe(
        "'Roboto X'"
      );
      expect(normalizeFamily(` "Roboto X" Bold `, "Bold", "font.woff")).toBe(
        `"Roboto X"`
      );
      expect(normalizeFamily(`"Roboto Bold"`, "Bold", "font.woff")).toBe(
        `"Roboto Bold"`
      );
      expect(normalizeFamily(`"Roboto Bold" Bold`, "Bold", "font.woff")).toBe(
        `"Roboto Bold"`
      );
      expect(normalizeFamily("", "", "font.woff")).toBe(`font`);
    });
  });
});
