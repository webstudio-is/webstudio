// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { CanvasCodeText } from "./code-text-canvas";

test("loads highlighting without replacing the code element", async () => {
  const { container, rerender } = render(
    <CanvasCodeText
      code="const answer = 42;"
      language="javascript"
      theme="github-light"
      tabIndex={0}
    />
  );

  const codeElement = container.querySelector("code");
  expect(codeElement?.textContent).toBe("const answer = 42;");
  codeElement?.focus();
  await waitFor(() =>
    expect(container.querySelector("code span")).not.toBeNull()
  );
  expect(container.querySelector("code")).toBe(codeElement);
  expect(document.activeElement).toBe(codeElement);

  rerender(
    <CanvasCodeText
      code="const answer = 42;"
      language="javascript"
      theme="nord"
      tabIndex={0}
    />
  );
  await waitFor(() => {
    const updatedCodeElement = container.querySelector("code");
    expect(
      updatedCodeElement?.style.getPropertyValue(
        "--w-code-text-theme-background"
      )
    ).toBe("#2e3440ff");
    expect(updatedCodeElement?.className).toBe("");
  });
  expect(container.querySelector("code")).toBe(codeElement);
  expect(document.activeElement).toBe(codeElement);
});
