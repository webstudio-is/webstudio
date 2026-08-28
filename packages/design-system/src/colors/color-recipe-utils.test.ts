import { describe, expect, test } from "vitest";
import { compileColorRecipes } from "./color-recipe-utils";

const controllers = ["canvas", "ink", "accent"] as const;

describe("color recipe compiler", () => {
  test("compiles nested recipes into live relative CSS", () => {
    const result = compileColorRecipes({
      controllers,
      recipes: {
        version: 1,
        semantic: {
          backgroundCanvas: "theme.canvas",
          backgroundNeutral: ["mix", "theme.canvas", 92, "theme.ink"],
        },
        compatibility: {
          white: ["channels", "theme.canvas", 100, 0],
          accentFade: [
            "linearGradient",
            180,
            [
              {
                color: ["rotateHue", "theme.accent", 72],
                position: 0,
              },
              { color: ["alpha", "theme.accent", 0], position: 100 },
            ],
          ],
        },
      },
    });

    expect(result).toEqual({
      semantic: {
        backgroundCanvas: "var(--colors-themeCanvas)",
        backgroundNeutral:
          "color-mix(in oklch, var(--colors-themeCanvas) 92%, var(--colors-themeInk))",
      },
      compatibility: {
        white: "oklch(from var(--colors-themeCanvas) 100% 0 h)",
        accentFade:
          "linear-gradient(180deg, oklch(from var(--colors-themeAccent) l c calc(h + 72)) 0%, oklch(from var(--colors-themeAccent) l c h / 0%) 100%)",
      },
    });
  });

  test("rejects references to missing tokens", () => {
    expect(() =>
      compileColorRecipes({
        controllers,
        recipes: {
          version: 1,
          semantic: { invalid: "theme.negative" },
          compatibility: {},
        },
      })
    ).toThrowError("Unknown color recipe reference: theme.negative");
  });

  test("rejects circular semantic references", () => {
    expect(() =>
      compileColorRecipes({
        controllers,
        recipes: {
          version: 1,
          semantic: {
            first: "semantic.second",
            second: "semantic.first",
          },
          compatibility: {},
        },
      })
    ).toThrowError(
      "Circular color recipe reference: semantic.first -> semantic.second -> semantic.first"
    );
  });
});
