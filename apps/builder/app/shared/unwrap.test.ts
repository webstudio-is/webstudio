import { expect, test } from "vitest";
import { createDraft } from "immer";
import { unwrap } from "./unwrap";

test("returns plain values unchanged", () => {
  const value = { name: "value" };

  expect(unwrap(value)).toBe(value);
});

test("returns current value for immer drafts", () => {
  const draft = createDraft({ name: "draft" });
  draft.name = "updated";

  expect(unwrap(draft)).toEqual({ name: "updated" });
});
