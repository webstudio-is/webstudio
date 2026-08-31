import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Alert } from "./alert";

describe("Alert", () => {
  test.each([
    ["note", "Note"],
    ["tip", "Tip"],
    ["important", "Important"],
    ["warning", "Warning"],
    ["caution", "Caution"],
  ] as const)("renders the %s variant", (variant, title) => {
    const html = renderToStaticMarkup(
      <Alert variant={variant} className="custom">
        <p>Content</p>
      </Alert>
    );

    expect(html).toBe(
      `<div class="custom markdown-alert markdown-alert-${variant}" role="note" data-variant="${variant}"><p class="markdown-alert-title">${title}</p><p>Content</p></div>`
    );
  });
});
