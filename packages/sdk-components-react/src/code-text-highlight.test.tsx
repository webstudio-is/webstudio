// @vitest-environment jsdom

import { createRef } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act } from "@testing-library/react";
import { expect, test } from "vitest";
import javascript from "@shikijs/langs/javascript";
import githubLight from "@shikijs/themes/github-light";
import { createCodeText } from "./code-text-highlight";

const HighlightedCodeText = createCodeText({
  languages: [javascript],
  themes: [githubLight],
});

test("renders highlighted HAST inside the semantic code root", () => {
  const markup = renderToStaticMarkup(
    <HighlightedCodeText
      className="custom-code"
      code="const answer = 42;"
      lang="javascript"
      theme="github-light"
    />
  );

  expect(markup).toMatch(/^<code/);
  expect(markup).not.toContain("<pre");
  expect(markup).toContain("shiki");
  expect(markup).toContain("github-light");
  expect(markup).toContain("custom-code");
  expect(markup).toContain("<span");
  expect(markup).not.toContain('lang="javascript"');
});

test("keeps source code escaped", () => {
  const source = '<img src=x onerror="unsafe()">';
  const markup = renderToStaticMarkup(
    <HighlightedCodeText code={source} lang="javascript" theme="github-light" />
  );

  expect(markup).toContain("&lt;");
  expect(markup).toContain("img");
  expect(markup).not.toContain("<img");
  expect(markup).not.toContain("onerror=");
  const container = document.createElement("div");
  container.innerHTML = markup;
  expect(container.textContent).toBe(source);
  expect(container.querySelector("img")).toBeNull();
});

test("renders legacy content without highlighting configuration", () => {
  expect(
    renderToStaticMarkup(<HighlightedCodeText>legacy code</HighlightedCodeText>)
  ).toBe("<code>legacy code</code>");
});

test("hydrates the server markup without changing the DOM", async () => {
  const element = (
    <HighlightedCodeText
      code="const answer = 42;"
      lang="javascript"
      theme="github-light"
    />
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(element);
  const serverMarkup = container.innerHTML;

  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(container, element);
  });
  expect(container.innerHTML).toBe(serverMarkup);
  await act(async () => root.unmount());
});

test("forwards the code element ref", async () => {
  const ref = createRef<HTMLElement>();
  const container = document.createElement("div");
  document.body.append(container);

  let root: ReturnType<typeof hydrateRoot>;
  const element = (
    <HighlightedCodeText
      ref={ref}
      code="const answer = 42;"
      lang="javascript"
      theme="github-light"
    />
  );
  container.innerHTML = renderToString(element);
  await act(async () => {
    root = hydrateRoot(container, element);
  });
  expect(ref.current?.tagName).toBe("CODE");
  await act(async () => root.unmount());
  container.remove();
});
