import { expect, test } from "vitest";
import { __testing__ } from "./time";

const { parseDate } = __testing__;

test("13-digit Unix timestamp", () => {
  expect(parseDate("1724938577059")).toEqual(
    new Date("2024-08-29T13:36:17.059Z")
  );
});

test("10-digit Unix timestamp ", () => {
  expect(parseDate("1724938577")).toEqual(new Date("2024-08-29T13:36:17.000Z"));
});

test("maximum 32-bit signed integer timestamp", () => {
  expect(parseDate("2147483647")).toEqual(new Date("2038-01-19T03:14:07.000Z"));
});

test("far future date", () => {
  expect(parseDate("9999999999999")).toEqual(
    new Date("2286-11-20T17:46:39.999Z")
  );
});

test("parse ISO date string", () => {
  expect(parseDate("2024-08-29T13:36:17.000Z")).toEqual(
    new Date("2024-08-29T13:36:17.000Z")
  );
});

test("parse short date", () => {
  expect(parseDate("2024.10")).toEqual(new Date("2024-10-01T00:00:00.000Z"));
  expect(parseDate("2024/10")).toEqual(new Date("2024-10-01T00:00:00.000Z"));
  expect(parseDate("2024-10")).toEqual(new Date("2024-10-01T00:00:00.000Z"));
  expect(parseDate("2024")).toEqual(new Date("2024-01-01T00:00:00.000Z"));
});

test("empty string", () => {
  expect(parseDate("")).toEqual(undefined);
});

test("invalid date string", () => {
  expect(parseDate("whatever that is")).toEqual(undefined);
});
