import { describe, test, expect } from "@jest/globals";
import { findApplicableMedia } from "./find-applicable-media";

const media = [
  {},
  { maxWidth: 991 },
  { maxWidth: 767 },
  { maxWidth: 479 },
  { minWidth: 1280 },
  { minWidth: 1440 },
  { minWidth: 1920 },
];

describe("Find applicable media", () => {
  test("200", () => {
    expect(findApplicableMedia([...media], 200)).toStrictEqual({
      maxWidth: 479,
    });
  });
  test("479", () => {
    expect(findApplicableMedia([...media], 479)).toStrictEqual({
      maxWidth: 479,
    });
  });
  test("480", () => {
    expect(findApplicableMedia([...media], 480)).toStrictEqual({
      maxWidth: 767,
    });
  });
  test("1279", () => {
    expect(findApplicableMedia([...media], 1279)).toStrictEqual({});
  });
  test("1280", () => {
    expect(findApplicableMedia([...media], 1280)).toStrictEqual({
      minWidth: 1280,
    });
  });
  test("1440", () => {
    expect(findApplicableMedia([...media], 1440)).toStrictEqual({
      minWidth: 1440,
    });
  });
});
