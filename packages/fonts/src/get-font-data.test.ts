import { parseSubfamily } from "./get-font-data";

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
