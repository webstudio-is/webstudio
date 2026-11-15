import { expect, test } from "vitest";
import {
  getPublishDuration,
  selectSessionPublishes,
} from "./session-publishes";

test("duration is omitted for invalid or reversed job timestamps", () => {
  expect(
    getPublishDuration({
      startedAt: "invalid",
      completedAt: "2026-11-13T10:00:00.000Z",
    } as never)
  ).toBeUndefined();
  expect(
    getPublishDuration({
      startedAt: "2026-11-13T10:00:03.000Z",
      completedAt: "2026-11-13T10:00:00.000Z",
    } as never)
  ).toBeUndefined();
});

test("session selection keeps repeated domain publishes separate from static exports", () => {
  const base = { findings: [], status: "success" as const };
  const items = [
    {
      ...base,
      buildId: "site-1",
      target: "site" as const,
      domains: ["a.example", "b.example"],
    },
    {
      ...base,
      buildId: "site-2",
      target: "site" as const,
      domains: ["b.example"],
    },
    { ...base, buildId: "static-1", target: "static" as const, domains: [] },
  ];
  expect(
    selectSessionPublishes(items, "site", "a.example").map(
      ({ buildId }) => buildId
    )
  ).toEqual(["site-1"]);
  expect(
    selectSessionPublishes(items, "site", "b.example").map(
      ({ buildId }) => buildId
    )
  ).toEqual(["site-1", "site-2"]);
  expect(
    selectSessionPublishes(items, "static").map(({ buildId }) => buildId)
  ).toEqual(["static-1"]);
});
