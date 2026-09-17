import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Alert } from "./alert";
import { meta } from "./alert.ws";

describe("Alert", () => {
  test("is stylable in the Builder", () => {
    expect(meta.presetStyle).toBeDefined();
  });

  test("exposes variants as property-driven style states", () => {
    expect(meta.initialProps).toContain("variant");
    expect(meta.states).toEqual([
      { label: "Note", selector: '[data-state="note"]' },
      { label: "Tip", selector: '[data-state="tip"]' },
      { label: "Important", selector: '[data-state="important"]' },
      { label: "Warning", selector: '[data-state="warning"]' },
      { label: "Caution", selector: '[data-state="caution"]' },
    ]);
  });

  test.each(["note", "tip", "important", "warning", "caution"] as const)(
    "renders the %s variant as component state",
    (variant) => {
      const html = renderToStaticMarkup(
        <Alert variant={variant} className="custom">
          <p>Content</p>
        </Alert>
      );

      expect(html).toBe(
        `<div class="custom" role="note" data-state="${variant}"><p>Content</p></div>`
      );
    }
  );
});
