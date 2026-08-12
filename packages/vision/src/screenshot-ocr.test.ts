import { expect, test } from "vitest";
import { parseTesseractTsv } from "./screenshot-ocr";

const header = [
  "level",
  "page_num",
  "block_num",
  "par_num",
  "line_num",
  "word_num",
  "left",
  "top",
  "width",
  "height",
  "conf",
  "text",
].join("\t");

test("parses tesseract TSV words into text blocks", () => {
  const blocks = parseTesseractTsv(
    [
      header,
      "5\t1\t1\t1\t1\t1\t10\t20\t40\t12\t96\tHello",
      "5\t1\t1\t1\t1\t2\t56\t20\t32\t12\t92\tworld",
      "5\t1\t1\t1\t2\t1\t10\t44\t36\t12\t90\tAgain",
    ].join("\n")
  );

  expect(blocks).toEqual([
    {
      text: "Hello world",
      confidence: 0.94,
      bounds: { x: 10, y: 20, width: 78, height: 12 },
      words: [
        expect.objectContaining({ text: "Hello" }),
        expect.objectContaining({ text: "world" }),
      ],
    },
    {
      text: "Again",
      confidence: 0.9,
      bounds: { x: 10, y: 44, width: 36, height: 12 },
      words: [expect.objectContaining({ text: "Again" })],
    },
  ]);
});

test("parses headerless tesseract TSV data", () => {
  const blocks = parseTesseractTsv(
    "5\t1\t1\t1\t1\t1\t10\t20\t40\t12\t96\tHello"
  );

  expect(blocks).toEqual([
    expect.objectContaining({
      text: "Hello",
      bounds: { x: 10, y: 20, width: 40, height: 12 },
    }),
  ]);
});

test("ignores non-word and empty OCR rows", () => {
  const blocks = parseTesseractTsv(
    [
      header,
      "4\t1\t1\t1\t1\t0\t10\t20\t40\t12\t-1\t",
      "5\t1\t1\t1\t1\t1\t10\t20\t40\t12\t96\t...",
      "5\t1\t1\t1\t1\t2\t10\t20\t40\t12\t96\tText",
    ].join("\n")
  );

  expect(blocks).toEqual([
    expect.objectContaining({
      text: "Text",
    }),
  ]);
});
