import { describe, test, expect } from "@jest/globals";
import { extendedEncodeURIComponent, sanitizeS3Key } from "./sanitize-s3-key";

describe("sanitizeS3Key", () => {
  test("Should replace ASCII character ranges 00–1F hex (0–31 decimal) and 7F (127 decimal)", () => {
    let path = "";
    for (let i = 0; i < 32; ++i) {
      path += String.fromCharCode(i) + "abc";
    }
    path += String.fromCharCode(127);

    expect(sanitizeS3Key(path)).toMatchInlineSnapshot(
      `"_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_abc_"`
    );
  });

  test(`Should replace "&" "$" "@" "=" ";" "/" ":" "+" "," "?"`, () => {
    const path = `test&test$test@test=test;test/test:test+test,test?test`;
    expect(sanitizeS3Key(path)).toMatchInlineSnapshot(
      `"test_test_test_test_test_test_test_test_test_test_test"`
    );
  });

  test("Non-printable ASCII characters (128–255 decimal characters)", () => {
    let path = "";
    for (let i = 128; i < 256; ++i) {
      path += String.fromCharCode(i) + "a";
    }
    path += String.fromCharCode(127);

    expect(sanitizeS3Key(path)).toMatchInlineSnapshot(
      `"_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_a_"`
    );
  });

  test(`Should replace  "\\" "{" "^" "}" "%" "\`" "]" "'" """ "“" "”" ">" "[" "~"  "<" "#" "|"`, () => {
    const path = `x\\x{x^x}x%x\`x]x'x"x“x”x>x[x~x<x#x|`;
    expect(sanitizeS3Key(path)).toMatchInlineSnapshot(
      `"x_x_x_x_x_x_x_x_x_x_x_x_x_x_x_x_x_"`
    );
  });

  test(`Should do nothing with ordinary utf caracters`, () => {
    const path = `hello-world-привет-мир-😀-😂ĊĴĈ`;
    expect(sanitizeS3Key(path)).toMatch(path);
  });
});

describe("extendedEncodeURIComponent", () => {
  const encodedValues: [string, string][] = [
    ["!", "%21"],
    ["'", "%27"],
    ["(", "%28"],
    [")", "%29"],
    ["*", "%2A"],
  ];

  const verify = (table: [string, string][]) => {
    test.each(table)(`encodes %s as %s`, (input, output) => {
      expect(extendedEncodeURIComponent(input)).toStrictEqual(output);
    });
  };

  verify(encodedValues);
  verify([
    encodedValues.reduce(
      (acc, [input, output]) => [acc[0].concat(input), acc[1].concat(output)],
      ["", ""]
    ),
  ]);
});
