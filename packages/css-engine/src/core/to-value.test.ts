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

  test("withFallback=false", () => {
    const value = toValue(
      {
        type: "fontFamily",
        value: ["Courier New"],
      },
      { withFallback: false }
    );
    expect(value).toBe("Courier New");
  });
});
