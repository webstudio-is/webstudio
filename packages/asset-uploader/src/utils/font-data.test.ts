import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { getFontData, parseSubfamily, __testing__ } from "./font-data";

const { detectFontStyle, getFontFamily, normalizeFamily } = __testing__;
const require = createRequire(import.meta.url);

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
    test("prefers the font weight class", () => {
      expect(parseSubfamily("ExtraBold", 800)).toEqual({
        style: "normal",
        weight: 800,
      });
      expect(parseSubfamily("Regular", 650)).toEqual({
        style: "normal",
        weight: 650,
      });
    });
    test("matches specific aliases before shorter aliases", () => {
      expect(parseSubfamily("ExtraBold")).toEqual({
        style: "normal",
        weight: 800,
      });
      expect(parseSubfamily("Extra-Bold").weight).toBe(800);
      expect(parseSubfamily("Semi Bold Italic")).toEqual({
        style: "italic",
        weight: 600,
      });
      expect(parseSubfamily("Ultra Light")).toEqual({
        style: "normal",
        weight: 200,
      });
    });
    test("falls back when the weight class is invalid", () => {
      expect(parseSubfamily("Bold", 0).weight).toBe(700);
      expect(parseSubfamily("Regular", Number.NaN).weight).toBe(400);
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

  test("detects style from authoritative font metadata", () => {
    expect(
      detectFontStyle(
        {
          "OS/2": { fsSelection: { italic: true, oblique: false } },
          italicAngle: 0,
        },
        "normal"
      )
    ).toBe("italic");
    expect(
      detectFontStyle(
        {
          "OS/2": { fsSelection: { italic: false, oblique: true } },
          italicAngle: 0,
        },
        "normal"
      )
    ).toBe("oblique");
    expect(
      detectFontStyle(
        {
          "OS/2": { fsSelection: { italic: false, oblique: false } },
          italicAngle: -12,
        },
        "normal"
      )
    ).toBe("italic");
  });

  test("detects separate upright and italic variable font files", () => {
    const readInter = (style: "normal" | "italic") => {
      const name = `inter-latin-wght-${style}.woff2`;
      return getFontData(
        readFileSync(
          require.resolve(`@fontsource-variable/inter/files/${name}`)
        ),
        name
      );
    };

    expect(readInter("normal")).toMatchObject({
      family: "Inter",
      style: "normal",
      variationAxes: { wght: { min: 100, default: 400, max: 900 } },
    });
    expect(readInter("italic")).toMatchObject({
      family: "Inter",
      style: "italic",
      variationAxes: { wght: { min: 100, default: 400, max: 900 } },
    });
  });

  test("prefers the typographic family name", () => {
    expect(
      getFontFamily({
        getName: (name: string, _language: string) =>
          name === "preferredFamily" ? "Rajdhani" : "Rajdhani SemiBold",
      })
    ).toBe("Rajdhani");
  });
});
