import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { composeStories, setProjectAnnotations } from "@storybook/react";
import preview from "virtual:webstudio-visual-preview";
import { modules } from "virtual:webstudio-visual-story-modules";

type VisualRegressionParameters = {
  disableAnimations?: boolean;
  disableIntervals?: boolean;
  hideSelectors?: readonly string[];
  settleTime?: number;
};

type VisualStoryInput = {
  file: string;
  exportName: string;
  title: string;
};

type ComposedStory = React.ComponentType & {
  parameters?: {
    backgrounds?: {
      default?: string;
      values?: Array<{ name: string; value: string }>;
    };
    visualRegression?: VisualRegressionParameters;
  };
};

declare global {
  interface Window {
    finishVisualStory: () => Promise<void>;
    renderVisualStory: (input: VisualStoryInput) => Promise<void>;
    showVisualError: (error: unknown) => void;
  }
}

setProjectAnnotations(preview);

const waitForFrames = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );

const markReady = async (disableAnimations: boolean) => {
  await waitForFrames();
  if (disableAnimations) {
    for (const animation of document.getAnimations()) {
      animation.cancel();
    }
    // Animation components can react to cancellation on the next frame. Wait
    // for those updates and cancel anything they created in response.
    await waitForFrames();
    for (const animation of document.getAnimations()) {
      animation.cancel();
    }
    await waitForFrames();
  }
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  const ready = document.createElement("div");
  ready.id = "visual-ready";
  ready.hidden = true;
  document.body.append(ready);
};

const showError = (error: unknown) => {
  document.querySelector("#visual-ready")?.remove();
  document.querySelector("#visual-error")?.remove();
  const output = document.createElement("pre");
  output.id = "visual-error";
  output.textContent =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  document.body.append(output);
};
window.showVisualError = showError;

window.addEventListener("error", (event) =>
  showError(event.error ?? event.message)
);
window.addEventListener("unhandledrejection", (event) =>
  showError(event.reason)
);

const rootElement = document.querySelector("#root");
if (rootElement === null) {
  throw new Error("Visual story root is missing");
}
let root = createRoot(rootElement);
const originalSetInterval = window.setInterval;
const originalClearInterval = window.clearInterval;
const storyIntervals = new Set<number>();
let disableCurrentAnimations = true;
const OriginalDate = Date;
const fixedTime = Date.UTC(2020, 0, 1);
window.Date = new Proxy(OriginalDate, {
  construct(target, argumentsList, newTarget) {
    return Reflect.construct(
      target,
      argumentsList.length === 0 ? [fixedTime] : argumentsList,
      newTarget
    );
  },
  apply() {
    return new OriginalDate(fixedTime).toString();
  },
});
window.Date.now = () => fixedTime;

window.renderVisualStory = async ({ file, exportName, title }) => {
  flushSync(() => root.unmount());
  rootElement.replaceChildren();
  root = createRoot(rootElement);
  for (const interval of storyIntervals) {
    originalClearInterval(interval);
  }
  storyIntervals.clear();
  for (const element of document.querySelectorAll(
    "body > :not(#root), [data-visual-regression-style]"
  )) {
    element.remove();
  }
  document.body.style.background = "";

  let randomState = 0x12345678;
  Math.random = () => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };
  const load = modules[`/${file}`];
  if (load === undefined) {
    throw new Error(`Visual story module not found: ${file}`);
  }
  const module = await load();
  const meta =
    typeof module.default === "object" && module.default !== null
      ? module.default
      : {};
  const csfModule = {
    ...module,
    default: { ...meta, title },
  } as Parameters<typeof composeStories>[0];
  const stories = composeStories(csfModule) as Record<string, ComposedStory>;
  const Story = stories[exportName];
  if (Story === undefined) {
    throw new Error(`Visual story export not found: ${exportName}`);
  }
  const options = (Story.parameters?.visualRegression ??
    {}) as VisualRegressionParameters;
  disableCurrentAnimations = options.disableAnimations !== false;
  Object.defineProperty(window, "setInterval", {
    configurable: true,
    value:
      options.disableIntervals !== false
        ? () => 0
        : (
            handler: TimerHandler,
            timeout?: number,
            ...arguments_: unknown[]
          ) => {
            const interval = originalSetInterval(
              handler,
              timeout,
              ...arguments_
            );
            storyIntervals.add(interval);
            return interval;
          },
  });
  if (
    options.disableAnimations !== false ||
    options.hideSelectors?.length !== undefined
  ) {
    const style = document.createElement("style");
    style.dataset.visualRegressionStyle = "";
    const rules =
      options.hideSelectors?.map(
        (selector) => `${selector} { visibility: hidden !important; }`
      ) ?? [];
    if (options.disableAnimations !== false) {
      rules.push(`*, *::before, *::after {
  animation-delay: 0s !important;
  animation-duration: 0s !important;
  transition: none !important;
}`);
    }
    style.textContent = rules.join("\n");
    document.head.append(style);
  }

  const backgrounds = Story.parameters?.backgrounds;
  const background = backgrounds?.values?.find(
    ({ name }: { name: string }) => name === backgrounds.default
  );
  if (background?.value !== undefined) {
    document.body.style.background = background.value;
  }

  flushSync(() => root.render(React.createElement(Story)));
  if (options.settleTime !== undefined && options.settleTime > 0) {
    await new Promise((resolve) =>
      window.setTimeout(resolve, options.settleTime)
    );
  }
  await markReady(options.disableAnimations !== false);
};

window.finishVisualStory = async () => {
  if (disableCurrentAnimations === false) {
    return;
  }
  // The browser calls this after fonts and component frames settle. Give
  // animation consumers one frame to react, then freeze the final static state
  // immediately before screenshot capture.
  for (const animation of document.getAnimations()) {
    animation.cancel();
  }
  await waitForFrames();
  for (const animation of document.getAnimations()) {
    animation.cancel();
  }
};

const params = new URLSearchParams(window.location.search);
if (params.has("file")) {
  const file = params.get("file");
  const exportName = params.get("exportName");
  const title = params.get("title");
  if (file !== null && exportName !== null && title !== null) {
    window.renderVisualStory({ file, exportName, title }).catch(showError);
  }
}
