import { describe, test, expect } from "@jest/globals";
import { toValue } from "./to-value";

describe("Convert WS CSS Values to native CSS strings", () => {
  test("keyword", () => {
    const value = toValue({ type: "keyword", value: "red" });
    expect(value).toBe("red");
  });

  test("unit", () => {
    const value = toValue({ type: "unit", value: 10, unit: "px" });
    expect(value).toBe("10px");
  });

  test("invalid", () => {
    const value = toValue({ type: "invalid", value: "bad" });
    expect(value).toBe("bad");
  });

  test("unset", () => {
    const value = toValue({ type: "unset", value: "" });
    expect(value).toBe("");
  });

  test("var", () => {
    const value = toValue({ type: "var", value: "namespace", fallbacks: [] });
    expect(value).toBe("var(--namespace)");
  });

  test("var with fallbacks", () => {
    const value = toValue({
      type: "var",
      value: "namespace",
      fallbacks: [
        {
          type: "keyword",
          value: "normal",
        },
        {
          type: "unit",
          value: 10,
          unit: "px",
        },
      ],
    });
    expect(value).toBe("var(--namespace, normal, 10px)");
  });

  test("fontFamily", () => {
    const value = toValue({
      type: "fontFamily",
      value: ["Courier New"],
    });
    expect(value).toBe("Courier New, monospace");
  });

  test("Transform font family value to override default fallback", () => {
    const value = toValue(
      {
        type: "fontFamily",
        value: ["Courier New"],
      },
      (styleValue) => {
        if (styleValue.type === "fontFamily") {
          return {
            type: "fontFamily",
            value: [styleValue.value[0]],
          };
        }
      }
    );
    expect(value).toBe("Courier New");
  });

  test("array", () => {
    const assets = new Map<string, { path: string }>([
      ["1234567890", { path: "foo.png" }],
    ]);

    const value = toValue(
      {
        type: "layers",
        value: [
          {
            type: "keyword",
            value: "auto",
          },
          { type: "unit", value: 10, unit: "px" },
          { type: "unparsed", value: "calc(10px)" },
          {
            type: "image",
            value: {
              type: "asset",
              value: "1234567890",
            },
          },
        ],
      },
      (styleValue) => {
        if (styleValue.type === "image" && styleValue.value.type === "asset") {
          const asset = assets.get(styleValue.value.value);
          if (asset === undefined) {
            return {
              type: "keyword",
              value: "none",
            };
          }
          return {
            type: "image",
            value: {
              type: "url",
              url: asset.path,
            },
          };
        }
      }
    );

    expect(value).toBe("auto, 10px, calc(10px), url(foo.png)");
  });

  test("tuple", () => {
    const value = toValue({
      type: "tuple",
      value: [
        { type: "unit", value: 10, unit: "px" },
        { type: "unit", value: 20, unit: "px" },
        { type: "unit", value: 30, unit: "px" },
        { type: "unit", value: 40, unit: "px" },
      ],
    });
    expect(value).toBe("10px 20px 30px 40px");
  });
});
