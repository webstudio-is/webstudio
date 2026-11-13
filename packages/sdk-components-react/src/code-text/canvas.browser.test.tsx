import { render, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { canvasComponents } from "../canvas-components";

const CanvasCodeText = canvasComponents.CodeText;

test("loads highlighting without replacing the code element", async () => {
  const { container, rerender } = render(
    <CanvasCodeText language="javascript" theme="github-light" tabIndex={0}>
      const answer = 42;
    </CanvasCodeText>
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
    <CanvasCodeText language="javascript" theme="nord" tabIndex={0}>
      const answer = 42;
    </CanvasCodeText>
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

test("renders stable plain text while editing", async () => {
  const { container } = render(
    <CanvasCodeText
      data-ws-text-editing=""
      language="javascript"
      theme="github-light"
    >
      const answer = 42;
    </CanvasCodeText>
  );

  await waitFor(() =>
    expect(container.querySelector("code")?.textContent).toBe(
      "const answer = 42;"
    )
  );
  expect(container.querySelector("code span")).toBeNull();
});
