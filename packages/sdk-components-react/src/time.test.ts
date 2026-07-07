/**
 * @vitest-environment jsdom
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { Time, __testing__ } from "./time";

const { parseDate, formatDate, timeZoneOrDefault } = __testing__;

const originalTimeZone = process.env.TZ;
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
  process.env.TZ = originalTimeZone;
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

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

test("formats ISO date string in UTC to avoid hydration mismatches", () => {
  expect(
    renderToStaticMarkup(
      createElement(Time, { datetime: "2026-05-06T22:00:00.000Z" })
    )
  ).toBe('<time dateTime="2026-05-06T22:00:00.000Z">6 May 2026</time>');
});

test("hydrates ISO date string without timezone mismatch warnings", async () => {
  const datetime = "2026-05-06T22:00:00.000Z";
  const ui = createElement(Time, { datetime });
  const container = document.createElement("div");
  document.body.appendChild(container);

  process.env.TZ = "UTC";
  container.innerHTML = renderToStaticMarkup(ui);
  expect(container.textContent).toBe("6 May 2026");

  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  process.env.TZ = "Europe/Berlin";
  await act(async () => {
    root = hydrateRoot(container, ui);
    await Promise.resolve();
  });

  expect(container.textContent).toBe("6 May 2026");
  expect(consoleError).not.toHaveBeenCalled();
});

test("formats ISO date string in explicit timezone", () => {
  expect(
    renderToStaticMarkup(
      createElement(Time, {
        datetime: "2026-06-08T17:45:00.000+00:00",
        language: "de",
        country: "DE",
        timeStyle: "short",
        dateStyle: "none",
        timeZone: "Europe/Berlin",
      })
    )
  ).toBe('<time dateTime="2026-06-08T17:45:00.000+00:00">19:45</time>');
});

test("formats custom template in explicit timezone", () => {
  expect(
    formatDate(
      new Date("2026-06-08T17:45:00.000+00:00"),
      "YYYY-MM-DD HH:mm",
      "de-DE",
      "Europe/Berlin"
    )
  ).toBe("2026-06-08 19:45");
});

test("formats custom template with date rollover in explicit timezone", () => {
  expect(
    formatDate(
      new Date("2026-06-08T23:45:00.000+00:00"),
      "YYYY-MM-DD HH:mm",
      "de-DE",
      "Europe/Berlin"
    )
  ).toBe("2026-06-09 01:45");
});

test("falls back to UTC for invalid timezone", () => {
  expect(timeZoneOrDefault("Not/A_Timezone")).toBe("UTC");
});

test("trims timezone before validation", () => {
  expect(timeZoneOrDefault(" Europe/Berlin ")).toBe("Europe/Berlin");
});

test("renders UTC fallback for invalid timezone", () => {
  expect(
    renderToStaticMarkup(
      createElement(Time, {
        datetime: "2026-06-08T17:45:00.000+00:00",
        language: "de",
        country: "DE",
        timeStyle: "short",
        dateStyle: "none",
        timeZone: "Not/A_Timezone",
      })
    )
  ).toBe('<time dateTime="2026-06-08T17:45:00.000+00:00">17:45</time>');
});

test("hydrates visitor timezone without mismatch and updates after hydration", async () => {
  const datetime = "2026-06-08T17:45:00.000+00:00";
  const ui = createElement(Time, {
    datetime,
    language: "de",
    country: "DE",
    timeStyle: "short",
    dateStyle: "none",
    timeZone: "visitor",
  });
  const container = document.createElement("div");
  document.body.appendChild(container);

  process.env.TZ = "UTC";
  container.innerHTML = renderToStaticMarkup(ui);
  expect(container.textContent).toBe("17:45");

  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  process.env.TZ = "Europe/Berlin";
  await act(async () => {
    root = hydrateRoot(container, ui);
    await Promise.resolve();
  });

  expect(container.textContent).toBe("19:45");
  expect(
    consoleError.mock.calls.some((call) =>
      call.some(
        (message) =>
          typeof message === "string" &&
          (message.includes("Text content did not match") ||
            message.includes("Hydration failed"))
      )
    )
  ).toBe(false);
});

test("trims visitor timezone mode before hydration update", async () => {
  const datetime = "2026-06-08T17:45:00.000+00:00";
  const ui = createElement(Time, {
    datetime,
    language: "de",
    country: "DE",
    timeStyle: "short",
    dateStyle: "none",
    timeZone: " visitor ",
  });
  const container = document.createElement("div");
  document.body.appendChild(container);

  process.env.TZ = "UTC";
  container.innerHTML = renderToStaticMarkup(ui);
  expect(container.textContent).toBe("17:45");

  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  process.env.TZ = "Europe/Berlin";
  await act(async () => {
    root = hydrateRoot(container, ui);
    await Promise.resolve();
  });

  expect(container.textContent).toBe("19:45");
  expect(
    consoleError.mock.calls.some((call) =>
      call.some(
        (message) =>
          typeof message === "string" &&
          (message.includes("Text content did not match") ||
            message.includes("Hydration failed"))
      )
    )
  ).toBe(false);
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
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "YYYY-MM-DD HH:mm:ss")).toBe("2025-10-31 14:05:09");
});

test("formatDate with short date", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "DD/MM/YY")).toBe("31/10/25");
});

test("formatDate with time only", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "H:m:s")).toBe("14:5:9");
});

test("formatDate with padded values", () => {
  const date = new Date("2025-01-05T08:03:07Z");
  expect(formatDate(date, "YYYY-MM-DD HH:mm:ss")).toBe("2025-01-05 08:03:07");
});

test("formatDate with unpadded values", () => {
  const date = new Date("2025-01-05T08:03:07Z");
  expect(formatDate(date, "YYYY-M-D H:m:s")).toBe("2025-1-5 8:3:7");
});

test("formatDate with year only", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "YYYY")).toBe("2025");
});

test("formatDate with custom separator", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "DD.MM.YYYY")).toBe("31.10.2025");
});

test("formatDate with full month name in English", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "MMMM D, YYYY", "en-US")).toBe("October 31, 2025");
});

test("formatDate with short month name in English", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "MMM D, YYYY", "en-US")).toBe("Oct 31, 2025");
});

test("formatDate with full day name in English", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "DDDD, MMMM D, YYYY", "en-US")).toBe(
    "Friday, October 31, 2025"
  );
});

test("formatDate with short day name in English", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "DDD, MMM D", "en-US")).toBe("Fri, Oct 31");
});

test("formatDate with full month name in German", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "D. MMMM YYYY", "de-DE")).toBe("31. Oktober 2025");
});

test("formatDate with full day name in German", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "DDDD, D. MMMM YYYY", "de-DE")).toBe(
    "Freitag, 31. Oktober 2025"
  );
});

test("formatDate with short day and month in Spanish", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "DDD, D MMM YYYY", "es-ES")).toBe("vie, 31 oct 2025");
});

test("formatDate with full day and month in French", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "DDDD D MMMM YYYY", "fr-FR")).toBe(
    "vendredi 31 octobre 2025"
  );
});

test("formatDate with mixed tokens", () => {
  const date = new Date("2025-01-15T09:30:45Z");
  expect(formatDate(date, "DDDD, MMMM D, YYYY at HH:mm", "en-US")).toBe(
    "Wednesday, January 15, 2025 at 09:30"
  );
});

test("formatDate preserves non-token text", () => {
  const date = new Date("2025-10-31T14:05:09Z");
  expect(formatDate(date, "Today is DDDD", "en-US")).toBe("Today is Friday");
});
