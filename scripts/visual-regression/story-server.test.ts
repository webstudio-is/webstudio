import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parse, type DefaultTreeAdapterTypes as Html } from "parse5";
import { buildVisualStoryApp } from "./story-build";
import {
  startVisualStoryServer,
  startVisualStoryServers,
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

const readVisualStoryDocument = async () =>
  parse(await readFile(new URL("./index.html", import.meta.url), "utf8"));

test("loads the visual harness from a proper HTML entry", async () => {
  const document = await readVisualStoryDocument();
  const root = findElement(document, (element) =>
    element.attrs.some(({ name, value }) => name === "id" && value === "root")
  );
  const script = findElement(
    document,
    (element) => element.tagName === "script"
  );
  assert.equal(root?.parentNode?.nodeName, "body");
  assert.ok(
    script?.attrs.some(
      ({ name, value }) => name === "src" && value === "/harness.tsx"
    )
  );
});

test("does not disable animations before reading the story parameters", async () => {
  const document = await readVisualStoryDocument();
  const style = findElement(document, (element) => element.tagName === "style");
  const css = style?.childNodes
    .filter((node): node is Html.TextNode => node.nodeName === "#text")
    .map((node) => node.value)
    .join("");

  assert.doesNotMatch(css ?? "", /animation-(?:delay|duration)|transition/);
});

test("does not leak Vite's production environment", async () => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "visual-build-"));
  const nodeEnvironment = process.env.NODE_ENV;
  delete process.env.NODE_ENV;
  try {
    await buildVisualStoryApp({
      root: process.cwd(),
      outputDirectory,
      storyFiles: [
        "packages/design-system/src/components/color-picker.stories.tsx",
      ],
    });
    assert.equal(process.env.NODE_ENV, undefined);
  } finally {
    if (nodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = nodeEnvironment;
    }
    await rm(outputDirectory, { recursive: true, force: true });
  }
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
