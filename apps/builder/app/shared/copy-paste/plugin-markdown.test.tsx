import { test, expect } from "vitest";
import { $, renderTemplate, ws } from "@webstudio-is/template";
import { __testing__ } from "./plugin-markdown";

const { parse } = __testing__;

test("paragraph", () => {
  expect(parse("xyz")).toEqual(
    renderTemplate(<ws.element ws:tag="p">xyz</ws.element>)
  );
});

test("h1", () => {
  expect(parse("# heading")).toEqual(
    renderTemplate(<ws.element ws:tag="h1">heading</ws.element>)
  );
});

test("h6", () => {
  expect(parse("###### heading")).toEqual(
    renderTemplate(<ws.element ws:tag="h6">heading</ws.element>)
  );
});

test("bold 1", () => {
  expect(parse("__bold__")).toEqual(
    renderTemplate(
      <ws.element ws:tag="p">
        <ws.element ws:tag="strong">bold</ws.element>
      </ws.element>
    )
  );
});

test("bold 2", () => {
  expect(parse("**bold**")).toEqual(
    renderTemplate(
      <ws.element ws:tag="p">
        <ws.element ws:tag="strong">bold</ws.element>
      </ws.element>
    )
  );
});

test("italic 1", () => {
  expect(parse("_italic_")).toEqual(
    renderTemplate(
      <ws.element ws:tag="p">
        <ws.element ws:tag="em">italic</ws.element>
      </ws.element>
    )
  );
});

test("italic 2", () => {
  expect(parse("*italic*")).toEqual(
    renderTemplate(
      <ws.element ws:tag="p">
        <ws.element ws:tag="em">italic</ws.element>
      </ws.element>
    )
  );
});

test("link", () => {
  expect(parse('[link](/uri "Title")')).toEqual(
    renderTemplate(
      <ws.element ws:tag="p">
        <ws.element ws:tag="a" href="/uri" title="Title">
          link
        </ws.element>
      </ws.element>
    )
  );
});

test("autolink", () => {
  expect(parse("https://github.com")).toEqual(
    renderTemplate(
      <ws.element ws:tag="p">
        <ws.element ws:tag="a" href="https://github.com">
          https://github.com
        </ws.element>
      </ws.element>
    )
  );
});

test("image", () => {
  expect(parse('![foo](/url "title")')).toEqual(
    renderTemplate(
      <ws.element ws:tag="p">
        <$.Image src="/url" alt="foo" title="title" />
      </ws.element>
    )
  );
});

test("hard line break", () => {
  expect(
    parse(`foo  
      baz`)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="p">
        <ws.element ws:tag="span">foo</ws.element>
        <ws.element ws:tag="br" />
        <ws.element ws:tag="span"> baz</ws.element>
      </ws.element>
    )
  );
});

test("soft line break", () => {
  expect(
    parse(`foo
      baz`)
  ).toEqual(renderTemplate(<ws.element ws:tag="p">foo baz</ws.element>));
});

test("blockquote", () => {
  expect(parse("> bar")).toEqual(
    renderTemplate(
      <ws.element ws:tag="blockquote">
        <ws.element ws:tag="p">bar</ws.element>
      </ws.element>
    )
  );
});

test("inline code", () => {
  expect(parse("`foo` and `bar`")).toEqual(
    renderTemplate(
      <ws.element ws:tag="p">
        <ws.element ws:tag="code">foo</ws.element>
        <ws.element ws:tag="span"> and </ws.element>
        <ws.element ws:tag="code">bar</ws.element>
      </ws.element>
    )
  );
});

test("code", () => {
  expect(parse("```js meta\nfoo\nbar\n```")).toEqual(
    renderTemplate(
      <ws.element ws:tag="pre">
        <ws.element ws:tag="code" class="language-js">
          {"foo\nbar\n"}
        </ws.element>
      </ws.element>
    )
  );
});

test("list unordered", () => {
  expect(parse("- one")).toEqual(
    renderTemplate(
      <ws.element ws:tag="ul">
        <ws.element ws:tag="li">one</ws.element>
      </ws.element>
    )
  );
});

test("list ordered", () => {
  expect(parse("3. one")).toEqual(
    renderTemplate(
      <ws.element ws:tag="ol" start={3}>
        <ws.element ws:tag="li">one</ws.element>
      </ws.element>
    )
  );
});

test("thematic break | separator", () => {
  expect(parse("---")).toEqual(renderTemplate(<ws.element ws:tag="hr" />));
});

test("strikethrough", () => {
  expect(parse("~One~\n\n~~two~~")).toEqual(
    renderTemplate(
      <>
        <ws.element ws:tag="p">
          <ws.element ws:tag="del">One</ws.element>
        </ws.element>
        <ws.element ws:tag="p">
          <ws.element ws:tag="del">two</ws.element>
        </ws.element>
      </>
    )
  );
});

test("preserve spaces between strong and em", () => {
  expect(parse("**One** *two* text")).toEqual(
    renderTemplate(
      <>
        <ws.element ws:tag="p">
          <ws.element ws:tag="strong">One</ws.element>{" "}
          <ws.element ws:tag="em">two</ws.element>
          {" text"}
        </ws.element>
      </>
    )
  );
});

test("table", () => {
  expect(
    parse(`
| Header 1   | Header 2   |
|------------|------------|
| Cell 1.1   | Cell 1.2   |
| Cell 2.1   | Cell 2.2   |
`)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="table">
        <ws.element ws:tag="thead">
          <ws.element ws:tag="tr">
            <ws.element ws:tag="th">Header 1</ws.element>
            <ws.element ws:tag="th">Header 2</ws.element>
          </ws.element>
        </ws.element>
        <ws.element ws:tag="tbody">
          <ws.element ws:tag="tr">
            <ws.element ws:tag="td">Cell 1.1</ws.element>
            <ws.element ws:tag="td">Cell 1.2</ws.element>
          </ws.element>
          <ws.element ws:tag="tr">
            <ws.element ws:tag="td">Cell 2.1</ws.element>
            <ws.element ws:tag="td">Cell 2.2</ws.element>
          </ws.element>
        </ws.element>
      </ws.element>
    )
  );
});
