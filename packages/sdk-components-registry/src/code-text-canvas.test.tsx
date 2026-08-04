// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { CanvasCodeText } from "./code-text-canvas";

test("loads the selected language and theme for the Builder canvas", async () => {
  const { container } = render(
    <CanvasCodeText
      code="const answer = 42;"
      lang="javascript"
      theme="github-light"
    />
  );

  expect(container.querySelector("code")?.textContent).toBe(
    "const answer = 42;"
  );
  await waitFor(() =>
    expect(container.querySelector("code span")).not.toBeNull()
  );
});
