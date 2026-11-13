import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test } from "vitest";
import "../colors/colors.css";
import { InfoTooltip } from "./info-tooltip";
import { TooltipProvider } from "./tooltip";

let root: Root | undefined;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("InfoTooltip has a named keyboard trigger and shows its content on focus", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider delayDuration={0}>
        <InfoTooltip label="About field" content="Field explanation" />
      </TooltipProvider>
    )
  );

  const icon = container.querySelector<SVGElement>(
    'svg[aria-label="About field"]'
  );
  expect(icon?.tabIndex).toBe(0);
  await act(async () => userEvent.tab());
  expect(document.activeElement).toBe(icon);
  expect(document.querySelector('[role="tooltip"]')?.textContent).toContain(
    "Field explanation"
  );
});

test("InfoTooltip keeps links inside its content available", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider delayDuration={0}>
        <InfoTooltip
          label="About links"
          content={<a href="#help">Read the guide</a>}
        />
      </TooltipProvider>
    )
  );

  await act(async () => userEvent.tab());
  const link = document.querySelector<HTMLAnchorElement>('[role="tooltip"] a');
  expect(link?.getAttribute("href")).toBe("#help");
});
