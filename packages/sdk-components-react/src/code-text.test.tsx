// @vitest-environment jsdom

import { createRef } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act, render, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import javascript from "@shikijs/langs/javascript";
import githubLight from "@shikijs/themes/github-light";
import nord from "@shikijs/themes/nord";
import { createCodeText } from "./code-text";
import { CodeText } from "./code-text-base";

const HighlightedCodeText = createCodeText({
  languages: [javascript],
  themes: [githubLight, nord],
});

test("renders highlighted HAST inside the semantic code root", () => {
  const markup = renderToStaticMarkup(
    <HighlightedCodeText
      className="custom-code"
      code="const answer = 42;"
      language="javascript"
      theme="github-light"
    />
  );

  expect(markup).toMatch(/^<code/);
  expect(markup).not.toContain("<pre");
  expect(markup).toContain("shiki");
  expect(markup).toContain("github-light");
  expect(markup).toContain("custom-code");
  expect(markup).toContain("<span");
  expect(markup).not.toContain('language="javascript"');
  const container = document.createElement("div");
  container.innerHTML = markup;
  expect(container.querySelector("code")?.getAttribute("tabindex")).toBeNull();
});

test("keeps theme colors without changing typography", () => {
  const markup = renderToStaticMarkup(
    <HighlightedCodeText code="// answer" language="javascript" theme="nord" />
  );
  const container = document.createElement("div");
  container.innerHTML = markup;
  const codeElement = container.querySelector("code");

  expect(
    codeElement?.style.getPropertyValue("--w-code-text-theme-background")
  ).toBe("#2e3440ff");
  expect(codeElement?.style.getPropertyValue("--w-code-text-theme-color")).toBe(
    "#d8dee9ff"
  );
  expect(markup).not.toContain("font-style");
  expect(markup).not.toContain("font-weight");
});

test("preserves an author-provided tab index", () => {
  const markup = renderToStaticMarkup(
    <HighlightedCodeText
      code="const answer = 42;"
      language="javascript"
      theme="github-light"
      tabIndex={0}
    />
  );

  expect(markup).toContain('tabindex="0"');
});

test("allows a failed asset load to retry after remount", async () => {
  let languageAttempts = 0;
  const AsyncCodeText = createCodeText({
    loaders: {
      language: async () => {
        languageAttempts += 1;
        return languageAttempts === 1 ? undefined : javascript;
      },
      theme: async () => githubLight,
    },
  });
  const props = {
    code: "const answer = 42;",
    language: "javascript",
    theme: "github-light",
  } as const;

  const firstRender = render(<AsyncCodeText {...props} />);
  await waitFor(() => expect(languageAttempts).toBe(1));
  firstRender.unmount();

  const secondRender = render(<AsyncCodeText {...props} />);
  await waitFor(() => expect(languageAttempts).toBe(2));
  await waitFor(() =>
    expect(secondRender.container.querySelector("code span")).not.toBeNull()
  );
});

test("keeps source code escaped", () => {
  const source = '<img src=x onerror="unsafe()">';
  const markup = renderToStaticMarkup(
    <HighlightedCodeText
      code={source}
      language="javascript"
      theme="github-light"
    />
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

test("falls back to plain code for an unavailable selection", () => {
  expect(
    renderToStaticMarkup(
      <HighlightedCodeText code="puts :hello" language="ruby" theme="nord" />
    )
  ).toBe("<code>puts :hello</code>");
});

test("preserves the empty-code placeholder", () => {
  expect(
    renderToStaticMarkup(
      <HighlightedCodeText
        code=" "
        language="javascript"
        theme="github-light"
      />
    )
  ).toContain("Open the &quot;Settings&quot; panel to edit the code.");
});

test("hydrates the server markup without changing the DOM", async () => {
  const element = (
    <HighlightedCodeText
      code="const answer = 42;"
      language="javascript"
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
      language="javascript"
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

test("preserves the HTML language of legacy plain Code Text", () => {
  expect(renderToStaticMarkup(<CodeText lang="en">legacy code</CodeText>)).toBe(
    '<code lang="en">legacy code</code>'
  );
});
