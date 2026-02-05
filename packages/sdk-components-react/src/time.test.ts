import { expect, test } from "vitest";
import { __testing__ } from "./time";

const { parseDate, formatDate } = __testing__;

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

test.skip("parse short date", () => {
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

test("formatDate with full template", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "YYYY-MM-DD HH:mm:ss")).toBe("2025-10-31 14:05:09");
});

test("formatDate with short date", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "DD/MM/YY")).toBe("31/10/25");
});

test("formatDate with time only", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "H:m:s")).toBe("14:5:9");
});

test("formatDate with padded values", () => {
  const date = new Date("2025-01-05T08:03:07");
  expect(formatDate(date, "YYYY-MM-DD HH:mm:ss")).toBe("2025-01-05 08:03:07");
});

test("formatDate with unpadded values", () => {
  const date = new Date("2025-01-05T08:03:07");
  expect(formatDate(date, "YYYY-M-D H:m:s")).toBe("2025-1-5 8:3:7");
});

test("formatDate with year only", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "YYYY")).toBe("2025");
});

test("formatDate with custom separator", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "DD.MM.YYYY")).toBe("31.10.2025");
});

test("formatDate with full month name in English", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "MMMM D, YYYY", "en-US")).toBe("October 31, 2025");
});

test("formatDate with short month name in English", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "MMM D, YYYY", "en-US")).toBe("Oct 31, 2025");
});

test("formatDate with full day name in English", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "DDDD, MMMM D, YYYY", "en-US")).toBe(
    "Friday, October 31, 2025"
  );
});

test("formatDate with short day name in English", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "DDD, MMM D", "en-US")).toBe("Fri, Oct 31");
});

test("formatDate with full month name in German", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "D. MMMM YYYY", "de-DE")).toBe("31. Oktober 2025");
});

test("formatDate with full day name in German", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "DDDD, D. MMMM YYYY", "de-DE")).toBe(
    "Freitag, 31. Oktober 2025"
  );
});

test("formatDate with short day and month in Spanish", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "DDD, D MMM YYYY", "es-ES")).toBe("vie, 31 oct 2025");
});

test("formatDate with full day and month in French", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "DDDD D MMMM YYYY", "fr-FR")).toBe(
    "vendredi 31 octobre 2025"
  );
});

test("formatDate with mixed tokens", () => {
  const date = new Date("2025-01-15T09:30:45");
  expect(formatDate(date, "DDDD, MMMM D, YYYY at HH:mm", "en-US")).toBe(
    "Wednesday, January 15, 2025 at 09:30"
  );
});

test("formatDate preserves non-token text", () => {
  const date = new Date("2025-10-31T14:05:09");
  expect(formatDate(date, "Today is DDDD", "en-US")).toBe("Today is Friday");
});
