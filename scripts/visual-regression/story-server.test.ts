import assert from "node:assert/strict";
import test from "node:test";
import { parse, type DefaultTreeAdapterTypes as Html } from "parse5";
import {
  startVisualStoryServer,
  startVisualStoryServers,
  visualStoryHtml,
} from "./story-server";

const findElement = (
  node: Html.Node,
  predicate: (element: Html.Element) => boolean
): Html.Element | undefined => {
  if ("tagName" in node && predicate(node)) {
    return node;
  }
  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      const match = findElement(child, predicate);
      if (match !== undefined) {
        return match;
      }
    }
  }
};

test("keeps the bundled story stylesheet outside the disposable body content", () => {
  const document = parse(visualStoryHtml);
  const stylesheet = findElement(
    document,
    (element) =>
      element.tagName === "link" &&
      element.attrs.some(
        ({ name, value }) => name === "href" && value === "/harness.css"
      )
  );
  assert.equal(stylesheet?.parentNode?.nodeName, "head");
});

test("does not disable animations before reading the story parameters", () => {
  const document = parse(visualStoryHtml);
  const style = findElement(document, (element) => element.tagName === "style");
  const css = style?.childNodes
    .filter((node): node is Html.TextNode => node.nodeName === "#text")
    .map((node) => node.value)
    .join("");

  assert.doesNotMatch(css ?? "", /animation-(?:delay|duration)|transition/);
});

test("closes servers that started before a concurrent startup failure", async () => {
  let releaseSuccessfulServer: (() => void) | undefined;
  const successfulServerReady = new Promise<void>((resolve) => {
    releaseSuccessfulServer = resolve;
  });
  let closed = false;
  const startServer = async (
    options: Parameters<typeof startVisualStoryServer>[0]
  ) => {
    if (options.port === 6102) {
      throw new Error("Current story server failed");
    }
    await successfulServerReady;
    return {
      async close() {
        closed = true;
      },
    };
  };
  const startup = startVisualStoryServers(
    [
      { root: "/repo", port: 6101, outputDirectory: "/one", storyFiles: [] },
      { root: "/repo", port: 6102, outputDirectory: "/two", storyFiles: [] },
    ],
    startServer
  );
  releaseSuccessfulServer?.();

  await assert.rejects(startup, /Current story server failed/);
  assert.equal(closed, true);
});
