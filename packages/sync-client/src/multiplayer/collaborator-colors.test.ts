import { describe, expect, test } from "vitest";
import {
  assignCollaboratorColors,
  collaboratorColor,
  collaboratorColorPalette,
} from "./collaborator-colors";

describe("collaboratorColorPalette", () => {
  test("has exactly 50 entries", () => {
    expect(collaboratorColorPalette).toHaveLength(50);
  });

  test("each entry is a valid oklch() string", () => {
    for (const paletteColor of collaboratorColorPalette) {
      expect(paletteColor).toMatch(
        /^oklch\(\d+(?:\.\d+)?% \d+\.\d+ \d+(?:\.\d+)?\)$/
      );
    }
  });

  test("all entries are distinct", () => {
    expect(new Set(collaboratorColorPalette).size).toBe(50);
  });
});

describe("collaboratorColor", () => {
  test("same id always returns the same color", () => {
    expect(collaboratorColor("abc")).toBe(collaboratorColor("abc"));
    expect(collaboratorColor("user-123")).toBe(collaboratorColor("user-123"));
  });

  test("different ids return different colors", () => {
    const sample = ["a", "b", "c", "d", "e", "f", "g", "h"].map(
      collaboratorColor
    );
    expect(new Set(sample).size).toBeGreaterThan(1);
  });

  test("return value is one of the palette colors", () => {
    const palette = new Set(collaboratorColorPalette);
    expect(palette.has(collaboratorColor("anything"))).toBe(true);
    expect(palette.has(collaboratorColor("client-1"))).toBe(true);
    expect(palette.has(collaboratorColor(""))).toBe(true);
  });

  test("empty string returns a color without throwing", () => {
    expect(() => collaboratorColor("")).not.toThrow();
    expect(collaboratorColorPalette).toContain(collaboratorColor(""));
  });
});

describe("assignCollaboratorColors", () => {
  test("assigns the same color for the same active collaborator set", () => {
    const ids = ["client-2", "client-1", "client-3"];

    expect(assignCollaboratorColors(ids)).toEqual(
      assignCollaboratorColors([...ids].reverse())
    );
  });

  test("does not reuse colors for active collaborators with hash collisions", () => {
    const colors = assignCollaboratorColors(["i", "ab"]);

    expect(colors.get("i")).not.toBe(colors.get("ab"));
  });

  test("does not reuse colors after palette slots are exhausted", () => {
    const ids = Array.from({ length: 75 }, (_, index) => `client-${index}`);
    const colors = [...assignCollaboratorColors(ids).values()];

    expect(new Set(colors).size).toBe(colors.length);
  });
});
