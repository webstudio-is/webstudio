import { describe, expect, test } from "vitest";
import { validateHtmlEmbedCode } from "./html-embed";

describe("validateHtmlEmbedCode", () => {
  test("accepts html that serializes without repairs", () => {
    expect(validateHtmlEmbedCode("<div><span>Label</span></div>")).toBe(
      undefined
    );
  });

  test("accepts self-closing svg elements", () => {
    expect(
      validateHtmlEmbedCode(
        '<svg xmlns="http://www.w3.org/2000/svg"><path /></svg>'
      )
    ).toBeUndefined();
  });

  test.each(["<input />", "<meta />"])(
    "accepts self-closing html void element: %s",
    (value) => {
      expect(validateHtmlEmbedCode(value)).toBeUndefined();
    }
  );

  test("accepts svg syntax that the html serializer normalizes", () => {
    expect(
      validateHtmlEmbedCode(
        '<svg viewBox="0 0 24 24"><linearGradient id="paint"><stop offset="0%" stop-color="#fff" /></linearGradient><path fill="url(#paint)" d="M0 0h24v24H0z" /></svg>'
      )
    ).toBeUndefined();
  });

  test("accepts parser-preserved comments, entities, and template content", () => {
    expect(
      validateHtmlEmbedCode(
        "<!-- note --><template><span>Tom &amp; Jerry</span></template>"
      )
    ).toBeUndefined();
  });

  test("reports html parser errors with autofix output", () => {
    expect(
      validateHtmlEmbedCode('<section></section attribute="value">')
    ).toEqual({
      message: "Entered HTML has a validation error.",
      value: '<section></section attribute="value">',
      expected: "<section></section>",
    });
  });

  test("reports repaired html with autofix output", () => {
    expect(validateHtmlEmbedCode("<div><span></div>")).toEqual({
      message: "Entered HTML has a validation error.",
      value: "<div><span></div>",
      expected: "<div><span></span></div>",
    });
  });

  test("reports html moved outside of a table by the parser", () => {
    const value = "<table><div>moved</div></table>";
    expect(validateHtmlEmbedCode(value)).toEqual({
      message: "Entered HTML has a validation error.",
      value,
      expected: "<div>moved</div><table></table>",
    });
  });

  test("reports invalid select children rewritten by the parser", () => {
    const value = "<select><div>discarded</div></select>";
    expect(validateHtmlEmbedCode(value)).toEqual({
      message: "Entered HTML has a validation error.",
      value,
      expected: "<select>discarded</select>",
    });
  });

  test("reports an unclosed SVG child", () => {
    const value = "<svg><path></svg>";
    expect(validateHtmlEmbedCode(value)).toEqual({
      message: "Entered HTML has a validation error.",
      value,
      expected: "<svg><path></path></svg>",
    });
  });

  test("enforces the html embed size limit", () => {
    const value = "a".repeat(50_001);
    expect(validateHtmlEmbedCode(value)).toEqual({
      message: "The HTML Embed code exceeds 50000 character limit.",
      value,
      expected: "",
    });
  });
});
