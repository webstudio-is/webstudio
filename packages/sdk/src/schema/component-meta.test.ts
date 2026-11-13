import { expect, test } from "vitest";
import {
  normalizeComponentCategory,
  shouldFilterComponentCategory,
  wsComponentMeta,
} from "./component-meta";

test("treats omitted component category as hidden", () => {
  expect(normalizeComponentCategory(undefined)).toBe("hidden");
  expect(shouldFilterComponentCategory(undefined)).toBe(true);
});

test("filters hidden and internal component categories", () => {
  expect(shouldFilterComponentCategory("hidden")).toBe(true);
  expect(shouldFilterComponentCategory("internal")).toBe(true);
  expect(shouldFilterComponentCategory("general")).toBe(false);
});

test("allows only safe resource fields in generated component props", () => {
  const createMeta = (field: string) => ({
    props: {
      action: {
        control: "resource",
        type: "resource",
        required: false,
        generatedProps: [field],
      },
    },
  });

  expect(wsComponentMeta.safeParse(createMeta("method")).success).toBe(true);
  expect(wsComponentMeta.safeParse(createMeta("url")).success).toBe(false);
});

test("accepts component text content editor metadata", () => {
  const textContent = {
    control: "textContent" as const,
    type: "string" as const,
    required: false,
    editor: {
      control: "code" as const,
      languageProp: "language",
    },
  };
  expect(
    wsComponentMeta.parse({
      textContent: {
        ...textContent,
      },
    }).textContent
  ).toEqual(textContent);
});
