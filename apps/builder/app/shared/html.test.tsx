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
      <div>div<b><br></b></div>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">
        <ws.element ws:tag="span">div</ws.element>
        <ws.element ws:tag="b">
          <ws.element ws:tag="br"></ws.element>
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
    renderTemplate(<ws.element ws:tag="div">{"line another line"}</ws.element>)
  );
});

test("collapse any spacing characters inside rich text", () => {
  expect(
    generateFragmentFromHtml(`
      <div>
        <i> line </i>
        <b> another line </b>
        text
      </div>
   `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">
        <ws.element ws:tag="i">line</ws.element>{" "}
        <ws.element ws:tag="b">another line</ws.element> text
      </ws.element>
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

test("optionally paste svg as html embed", () => {
  expect(
    generateFragmentFromHtml(
      `
        <div>
          <svg viewBox="0 0 20 20">
            <rect x="5" y="5" width="10" height="10" />
          </svg>
        </div>
      `,
      {
        unknownTags: true,
      }
    )
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

test("generate textarea element", () => {
  expect(
    generateFragmentFromHtml(`
      <div>
        <textarea>
          my text
        </textarea>
      </div>
    `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">
        <ws.element ws:tag="textarea" value="my text" />
      </ws.element>
    )
  );
});

test("generate select element", () => {
  expect(
    generateFragmentFromHtml(`
      <div>
        <select>
          <option value="one">One</option>
          <option value="two" selected>Two</option>
        </select>
        <select>
          <option>One</option>
          <option selected>Two</option>
        </select>
      </div>
    `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">
        <ws.element ws:tag="select" value="two">
          <ws.element ws:tag="option" value="one">
            One
          </ws.element>
          <ws.element ws:tag="option" value="two">
            Two
          </ws.element>
        </ws.element>
        <ws.element ws:tag="select" value="Two">
          <ws.element ws:tag="option">One</ws.element>
          <ws.element ws:tag="option">Two</ws.element>
        </ws.element>
      </ws.element>
    )
  );
});

test("generate Image component instead of img element", () => {
  expect(
    generateFragmentFromHtml(`
      <div>
        <img src="./my-url">
      </div>
    `)
  ).toEqual(
    renderTemplate(
      <ws.element ws:tag="div">
        <$.Image src="./my-url" />
      </ws.element>
    )
  );
});

test("strip unsupported attribute names", () => {
  expect(
    generateFragmentFromHtml(`
      <button @click="open = true">Expand</button>
      <button x-on:click="open = !open">
        Toggle
      </button>
    `)
  ).toEqual(
    renderTemplate(
      <>
        <ws.element ws:tag="button">Expand</ws.element>
        <ws.element ws:tag="button" x-on:click="open = !open">
          Toggle
        </ws.element>
      </>
    )
  );
});
