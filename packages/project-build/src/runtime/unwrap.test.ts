import { createDraft } from "immer";
import { expect, test } from "vitest";
import { unwrap } from "./unwrap";

test("returns plain values unchanged", () => {
  const value = { name: "Page" };

  expect(unwrap(value)).toBe(value);
});

test("returns current value for immer drafts", () => {
  const draft = createDraft({ name: "Page" });
  draft.name = "Updated";

  expect(unwrap(draft)).toEqual({ name: "Updated" });
});
