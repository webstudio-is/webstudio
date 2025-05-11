import { expect, test } from "vitest";
import { $, css, renderTemplate, ws } from "@webstudio-is/template";
import { generateFragmentFromHtml } from "./html";

test("generate instances from html", () => {
  expect(
    generateFragmentFromHtml(`
      <main>
        <section>
          <h1>It works!</h1>
          <p>Webstudio is great.</p>
          <ul>
            <li>one</li>
            <li>two</li>
          </ul>
        </section>
      </main>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="main">
        <ws.element ws:tag="section">
          <ws.element ws:tag="h1">It works!</ws.element>
          <ws.element ws:tag="p">Webstudio is great.</ws.element>
          <ws.element ws:tag="ul">
            <ws.element ws:tag="li">one</ws.element>
            <ws.element ws:tag="li">two</ws.element>
          </ws.element>
        </ws.element>
      </ws.element>
    )
  );
});

test("generate multiple root instances from html", () => {
  expect(
    generateFragmentFromHtml(`
      <section>
        <h1>One</h1>
      </section>
      <section>
        <h1>Two</h1>
      </section>
   `)
  ).toEqual(
    renderTemplate(
      <>
        <ws.element ws:tag="section">
          <ws.element ws:tag="h1">One</ws.element>
        </ws.element>
        <ws.element ws:tag="section">
          <ws.element ws:tag="h1">Two</ws.element>
        </ws.element>
      </>
    )
  );
});

test("handle broken html", () => {
  expect(
    generateFragmentFromHtml(`
      <section>
        <h1>One</h1>
      </section attribute="value">
   `)
  ).toEqual(
    renderTemplate(
      <>
        <ws.element ws:tag="section">
          <ws.element ws:tag="h1">One</ws.element>
        </ws.element>
      </>
    )
  );
});

test("handle non-html", () => {
  expect(generateFragmentFromHtml("")).toEqual(renderTemplate(<></>));
  expect(generateFragmentFromHtml("It works!")).toEqual(renderTemplate(<></>));
});

test("ignore custom elements", () => {
  expect(
    generateFragmentFromHtml(`
      <custom-element>
        <div></div>
      </custom-element>
      <section></section>
   `)
  ).toEqual(renderTemplate(<ws.element ws:tag="section"></ws.element>));
});

test("ignore not allowed tags", () => {
  expect(
    generateFragmentFromHtml(`
      <style>style</style>
      <script>script</script>
      <template>template</template>
      <section></section>
   `)
  ).toEqual(renderTemplate(<ws.element ws:tag="section"></ws.element>));
});

test("generate props from html attributes", () => {
  expect(
    generateFragmentFromHtml(`
      <form action="/my-action">
        <button class="my-button">My Button</button>
      </form>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="form" action="/my-action">
        <ws.element ws:tag="button" class="my-button">
          My Button
        </ws.element>
      </ws.element>
    )
  );
});

test("generate props from number and boolean html attributes", () => {
  expect(
    generateFragmentFromHtml(`
      <button autofocus tabindex="-1">My Button</button>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="button" autofocus={true} tabindex={-1}>
        My Button
      </ws.element>
    )
  );
});

test("generate props from number and boolean aria attributes", () => {
  expect(
    generateFragmentFromHtml(`
      <button aria-expanded aria-valuemin="100">My Button</button>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="button" aria-expanded={true} aria-valuemin={100}>
        My Button
      </ws.element>
    )
  );
});

test("wrap text with span when spotted outside of rich text", () => {
  expect(
    generateFragmentFromHtml(`
      <div>div<article>article</article></div>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">
        <ws.element ws:tag="span">div</ws.element>
        <ws.element ws:tag="article">article</ws.element>
      </ws.element>
    )
  );
  expect(
    generateFragmentFromHtml(`
      <div>div<b><img></b></div>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">
        <ws.element ws:tag="span">div</ws.element>
        <ws.element ws:tag="b">
          <ws.element ws:tag="img"></ws.element>
        </ws.element>
      </ws.element>
    )
  );
});

test("do not wrap text with span when spotted near link", () => {
  expect(
    generateFragmentFromHtml(`
      <div>div<a>link</a></div>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">
        div
        <ws.element ws:tag="a">link</ws.element>
      </ws.element>
    )
  );
});

test("collapse any spacing characters inside text", () => {
  expect(
    generateFragmentFromHtml(`
      <div>
        line
        another line
      </div>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">{" line another line "}</ws.element>
    )
  );
});

test("generate style attribute as local styles", () => {
  expect(
    generateFragmentFromHtml(`
      <div style="display: inline"></div>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="div"
        ws:style={css`
          display: inline;
        `}
      ></ws.element>
    )
  );
});

test("paste svg as html embed", () => {
  expect(
    generateFragmentFromHtml(`
      <div>
        <svg viewBox="0 0 20 20">
          <rect x="5" y="5" width="10" height="10" />
        </svg>
      </div>
    `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">
        <$.HtmlEmbed
          code={`<svg viewBox="0 0 20 20">
  <rect x="5" y="5" width="10" height="10" />
</svg>`}
        />
      </ws.element>
    )
  );
});
