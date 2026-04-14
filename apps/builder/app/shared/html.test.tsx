import { expect, test, describe } from "vitest";
import { $, css, renderTemplate, token, ws } from "@webstudio-is/template";
import { generateFragmentFromHtml as _generateFragmentFromHtml } from "./html";

// Wrapper that strips skippedSelectors for tests that only compare fragment shape
const generateFragmentFromHtml = (html: string) => {
  const { skippedSelectors: _skipped, ...fragment } =
    _generateFragmentFromHtml(html);
  return fragment;
};

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
    generateFragmentFromHtml(`<div><marquee>test</marquee></div>`)
  ).toEqual(renderTemplate(<ws.element ws:tag="div"></ws.element>));
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

test("script as html embed", () => {
  expect(generateFragmentFromHtml(`<script>a;</script>`)).toEqual(
    renderTemplate(
      <$.HtmlEmbed
        ws:label="Script"
        clientOnly={true}
        code={`<script>a;</script>`}
      />
    )
  );
});

test("style as html embed", () => {
  expect(generateFragmentFromHtml(`<style>a;</style>`)).toEqual(
    renderTemplate(<$.HtmlEmbed code={`<style>a;</style>`} ws:label="Style" />)
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

describe("style tag to tokens", () => {
  test("extract single class from style tag as token", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>.card { display: flex; }</style>
        <div class="card">Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" ws:tokens={[cardToken]}>
          Hello
        </ws.element>
      )
    );
  });

  test("extract multiple classes from style tag as tokens", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
        padding: 16px;
      `
    );
    const titleToken = token(
      "title",
      css`
        font-size: 24px;
        font-weight: bold;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>
          .card { display: flex; padding: 16px; }
          .title { font-size: 24px; font-weight: bold; }
        </style>
        <div class="card">
          <h1 class="title">Hello</h1>
        </div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" ws:tokens={[cardToken]}>
          <ws.element ws:tag="h1" ws:tokens={[titleToken]}>
            Hello
          </ws.element>
        </ws.element>
      )
    );
  });

  test("reuse same token when class appears on multiple elements", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>.card { display: flex; }</style>
        <div class="card">
          <section class="card">Hello</section>
        </div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" ws:tokens={[cardToken]}>
          <ws.element ws:tag="section" ws:tokens={[cardToken]}>
            Hello
          </ws.element>
        </ws.element>
      )
    );
  });

  test("preserve unresolved class names as class prop", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>.card { display: flex; }</style>
        <div class="card external-lib">Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" class="external-lib" ws:tokens={[cardToken]}>
          Hello
        </ws.element>
      )
    );
  });

  test("remove class prop entirely when all classes resolved to tokens", () => {
    const fragment = generateFragmentFromHtml(`
      <style>.card { display: flex; }</style>
      <div class="card">Hello</div>
    `);
    expect(fragment.props.find((p) => p.name === "class")).toBeUndefined();
  });

  test("combine inline style attribute with class token", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>.card { display: flex; }</style>
        <div class="card" style="color: red">Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            color: red;
          `}
          ws:tokens={[cardToken]}
        >
          Hello
        </ws.element>
      )
    );
  });

  test("no html embed when all style rules are class rules", () => {
    const fragment = generateFragmentFromHtml(`
      <style>
        .card { display: flex; }
        .title { font-size: 24px; }
      </style>
      <div class="card">
        <h1 class="title">Hello</h1>
      </div>
    `);
    expect(fragment.instances.some((i) => i.component === "HtmlEmbed")).toBe(
      false
    );
  });

  test("keep style tag as html embed when it has no class rules", () => {
    expect(
      generateFragmentFromHtml(`
        <style>#hero { color: red; }</style>
        <div>Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <>
          <$.HtmlEmbed
            ws:label="Style"
            code={`<style>#hero { color: red; }</style>`}
          />
          <ws.element ws:tag="div">Hello</ws.element>
        </>
      )
    );
  });

  test("extract class rules and keep remaining rules as html embed", () => {
    const fragment = generateFragmentFromHtml(`
      <style>
        .card { display: flex; }
        #hero { color: red; }
      </style>
      <div class="card">Hello</div>
    `);
    // token for .card should be created
    const tokenSource = fragment.styleSources.find(
      (s) => s.type === "token" && s.name === "card"
    );
    expect(tokenSource).toBeDefined();
    // remaining #hero rule should stay as HtmlEmbed
    const htmlEmbed = fragment.instances.find(
      (i) => i.component === "HtmlEmbed"
    );
    expect(htmlEmbed).toBeDefined();
    const codeProp = fragment.props.find(
      (p) => p.instanceId === htmlEmbed!.id && p.name === "code"
    );
    expect(codeProp).toBeDefined();
    expect(codeProp!.type === "string" && codeProp!.value).toContain("#hero");
    // class prop should not be set since .card was resolved
    expect(fragment.props.find((p) => p.name === "class")).toBeUndefined();
  });

  test("extract classes from multiple style tags", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
      `
    );
    const titleToken = token(
      "title",
      css`
        font-size: 24px;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>.card { display: flex; }</style>
        <style>.title { font-size: 24px; }</style>
        <div class="card">
          <h1 class="title">Hello</h1>
        </div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" ws:tokens={[cardToken]}>
          <ws.element ws:tag="h1" ws:tokens={[titleToken]}>
            Hello
          </ws.element>
        </ws.element>
      )
    );
  });

  test("resolve nested selectors - descendant", () => {
    const cardInnerToken = token(
      "card__inner",
      css`
        color: red;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>.card .inner { color: red; }</style>
        <div class="card">
          <span class="inner">Hello</span>
        </div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" class="card">
          <ws.element ws:tag="span" ws:tokens={[cardInnerToken]}>
            Hello
          </ws.element>
        </ws.element>
      )
    );
  });

  test("resolve nested selectors - child combinator", () => {
    const parentChildToken = token(
      "parent__child",
      css`
        margin: 0;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>.parent > .child { margin: 0; }</style>
        <div class="parent"><span class="child">Hello</span></div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" class="parent">
          <ws.element ws:tag="span" ws:tokens={[parentChildToken]}>
            Hello
          </ws.element>
        </ws.element>
      )
    );
  });

  test("ignore element selectors in style tag", () => {
    // element selectors like `div { }` should not become tokens
    expect(
      generateFragmentFromHtml(`
        <style>div { color: red; }</style>
        <div>Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <>
          <$.HtmlEmbed
            ws:label="Style"
            code={`<style>div { color: red; }</style>`}
          />
          <ws.element ws:tag="div">Hello</ws.element>
        </>
      )
    );
  });

  test("handle multiple classes on one element with multiple tokens", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
      `
    );
    const largeToken = token(
      "large",
      css`
        font-size: 32px;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>
          .card { display: flex; }
          .large { font-size: 32px; }
        </style>
        <div class="card large">Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" ws:tokens={[cardToken, largeToken]}>
          Hello
        </ws.element>
      )
    );
  });

  test("handle class with multiple properties", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
        gap: 16px;
        padding: 24px;
        border-radius: 8px;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>
          .card {
            display: flex;
            gap: 16px;
            padding: 24px;
            border-radius: 8px;
          }
        </style>
        <div class="card">Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" ws:tokens={[cardToken]}>
          Hello
        </ws.element>
      )
    );
  });

  test("empty style tag produces no html embed", () => {
    expect(
      generateFragmentFromHtml(`
        <style></style>
        <div>Hello</div>
      `)
    ).toEqual(renderTemplate(<ws.element ws:tag="div">Hello</ws.element>));
  });

  test("class attribute without any style tag stays as prop", () => {
    // existing behavior: class is just a prop when no style tag is present
    expect(
      generateFragmentFromHtml(`
        <div class="my-class">Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" class="my-class">
          Hello
        </ws.element>
      )
    );
  });

  test("style tag with only whitespace produces no html embed", () => {
    expect(
      generateFragmentFromHtml(`
        <style>   </style>
        <div>Hello</div>
      `)
    ).toEqual(renderTemplate(<ws.element ws:tag="div">Hello</ws.element>));
  });

  test("extract token and apply to nested structure", () => {
    const wrapperToken = token(
      "wrapper",
      css`
        max-width: 1200px;
        margin-left: auto;
        margin-right: auto;
      `
    );
    const gridToken = token(
      "grid",
      css`
        display: grid;
        gap: 16px;
      `
    );
    const itemToken = token(
      "item",
      css`
        padding: 8px;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>
          .wrapper { max-width: 1200px; margin-left: auto; margin-right: auto; }
          .grid { display: grid; gap: 16px; }
          .item { padding: 8px; }
        </style>
        <div class="wrapper">
          <div class="grid">
            <div class="item">One</div>
            <div class="item">Two</div>
            <div class="item">Three</div>
          </div>
        </div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="div" ws:tokens={[wrapperToken]}>
          <ws.element ws:tag="div" ws:tokens={[gridToken]}>
            <ws.element ws:tag="div" ws:tokens={[itemToken]}>
              One
            </ws.element>
            <ws.element ws:tag="div" ws:tokens={[itemToken]}>
              Two
            </ws.element>
            <ws.element ws:tag="div" ws:tokens={[itemToken]}>
              Three
            </ws.element>
          </ws.element>
        </ws.element>
      )
    );
  });

  test("element with both resolved and unresolved classes plus inline style", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>.card { display: flex; }</style>
        <div class="card external" style="color: red">Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          class="external"
          ws:style={css`
            color: red;
          `}
          ws:tokens={[cardToken]}
        >
          Hello
        </ws.element>
      )
    );
  });

  test("token names preserve original class names", () => {
    const fragment = generateFragmentFromHtml(`
      <style>
        .my-component { display: flex; }
        .text-lg { font-size: 18px; }
        .bg_primary { background-color: blue; }
      </style>
      <div class="my-component">
        <span class="text-lg bg_primary">Hello</span>
      </div>
    `);
    const tokenNames = fragment.styleSources
      .filter((s) => s.type === "token")
      .map((s) => (s as { name: string }).name);
    expect(tokenNames).toContain("my-component");
    expect(tokenNames).toContain("text-lg");
    expect(tokenNames).toContain("bg_primary");
  });

  test("class defined in style tag but not used by any element", () => {
    const fragment = generateFragmentFromHtml(`
      <style>
        .used { display: flex; }
        .unused { color: red; }
      </style>
      <div class="used">Hello</div>
    `);
    // all class rules become tokens, even if not referenced by elements
    const tokenNames = fragment.styleSources
      .filter((s) => s.type === "token")
      .map((s) => (s as { name: string }).name);
    expect(tokenNames).toContain("used");
    expect(tokenNames).toContain("unused");
    // only "used" is assigned to the instance
    const divInstance = fragment.instances.find((i) => i.tag === "div");
    const sel = fragment.styleSourceSelections.find(
      (s) => s.instanceId === divInstance?.id
    );
    const usedToken = fragment.styleSources.find(
      (s) => s.type === "token" && s.name === "used"
    );
    const unusedToken = fragment.styleSources.find(
      (s) => s.type === "token" && s.name === "unused"
    );
    expect(sel?.values).toContain(usedToken?.id);
    expect(sel?.values).not.toContain(unusedToken?.id);
    // no HtmlEmbed since all rules are class rules
    expect(fragment.instances.some((i) => i.component === "HtmlEmbed")).toBe(
      false
    );
  });

  test("duplicate class rules across multiple style tags are merged", () => {
    const fragment = generateFragmentFromHtml(`
      <style>.card { display: flex; }</style>
      <style>.card { padding: 16px; }</style>
      <div class="card">Hello</div>
    `);
    // should create a single token with both properties
    const tokens = fragment.styleSources.filter((s) => s.type === "token");
    expect(tokens).toHaveLength(1);
    const tokenId = tokens[0].id;
    const tokenStyles = fragment.styles.filter(
      (s) => s.styleSourceId === tokenId
    );
    const properties = tokenStyles.map((s) => s.property);
    expect(properties).toContain("display");
    expect(properties).toContain("paddingTop");
  });

  test("script tag still becomes html embed alongside token extraction", () => {
    const cardToken = token(
      "card",
      css`
        display: flex;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>.card { display: flex; }</style>
        <script>console.log("hi");</script>
        <div class="card">Hello</div>
      `)
    ).toEqual(
      renderTemplate(
        <>
          <$.HtmlEmbed
            ws:label="Script"
            clientOnly={true}
            code={`<script>console.log("hi");</script>`}
          />
          <ws.element ws:tag="div" ws:tokens={[cardToken]}>
            Hello
          </ws.element>
        </>
      )
    );
  });

  test("style tag with pseudo-class creates token with state", () => {
    const fragment = generateFragmentFromHtml(`
      <style>
        .btn { background-color: blue; }
        .btn:hover { background-color: darkblue; }
      </style>
      <button class="btn">Click me</button>
    `);
    const tokenSource = fragment.styleSources.find(
      (s) => s.type === "token" && s.name === "btn"
    );
    expect(tokenSource).toBeDefined();
    // base style
    const baseStyle = fragment.styles.find(
      (s) =>
        s.styleSourceId === tokenSource!.id &&
        s.property === "backgroundColor" &&
        s.state === undefined
    );
    expect(baseStyle).toBeDefined();
    // hover state style
    const hoverStyle = fragment.styles.find(
      (s) =>
        s.styleSourceId === tokenSource!.id &&
        s.property === "backgroundColor" &&
        s.state === ":hover"
    );
    expect(hoverStyle).toBeDefined();
  });

  test("style tag with media query creates token with breakpoint styles", () => {
    const fragment = generateFragmentFromHtml(`
      <style>
        .container { padding: 8px; }
        @media (min-width: 768px) {
          .container { padding: 16px; }
        }
      </style>
      <div class="container">Hello</div>
    `);
    const tokenSource = fragment.styleSources.find(
      (s) => s.type === "token" && s.name === "container"
    );
    expect(tokenSource).toBeDefined();
    // should have styles on different breakpoints
    const tokenStyles = fragment.styles.filter(
      (s) => s.styleSourceId === tokenSource!.id
    );
    const breakpointIds = new Set(tokenStyles.map((s) => s.breakpointId));
    // should have at least 2 different breakpoints (base + media query)
    expect(breakpointIds.size).toBeGreaterThanOrEqual(2);
  });

  test("handle real-world html snippet with style tag", () => {
    const heroToken = token(
      "hero",
      css`
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 64px;
      `
    );
    const heroTitleToken = token(
      "hero-title",
      css`
        font-size: 48px;
        font-weight: bold;
        line-height: 1.2;
      `
    );
    const heroTextToken = token(
      "hero-text",
      css`
        font-size: 18px;
        color: gray;
      `
    );
    expect(
      generateFragmentFromHtml(`
        <style>
          .hero {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 64px;
          }
          .hero-title {
            font-size: 48px;
            font-weight: bold;
            line-height: 1.2;
          }
          .hero-text {
            font-size: 18px;
            color: gray;
          }
        </style>
        <section class="hero">
          <h1 class="hero-title">Welcome</h1>
          <p class="hero-text">Build something amazing</p>
        </section>
      `)
    ).toEqual(
      renderTemplate(
        <ws.element ws:tag="section" ws:tokens={[heroToken]}>
          <ws.element ws:tag="h1" ws:tokens={[heroTitleToken]}>
            Welcome
          </ws.element>
          <ws.element ws:tag="p" ws:tokens={[heroTextToken]}>
            Build something amazing
          </ws.element>
        </ws.element>
      )
    );
  });

  test("create tokens from style-only paste without HTML elements", () => {
    const result = generateFragmentFromHtml(`
      <style>.card { display: flex; padding: 16px; }</style>
    `);
    expect(result.children).toEqual([]);
    expect(result.instances).toEqual([]);
    expect(result.styleSources).toEqual([
      { type: "token", id: expect.any(String), name: "card" },
    ]);
    expect(result.styles).toEqual([
      {
        styleSourceId: result.styleSources[0].id,
        breakpointId: expect.any(String),
        property: "display",
        value: { type: "keyword", value: "flex" },
      },
      {
        styleSourceId: result.styleSources[0].id,
        breakpointId: expect.any(String),
        property: "paddingTop",
        value: { type: "unit", unit: "px", value: 16 },
      },
      {
        styleSourceId: result.styleSources[0].id,
        breakpointId: expect.any(String),
        property: "paddingRight",
        value: { type: "unit", unit: "px", value: 16 },
      },
      {
        styleSourceId: result.styleSources[0].id,
        breakpointId: expect.any(String),
        property: "paddingBottom",
        value: { type: "unit", unit: "px", value: 16 },
      },
      {
        styleSourceId: result.styleSources[0].id,
        breakpointId: expect.any(String),
        property: "paddingLeft",
        value: { type: "unit", unit: "px", value: 16 },
      },
    ]);
    expect(result.styleSourceSelections).toEqual([]);
  });

  test("create multiple tokens from style-only paste", () => {
    const result = generateFragmentFromHtml(`
      <style>
        .card { display: flex; }
        .title { font-weight: bold; }
      </style>
    `);
    expect(result.children).toEqual([]);
    expect(result.styleSources).toEqual([
      { type: "token", id: expect.any(String), name: "card" },
      { type: "token", id: expect.any(String), name: "title" },
    ]);
    expect(result.styles).toHaveLength(2);
  });

  test("create tokens with media queries from style-only paste", () => {
    const result = generateFragmentFromHtml(`
      <style>
        .card { display: flex; }
        @media (min-width: 768px) {
          .card { flex-direction: row; }
        }
      </style>
    `);
    expect(result.children).toEqual([]);
    expect(result.styleSources).toEqual([
      { type: "token", id: expect.any(String), name: "card" },
    ]);
    // base style + breakpoint style
    expect(result.styles).toHaveLength(2);
    expect(result.breakpoints).toHaveLength(2); // base + 768px
  });

  test("style-only paste with non-class rules creates leftover embed", () => {
    const result = generateFragmentFromHtml(`
      <style>
        .card { display: flex; }
        div { color: red; }
      </style>
    `);
    // card token created
    expect(result.styleSources).toEqual([
      { type: "token", id: expect.any(String), name: "card" },
    ]);
    // leftover non-class rule kept as HtmlEmbed
    expect(result.instances).toHaveLength(1);
    expect(result.instances[0].component).toBe("HtmlEmbed");
  });

  describe("media queries", () => {
    test("extract class with min-width media query into breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card { display: flex; }
          @media (min-width: 768px) {
            .card { flex-direction: row; }
          }
        </style>
        <div class="card">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(tokenSource).toBeDefined();
      // base style
      const baseStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "display" &&
          s.state === undefined
      );
      expect(baseStyle).toBeDefined();
      // breakpoint style
      const bpStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id && s.property === "flexDirection"
      );
      expect(bpStyle).toBeDefined();
      expect(bpStyle!.breakpointId).not.toBe(baseStyle!.breakpointId);
      // breakpoint should be created with minWidth
      const bp = fragment.breakpoints.find(
        (b) => b.id === bpStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      expect(bp!.minWidth).toBe(768);
    });

    test("extract class with max-width media query into breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .container { padding: 32px; }
          @media (max-width: 480px) {
            .container { padding: 16px; }
          }
        </style>
        <div class="container">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "container"
      );
      expect(tokenSource).toBeDefined();
      const bpStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "paddingTop" &&
          s.breakpointId !== "base"
      );
      expect(bpStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === bpStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      expect(bp!.maxWidth).toBe(480);
    });

    test("extract class across multiple media queries", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card { font-size: 14px; }
          @media (min-width: 768px) {
            .card { font-size: 16px; }
          }
          @media (min-width: 1024px) {
            .card { font-size: 18px; }
          }
        </style>
        <div class="card">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(tokenSource).toBeDefined();
      const tokenStyles = fragment.styles.filter(
        (s) => s.styleSourceId === tokenSource!.id
      );
      const breakpointIds = new Set(tokenStyles.map((s) => s.breakpointId));
      // base + 768px + 1024px = 3 breakpoints
      expect(breakpointIds.size).toBe(3);
    });

    test("media query with non-class selectors stays as html embed", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          @media (min-width: 768px) {
            #hero { font-size: 24px; }
          }
        </style>
        <div>Hello</div>
      `);
      expect(fragment.instances.some((i) => i.component === "HtmlEmbed")).toBe(
        true
      );
      expect(
        fragment.styleSources.filter((s) => s.type === "token")
      ).toHaveLength(0);
    });

    test("media query with mixed class and non-class selectors", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          @media (min-width: 768px) {
            .card { display: flex; }
            #hero { color: red; }
          }
        </style>
        <div class="card">Hello</div>
      `);
      // .card in media query should become token
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(tokenSource).toBeDefined();
      // #hero in media query should remain as html embed
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
    });

    test("same class in base and media query produces single token", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .btn { padding: 8px; }
          @media (min-width: 768px) {
            .btn { padding: 16px; }
          }
        </style>
        <button class="btn">Click</button>
      `);
      const tokens = fragment.styleSources.filter((s) => s.type === "token");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type === "token" && tokens[0].name).toBe("btn");
    });

    test("multiple classes in same media query", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card { display: flex; }
          .title { font-size: 16px; }
          @media (min-width: 768px) {
            .card { flex-direction: row; }
            .title { font-size: 24px; }
          }
        </style>
        <div class="card">
          <h1 class="title">Hello</h1>
        </div>
      `);
      const tokens = fragment.styleSources.filter((s) => s.type === "token");
      expect(tokens).toHaveLength(2);
      const cardToken = tokens.find(
        (s) => s.type === "token" && s.name === "card"
      );
      const titleToken = tokens.find(
        (s) => s.type === "token" && s.name === "title"
      );
      expect(cardToken).toBeDefined();
      expect(titleToken).toBeDefined();
    });
  });

  describe("pseudo-classes and pseudo-elements", () => {
    test("extract :hover pseudo-class as state", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .link { color: blue; }
          .link:hover { color: darkblue; }
        </style>
        <a class="link">Click</a>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "link"
      );
      expect(tokenSource).toBeDefined();
      const hoverStyle = fragment.styles.find(
        (s) => s.styleSourceId === tokenSource!.id && s.state === ":hover"
      );
      expect(hoverStyle).toBeDefined();
    });

    test("extract :focus pseudo-class as state", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .input { border-color: gray; }
          .input:focus { border-color: blue; }
        </style>
        <input class="input" />
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "input"
      );
      expect(tokenSource).toBeDefined();
      const focusStyle = fragment.styles.find(
        (s) => s.styleSourceId === tokenSource!.id && s.state === ":focus"
      );
      expect(focusStyle).toBeDefined();
    });

    test("extract multiple pseudo-classes on same class", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .btn { background: blue; }
          .btn:hover { background: darkblue; }
          .btn:focus { outline-color: blue; }
          .btn:active { background: navy; }
        </style>
        <button class="btn">Click</button>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "btn"
      );
      expect(tokenSource).toBeDefined();
      const states = fragment.styles
        .filter((s) => s.styleSourceId === tokenSource!.id && s.state)
        .map((s) => s.state);
      expect(states).toContain(":hover");
      expect(states).toContain(":focus");
      expect(states).toContain(":active");
    });

    test("extract ::before pseudo-element as state", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .decorated { position: relative; }
          .decorated::before { content: "★"; }
        </style>
        <div class="decorated">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "decorated"
      );
      expect(tokenSource).toBeDefined();
      const beforeStyle = fragment.styles.find(
        (s) => s.styleSourceId === tokenSource!.id && s.state === "::before"
      );
      expect(beforeStyle).toBeDefined();
    });

    test("extract ::after pseudo-element as state", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .clearfix::after {
            content: "";
            display: table;
            clear: both;
          }
        </style>
        <div class="clearfix">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "clearfix"
      );
      expect(tokenSource).toBeDefined();
      const afterStyles = fragment.styles.filter(
        (s) => s.styleSourceId === tokenSource!.id && s.state === "::after"
      );
      expect(afterStyles.length).toBeGreaterThanOrEqual(1);
    });

    test("pseudo-class on non-class selector ignored (stays in embed)", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          a:hover { color: red; }
        </style>
        <a>Link</a>
      `);
      expect(
        fragment.styleSources.filter((s) => s.type === "token")
      ).toHaveLength(0);
      expect(fragment.instances.some((i) => i.component === "HtmlEmbed")).toBe(
        true
      );
    });

    test("pseudo-class combined with media query", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .btn { background: blue; }
          .btn:hover { background: darkblue; }
          @media (min-width: 768px) {
            .btn { padding: 16px; }
            .btn:hover { background: royalblue; }
          }
        </style>
        <button class="btn">Click</button>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "btn"
      );
      expect(tokenSource).toBeDefined();
      // should have hover styles on base breakpoint
      const baseHover = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.state === ":hover" &&
          s.breakpointId === "base"
      );
      expect(baseHover).toBeDefined();
      // should have hover styles on 768px breakpoint
      const bpHover = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.state === ":hover" &&
          s.breakpointId !== "base"
      );
      expect(bpHover).toBeDefined();
    });

    test("::placeholder pseudo-element as state", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .input { color: black; }
          .input::placeholder { color: gray; }
        </style>
        <input class="input" />
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "input"
      );
      expect(tokenSource).toBeDefined();
      const placeholderStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id && s.state === "::placeholder"
      );
      expect(placeholderStyle).toBeDefined();
    });
  });

  describe("at-rules and special CSS", () => {
    test("@keyframes stays as html embed", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spinner { animation: spin 1s infinite; }
        </style>
        <div class="spinner">Loading</div>
      `);
      // .spinner class should still become a token
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "spinner"
      );
      expect(tokenSource).toBeDefined();
      // @keyframes should remain as html embed
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
      const codeProp = fragment.props.find(
        (p) => p.instanceId === htmlEmbed!.id && p.name === "code"
      );
      expect(codeProp).toBeDefined();
      expect(codeProp!.type === "string" && codeProp!.value).toContain(
        "@keyframes"
      );
    });

    test("@font-face stays as html embed", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          @font-face {
            font-family: "MyFont";
            src: url("font.woff2");
          }
          .text { font-family: "MyFont"; }
        </style>
        <p class="text">Hello</p>
      `);
      // .text class should become a token
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "text"
      );
      expect(tokenSource).toBeDefined();
      // @font-face should remain as html embed
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
      const codeProp = fragment.props.find(
        (p) => p.instanceId === htmlEmbed!.id && p.name === "code"
      );
      expect(codeProp).toBeDefined();
      expect(codeProp!.type === "string" && codeProp!.value).toContain(
        "@font-face"
      );
    });

    test("@media print stays as html embed", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card { display: flex; }
          @media print {
            .card { display: block; }
          }
        </style>
        <div class="card">Hello</div>
      `);
      // base .card should become a token
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(tokenSource).toBeDefined();
      // @media print should remain as html embed since parseCss ignores print
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
    });

    test("grouped class selectors like .a, .b are extracted as separate tokens", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .primary, .secondary { font-weight: bold; }
        </style>
        <span class="primary">One</span>
        <span class="secondary">Two</span>
      `);
      const primaryToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "primary"
      );
      const secondaryToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "secondary"
      );
      expect(primaryToken).toBeDefined();
      expect(secondaryToken).toBeDefined();
      // both should have the same style
      const primaryStyle = fragment.styles.find(
        (s) => s.styleSourceId === primaryToken!.id
      );
      const secondaryStyle = fragment.styles.find(
        (s) => s.styleSourceId === secondaryToken!.id
      );
      expect(primaryStyle?.property).toBe("fontWeight");
      expect(secondaryStyle?.property).toBe("fontWeight");
    });

    test("grouped selector with class + non-class stays partially in embed", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card, #hero { display: flex; }
        </style>
        <div class="card">Hello</div>
      `);
      // .card should become token
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(tokenSource).toBeDefined();
      // #hero part should remain as html embed
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
    });
  });

  describe("condition breakpoints", () => {
    test("@media (prefers-color-scheme: dark) creates condition breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card { background: white; color: black; }
          @media (prefers-color-scheme: dark) {
            .card { background: black; color: white; }
          }
        </style>
        <div class="card">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(tokenSource).toBeDefined();
      // should have base styles
      const baseStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "backgroundColor" &&
          s.state === undefined
      );
      expect(baseStyle).toBeDefined();
      // should have dark mode styles on condition breakpoint
      const darkStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "backgroundColor" &&
          s.breakpointId !== baseStyle!.breakpointId
      );
      expect(darkStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === darkStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      expect(bp!.condition).toBe("prefers-color-scheme:dark");
      expect(bp!.minWidth).toBeUndefined();
      expect(bp!.maxWidth).toBeUndefined();
    });

    test("@media (orientation: portrait) creates condition breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .layout { flex-direction: row; }
          @media (orientation: portrait) {
            .layout { flex-direction: column; }
          }
        </style>
        <div class="layout">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "layout"
      );
      expect(tokenSource).toBeDefined();
      const portraitStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "flexDirection" &&
          s.breakpointId !== "base"
      );
      expect(portraitStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === portraitStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      expect(bp!.condition).toBe("orientation:portrait");
    });

    test("@media (hover: hover) creates condition breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .interactive { cursor: default; }
          @media (hover: hover) {
            .interactive { cursor: pointer; }
          }
        </style>
        <div class="interactive">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "interactive"
      );
      expect(tokenSource).toBeDefined();
      const hoverStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "cursor" &&
          s.breakpointId !== "base"
      );
      expect(hoverStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === hoverStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      expect(bp!.condition).toBe("hover:hover");
    });

    test("@media (prefers-reduced-motion: reduce) creates condition breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .animated { transition: transform 0.3s; }
          @media (prefers-reduced-motion: reduce) {
            .animated { transition: none; }
          }
        </style>
        <div class="animated">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "animated"
      );
      expect(tokenSource).toBeDefined();
      const reduceStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "transitionProperty" &&
          s.breakpointId !== "base"
      );
      expect(reduceStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === reduceStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      expect(bp!.condition).toBe("prefers-reduced-motion:reduce");
    });

    test("combined min-width and max-width uses range breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .tablet-only { display: none; }
          @media (min-width: 768px) and (max-width: 1024px) {
            .tablet-only { display: block; }
          }
        </style>
        <div class="tablet-only">Tablet content</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "tablet-only"
      );
      expect(tokenSource).toBeDefined();
      const tabletStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "display" &&
          s.breakpointId !== "base"
      );
      expect(tabletStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === tabletStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      // Combined width queries use both minWidth and maxWidth
      expect(bp!.minWidth).toBe(768);
      expect(bp!.maxWidth).toBe(1024);
      expect(bp!.condition).toBeUndefined();
    });

    test("overlapping min/max-width breakpoints get rounded to non-overlapping values", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a { font-size: 14px; }
          @media (min-width: 600px) and (max-width: 900px) {
            .a { font-size: 16px; }
          }
          @media (min-width: 800px) and (max-width: 1200px) {
            .a { font-size: 18px; }
          }
        </style>
        <div class="a">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "a"
      );
      expect(tokenSource).toBeDefined();
      const tokenStyles = fragment.styles.filter(
        (s) => s.styleSourceId === tokenSource!.id && s.property === "fontSize"
      );
      // base + 2 range breakpoints = 3 styles
      expect(tokenStyles).toHaveLength(3);
      const rangeBreakpoints = tokenStyles
        .filter((s) => s.breakpointId !== "base")
        .map((s) => fragment.breakpoints.find((b) => b.id === s.breakpointId))
        .filter(Boolean)
        .sort((a, b) => (a!.minWidth ?? 0) - (b!.minWidth ?? 0));
      expect(rangeBreakpoints).toHaveLength(2);
      // ranges should not overlap: first.maxWidth < second.minWidth
      const first = rangeBreakpoints[0]!;
      const second = rangeBreakpoints[1]!;
      expect(first.maxWidth).toBeDefined();
      expect(second.minWidth).toBeDefined();
      expect(first.maxWidth!).toBeLessThan(second.minWidth!);
    });

    test("non-overlapping range breakpoints stay unchanged", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a { font-size: 14px; }
          @media (min-width: 400px) and (max-width: 700px) {
            .a { font-size: 16px; }
          }
          @media (min-width: 800px) and (max-width: 1200px) {
            .a { font-size: 18px; }
          }
        </style>
        <div class="a">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "a"
      );
      expect(tokenSource).toBeDefined();
      const rangeBreakpoints = fragment.breakpoints
        .filter((b) => b.minWidth !== undefined && b.maxWidth !== undefined)
        .sort((a, b) => (a.minWidth ?? 0) - (b.minWidth ?? 0));
      expect(rangeBreakpoints).toHaveLength(2);
      // values should remain exactly as authored since they don't overlap
      expect(rangeBreakpoints[0].minWidth).toBe(400);
      expect(rangeBreakpoints[0].maxWidth).toBe(700);
      expect(rangeBreakpoints[1].minWidth).toBe(800);
      expect(rangeBreakpoints[1].maxWidth).toBe(1200);
    });

    test("adjacent range breakpoints (touching) stay unchanged", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a { font-size: 14px; }
          @media (min-width: 400px) and (max-width: 799px) {
            .a { font-size: 16px; }
          }
          @media (min-width: 800px) and (max-width: 1200px) {
            .a { font-size: 18px; }
          }
        </style>
        <div class="a">Hello</div>
      `);
      const rangeBreakpoints = fragment.breakpoints
        .filter((b) => b.minWidth !== undefined && b.maxWidth !== undefined)
        .sort((a, b) => (a.minWidth ?? 0) - (b.minWidth ?? 0));
      expect(rangeBreakpoints).toHaveLength(2);
      // touching but not overlapping — keep as is
      expect(rangeBreakpoints[0].maxWidth).toBe(799);
      expect(rangeBreakpoints[1].minWidth).toBe(800);
    });

    test("overlapping range: first.maxWidth rounded down to second.minWidth - 1", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a { font-size: 14px; }
          @media (min-width: 600px) and (max-width: 1000px) {
            .a { font-size: 16px; }
          }
          @media (min-width: 900px) and (max-width: 1400px) {
            .a { font-size: 18px; }
          }
        </style>
        <div class="a">Hello</div>
      `);
      const rangeBreakpoints = fragment.breakpoints
        .filter((b) => b.minWidth !== undefined && b.maxWidth !== undefined)
        .sort((a, b) => (a.minWidth ?? 0) - (b.minWidth ?? 0));
      expect(rangeBreakpoints).toHaveLength(2);
      // first range's maxWidth should be adjusted to not overlap second's minWidth
      expect(rangeBreakpoints[0].minWidth).toBe(600);
      expect(rangeBreakpoints[0].maxWidth!).toBeLessThan(
        rangeBreakpoints[1].minWidth!
      );
      // second range should keep its original values
      expect(rangeBreakpoints[1].minWidth).toBe(900);
      expect(rangeBreakpoints[1].maxWidth).toBe(1400);
    });

    test("three overlapping ranges all get adjusted", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a { font-size: 14px; }
          @media (min-width: 400px) and (max-width: 800px) {
            .a { font-size: 16px; }
          }
          @media (min-width: 700px) and (max-width: 1100px) {
            .a { font-size: 18px; }
          }
          @media (min-width: 1000px) and (max-width: 1400px) {
            .a { font-size: 20px; }
          }
        </style>
        <div class="a">Hello</div>
      `);
      const rangeBreakpoints = fragment.breakpoints
        .filter((b) => b.minWidth !== undefined && b.maxWidth !== undefined)
        .sort((a, b) => (a.minWidth ?? 0) - (b.minWidth ?? 0));
      expect(rangeBreakpoints).toHaveLength(3);
      // no pair should overlap
      expect(rangeBreakpoints[0].maxWidth!).toBeLessThan(
        rangeBreakpoints[1].minWidth!
      );
      expect(rangeBreakpoints[1].maxWidth!).toBeLessThan(
        rangeBreakpoints[2].minWidth!
      );
    });

    test("exact duplicate range breakpoints get deduplicated", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a { font-size: 14px; }
          .b { color: red; }
          @media (min-width: 768px) and (max-width: 1024px) {
            .a { font-size: 18px; }
          }
          @media (min-width: 768px) and (max-width: 1024px) {
            .b { color: blue; }
          }
        </style>
        <div class="a"><span class="b">Hello</span></div>
      `);
      // same range should reuse a single breakpoint
      const rangeBreakpoints = fragment.breakpoints.filter(
        (b) => b.minWidth !== undefined && b.maxWidth !== undefined
      );
      expect(rangeBreakpoints).toHaveLength(1);
      expect(rangeBreakpoints[0].minWidth).toBe(768);
      expect(rangeBreakpoints[0].maxWidth).toBe(1024);
    });

    test("range breakpoint overlapping with simple min-width breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a { font-size: 14px; }
          @media (min-width: 768px) {
            .a { font-size: 18px; }
          }
          @media (min-width: 600px) and (max-width: 900px) {
            .a { font-size: 16px; }
          }
        </style>
        <div class="a">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "a"
      );
      expect(tokenSource).toBeDefined();
      const tokenStyles = fragment.styles.filter(
        (s) => s.styleSourceId === tokenSource!.id && s.property === "fontSize"
      );
      // base + min-width + range = 3 breakpoints
      expect(tokenStyles).toHaveLength(3);
      // simple min-width breakpoint should exist
      const minWidthBp = fragment.breakpoints.find(
        (b) =>
          b.minWidth !== undefined &&
          b.maxWidth === undefined &&
          b.condition === undefined
      );
      expect(minWidthBp).toBeDefined();
      // range breakpoint should exist and not overlap min-width
      const rangeBp = fragment.breakpoints.find(
        (b) => b.minWidth !== undefined && b.maxWidth !== undefined
      );
      expect(rangeBp).toBeDefined();
      // range's maxWidth must be less than the min-width breakpoint's minWidth
      // so they don't overlap
      expect(rangeBp!.maxWidth!).toBeLessThan(minWidthBp!.minWidth!);
    });

    test("range breakpoint overlapping with simple max-width breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a { font-size: 14px; }
          @media (max-width: 600px) {
            .a { font-size: 12px; }
          }
          @media (min-width: 400px) and (max-width: 900px) {
            .a { font-size: 16px; }
          }
        </style>
        <div class="a">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "a"
      );
      expect(tokenSource).toBeDefined();
      const tokenStyles = fragment.styles.filter(
        (s) => s.styleSourceId === tokenSource!.id && s.property === "fontSize"
      );
      // base + max-width + range = 3 breakpoints
      expect(tokenStyles).toHaveLength(3);
      // simple max-width breakpoint should exist
      const maxWidthBp = fragment.breakpoints.find(
        (b) =>
          b.maxWidth !== undefined &&
          b.minWidth === undefined &&
          b.condition === undefined
      );
      expect(maxWidthBp).toBeDefined();
      // range breakpoint should exist and not overlap max-width
      const rangeBp = fragment.breakpoints.find(
        (b) => b.minWidth !== undefined && b.maxWidth !== undefined
      );
      expect(rangeBp).toBeDefined();
      // range's minWidth must be greater than the max-width breakpoint's maxWidth
      expect(rangeBp!.minWidth!).toBeGreaterThan(maxWidthBp!.maxWidth!);
    });

    test("completely contained range gets clamped", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a { font-size: 14px; }
          @media (min-width: 400px) and (max-width: 1200px) {
            .a { font-size: 16px; }
          }
          @media (min-width: 600px) and (max-width: 900px) {
            .a { font-size: 18px; }
          }
        </style>
        <div class="a">Hello</div>
      `);
      const rangeBreakpoints = fragment.breakpoints
        .filter((b) => b.minWidth !== undefined && b.maxWidth !== undefined)
        .sort((a, b) => (a.minWidth ?? 0) - (b.minWidth ?? 0));
      expect(rangeBreakpoints).toHaveLength(2);
      // the outer range should be split/adjusted so inner doesn't overlap
      expect(rangeBreakpoints[0].maxWidth!).toBeLessThan(
        rangeBreakpoints[1].minWidth!
      );
    });

    test("combined width and feature uses condition breakpoint", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .widget { font-size: 14px; }
          @media (min-width: 768px) and (orientation: landscape) {
            .widget { font-size: 18px; }
          }
        </style>
        <div class="widget">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "widget"
      );
      expect(tokenSource).toBeDefined();
      const landscapeStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "fontSize" &&
          s.breakpointId !== "base"
      );
      expect(landscapeStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === landscapeStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      // Mixed width + feature query becomes a condition
      expect(bp!.condition).toBeDefined();
    });

    test("multiple condition features combined", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .accessible { font-size: 16px; }
          @media (prefers-color-scheme: dark) and (prefers-contrast: more) {
            .accessible { font-size: 18px; }
          }
        </style>
        <div class="accessible">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "accessible"
      );
      expect(tokenSource).toBeDefined();
      const conditionStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "fontSize" &&
          s.breakpointId !== "base"
      );
      expect(conditionStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === conditionStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      expect(bp!.condition).toBeDefined();
      // condition should contain both features
      expect(bp!.condition).toContain("prefers-color-scheme");
      expect(bp!.condition).toContain("prefers-contrast");
    });

    test("same condition breakpoint reused for multiple classes", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card { background: white; }
          .text { color: black; }
          @media (prefers-color-scheme: dark) {
            .card { background: black; }
            .text { color: white; }
          }
        </style>
        <div class="card">
          <p class="text">Hello</p>
        </div>
      `);
      const cardToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      const textToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "text"
      );
      expect(cardToken).toBeDefined();
      expect(textToken).toBeDefined();
      // both dark styles should reference the same breakpoint
      const cardDarkStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === cardToken!.id &&
          s.property === "backgroundColor" &&
          s.breakpointId !== "base"
      );
      const textDarkStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === textToken!.id &&
          s.property === "color" &&
          s.breakpointId !== "base"
      );
      expect(cardDarkStyle).toBeDefined();
      expect(textDarkStyle).toBeDefined();
      expect(cardDarkStyle!.breakpointId).toBe(textDarkStyle!.breakpointId);
    });
  });

  describe("nested at-rules", () => {
    test("nested @media rules extract class with flattened condition", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card { display: flex; }
          @media (min-width: 768px) {
            @media (prefers-color-scheme: dark) {
              .card { background: black; }
            }
          }
        </style>
        <div class="card">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(tokenSource).toBeDefined();
      // nested @media should flatten into a combined condition
      const nestedStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "backgroundColor"
      );
      expect(nestedStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === nestedStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      // flattened condition should include both queries
      expect(bp!.condition).toBeDefined();
    });

    test("deeply nested @media still extracts class tokens", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card { padding: 8px; }
          @media (min-width: 768px) {
            @media (orientation: landscape) {
              @media (hover: hover) {
                .card { padding: 32px; }
              }
            }
          }
        </style>
        <div class="card">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(tokenSource).toBeDefined();
      const deepStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "paddingTop" &&
          s.breakpointId !== "base"
      );
      expect(deepStyle).toBeDefined();
      const bp = fragment.breakpoints.find(
        (b) => b.id === deepStyle!.breakpointId
      );
      expect(bp).toBeDefined();
      expect(bp!.condition).toBeDefined();
    });

    test("nested @media with same feature type combines correctly", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .responsive { font-size: 14px; }
          @media (min-width: 768px) {
            .responsive { font-size: 16px; }
            @media (min-width: 1024px) {
              .responsive { font-size: 20px; }
            }
          }
        </style>
        <div class="responsive">Hello</div>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "responsive"
      );
      expect(tokenSource).toBeDefined();
      // outer @media (min-width: 768px) should have simple breakpoint
      const outerStyle = fragment.styles.find(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "fontSize" &&
          s.breakpointId !== "base" &&
          fragment.breakpoints.find(
            (b) => b.id === s.breakpointId && b.minWidth === 768
          )
      );
      expect(outerStyle).toBeDefined();
      // nested @media (min-width: 1024px) inside @media (min-width: 768px)
      // should still produce a breakpoint (the effective min-width is 1024px)
      const innerStyles = fragment.styles.filter(
        (s) =>
          s.styleSourceId === tokenSource!.id &&
          s.property === "fontSize" &&
          s.breakpointId !== "base" &&
          s.breakpointId !== outerStyle!.breakpointId
      );
      expect(innerStyles).toHaveLength(1);
    });

    test("@supports nested inside @media keeps class in embed", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .grid { display: flex; }
          @supports (display: grid) {
            .grid { display: grid; }
          }
        </style>
        <div class="grid">Hello</div>
      `);
      // base class should become token
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "grid"
      );
      expect(tokenSource).toBeDefined();
      // @supports should remain as html embed (not a media query)
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
    });
  });

  describe("selector edge cases", () => {
    test("class with compound selector .card.active is extracted as combo token", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card.active { opacity: 1; }
        </style>
        <div class="card active">Hello</div>
      `);
      // compound selectors become combo tokens (Webflow-style naming)
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card.active"
      );
      expect(tokenSource).toBeDefined();
      // no leftover for pure class rule
      expect(fragment.instances.some((i) => i.component === "HtmlEmbed")).toBe(
        false
      );
    });

    test("class with attribute selector .btn[disabled] is extracted with state", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .btn[disabled] { opacity: 0.5; }
        </style>
        <button class="btn" disabled>Click</button>
      `);
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "btn"
      );
      expect(tokenSource).toBeDefined();
      // the style should have [disabled] state
      const style = fragment.styles.find(
        (s) => s.styleSourceId === tokenSource!.id
      );
      expect(style).toBeDefined();
      expect(style!.state).toBe("[disabled]");
      // no leftover
      expect(fragment.instances.some((i) => i.component === "HtmlEmbed")).toBe(
        false
      );
    });

    test("class with sibling combinator .a + .b is not extracted", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a + .b { margin-top: 8px; }
        </style>
        <div class="a">A</div>
        <div class="b">B</div>
      `);
      expect(
        fragment.styleSources.filter((s) => s.type === "token")
      ).toHaveLength(0);
    });

    test("class with general sibling .a ~ .b is not extracted", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a ~ .b { color: red; }
        </style>
        <div class="a">A</div>
        <div class="b">B</div>
      `);
      expect(
        fragment.styleSources.filter((s) => s.type === "token")
      ).toHaveLength(0);
    });

    test(":root selector stays as html embed", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          :root { --color: blue; }
          .card { color: var(--color); }
        </style>
        <div class="card">Hello</div>
      `);
      // .card should become token
      const tokenSource = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(tokenSource).toBeDefined();
      // :root should stay as html embed
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
    });

    test("universal selector * stays as html embed", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          * { box-sizing: border-box; }
        </style>
        <div>Hello</div>
      `);
      expect(
        fragment.styleSources.filter((s) => s.type === "token")
      ).toHaveLength(0);
      expect(fragment.instances.some((i) => i.component === "HtmlEmbed")).toBe(
        true
      );
    });
  });

  describe("compound class selectors", () => {
    test("compound .card.active extracts as combo token when element has both classes", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card { display: flex; }
          .card.active { opacity: 1; }
        </style>
        <div class="card active">Hello</div>
      `);
      const cardToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      const comboToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card.active"
      );
      expect(cardToken).toBeDefined();
      expect(comboToken).toBeDefined();
      // instance should reference both tokens
      const sel = fragment.styleSourceSelections.find(
        (s) =>
          s.values.includes(cardToken!.id) && s.values.includes(comboToken!.id)
      );
      expect(sel).toBeDefined();
    });

    test("compound .a.b.c extracts as triple combo token", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a.b.c { color: red; }
        </style>
        <div class="a b c">Hello</div>
      `);
      const comboToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "a.b.c"
      );
      expect(comboToken).toBeDefined();
      const style = fragment.styles.find(
        (s) => s.styleSourceId === comboToken!.id && s.property === "color"
      );
      expect(style).toBeDefined();
    });

    test("compound class not matched when element is missing a class", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card.active { opacity: 1; }
        </style>
        <div class="card">Hello</div>
      `);
      // token is created for all class rules, even if not applied to elements
      const comboToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card.active"
      );
      expect(comboToken).toBeDefined();
      // but NOT assigned to the div (missing "active" class)
      const divInstance = fragment.instances.find((i) => i.tag === "div");
      const sel = fragment.styleSourceSelections.find(
        (s) => s.instanceId === divInstance?.id
      );
      // No selection for this instance, or if one exists, it shouldn't contain the combo token
      expect(sel?.values ?? []).not.toContain(comboToken?.id);
    });

    test("compound class with :hover pseudo extracts correctly", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .btn.primary:hover { background: blue; }
        </style>
        <button class="btn primary">Click</button>
      `);
      const comboToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "btn.primary"
      );
      expect(comboToken).toBeDefined();
      const style = fragment.styles.find(
        (s) => s.styleSourceId === comboToken!.id
      );
      expect(style).toBeDefined();
      expect(style!.state).toBe(":hover");
    });

    test("compound class inside @media query creates breakpoint style", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card.featured { display: block; }
          @media (min-width: 768px) {
            .card.featured { display: flex; }
          }
        </style>
        <div class="card featured">Hello</div>
      `);
      const comboToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card.featured"
      );
      expect(comboToken).toBeDefined();
      // Should have both base and breakpoint styles
      const comboStyles = fragment.styles.filter(
        (s) => s.styleSourceId === comboToken!.id
      );
      expect(comboStyles.length).toBe(2);
      const bpIds = new Set(comboStyles.map((s) => s.breakpointId));
      expect(bpIds.size).toBe(2);
    });
  });

  describe("attribute selectors as state", () => {
    test(".btn[disabled] extracts with [disabled] state", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .btn { padding: 8px; }
          .btn[disabled] { opacity: 0.5; }
        </style>
        <button class="btn" disabled>Click</button>
      `);
      const btnToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "btn"
      );
      expect(btnToken).toBeDefined();
      const baseStyle = fragment.styles.find(
        (s) => s.styleSourceId === btnToken!.id && s.state === undefined
      );
      expect(baseStyle).toBeDefined();
      expect(baseStyle!.property).toBe("paddingTop");
      const stateStyle = fragment.styles.find(
        (s) => s.styleSourceId === btnToken!.id && s.state === "[disabled]"
      );
      expect(stateStyle).toBeDefined();
      expect(stateStyle!.property).toBe("opacity");
    });

    test(".input[readonly] extracts with [readonly] state", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .input[readonly] { background: #eee; }
        </style>
        <input class="input" readonly>
      `);
      const inputToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "input"
      );
      expect(inputToken).toBeDefined();
      const stateStyle = fragment.styles.find(
        (s) => s.styleSourceId === inputToken!.id && s.state === "[readonly]"
      );
      expect(stateStyle).toBeDefined();
    });

    test("attribute selector combined with pseudo keeps pseudo state", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .btn:hover { color: blue; }
          .btn[disabled] { opacity: 0.5; }
        </style>
        <button class="btn" disabled>Click</button>
      `);
      const btnToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "btn"
      );
      expect(btnToken).toBeDefined();
      const hoverStyle = fragment.styles.find(
        (s) => s.styleSourceId === btnToken!.id && s.state === ":hover"
      );
      expect(hoverStyle).toBeDefined();
      const disabledStyle = fragment.styles.find(
        (s) => s.styleSourceId === btnToken!.id && s.state === "[disabled]"
      );
      expect(disabledStyle).toBeDefined();
    });
  });

  describe("mixed comma selectors (partial extraction)", () => {
    test(".card, div {} extracts .card token, keeps div in leftover", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card, div { display: flex; }
        </style>
        <div class="card">Hello</div>
      `);
      const cardToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      expect(cardToken).toBeDefined();
      // div part should stay as html embed
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
      const codeProp = fragment.props.find(
        (p) => p.instanceId === htmlEmbed!.id && p.name === "code"
      );
      expect(codeProp).toBeDefined();
      // The leftover should only contain the div selector, not .card
      expect(codeProp!.type === "string" && codeProp!.value).toContain("div");
      expect(codeProp!.type === "string" && codeProp!.value).not.toMatch(
        /\.card/
      );
    });

    test(".a, .b, #id {} extracts .a and .b, keeps #id in leftover", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a, .b, #id { color: red; }
        </style>
        <div class="a">A</div>
        <div class="b">B</div>
      `);
      const tokenA = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "a"
      );
      const tokenB = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "b"
      );
      expect(tokenA).toBeDefined();
      expect(tokenB).toBeDefined();
      // #id should stay in embed
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
    });

    test(".a, .b {} with all class selectors produces no leftover", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .a, .b { padding: 4px; }
        </style>
        <div class="a">A</div>
        <div class="b">B</div>
      `);
      // Both should become tokens
      expect(
        fragment.styleSources.filter((s) => s.type === "token")
      ).toHaveLength(2);
      // No leftover embed
      expect(fragment.instances.some((i) => i.component === "HtmlEmbed")).toBe(
        false
      );
    });
  });

  describe("breakpoint labels", () => {
    test("condition breakpoint gets human-readable label", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          @media (prefers-color-scheme: dark) {
            .card { background: black; }
          }
        </style>
        <div class="card">Hello</div>
      `);
      const condBp = fragment.breakpoints.find((b) => b.condition);
      expect(condBp).toBeDefined();
      // capitalCase transforms "prefers-color-scheme:dark" → "Prefers Color Scheme Dark"
      expect(condBp!.label).toBe("Prefers Color Scheme Dark");
    });

    test("width breakpoint gets readable label", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          @media (min-width: 768px) {
            .card { display: flex; }
          }
        </style>
        <div class="card">Hello</div>
      `);
      const bp = fragment.breakpoints.find((b) => b.minWidth === 768);
      expect(bp).toBeDefined();
      expect(bp!.label).toBe("≥ 768px");
    });

    test("range breakpoint gets combined label", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          @media (min-width: 768px) and (max-width: 1024px) {
            .card { display: flex; }
          }
        </style>
        <div class="card">Hello</div>
      `);
      const bp = fragment.breakpoints.find(
        (b) => b.minWidth === 768 && b.maxWidth === 1024
      );
      expect(bp).toBeDefined();
      expect(bp!.label).toBe("≥ 768px and ≤ 1024px");
    });
  });

  describe("complex real-world scenarios", () => {
    test("responsive card component with hover states", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .card {
            display: flex;
            flex-direction: column;
            padding: 16px;
            border-radius: 8px;
          }
          .card:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          @media (min-width: 768px) {
            .card {
              flex-direction: row;
              padding: 24px;
            }
          }
          .card-title {
            font-size: 18px;
            font-weight: bold;
          }
          @media (min-width: 768px) {
            .card-title {
              font-size: 24px;
            }
          }
        </style>
        <div class="card">
          <h2 class="card-title">Title</h2>
          <p>Description</p>
        </div>
      `);
      // both tokens should be created
      const cardToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card"
      );
      const titleToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "card-title"
      );
      expect(cardToken).toBeDefined();
      expect(titleToken).toBeDefined();
      // card should have hover state
      expect(
        fragment.styles.some(
          (s) => s.styleSourceId === cardToken!.id && s.state === ":hover"
        )
      ).toBe(true);
      // card should have breakpoint styles
      const cardBreakpoints = new Set(
        fragment.styles
          .filter((s) => s.styleSourceId === cardToken!.id && !s.state)
          .map((s) => s.breakpointId)
      );
      expect(cardBreakpoints.size).toBeGreaterThanOrEqual(2);
      // title should have breakpoint styles
      const titleBreakpoints = new Set(
        fragment.styles
          .filter((s) => s.styleSourceId === titleToken!.id)
          .map((s) => s.breakpointId)
      );
      expect(titleBreakpoints.size).toBeGreaterThanOrEqual(2);
      // no HtmlEmbed (all rules are class-based)
      expect(fragment.instances.some((i) => i.component === "HtmlEmbed")).toBe(
        false
      );
    });

    test("html with mixed class rules, id rules, keyframes, and media queries", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .fade-in { animation: fadeIn 0.3s ease-in; }
          .card { display: flex; }
          #app { min-height: 100vh; }
          @media (min-width: 768px) {
            .card { flex-direction: row; }
          }
        </style>
        <div class="card fade-in">
          <p>Hello</p>
        </div>
      `);
      // class tokens should be extracted
      expect(
        fragment.styleSources.find(
          (s) => s.type === "token" && s.name === "card"
        )
      ).toBeDefined();
      expect(
        fragment.styleSources.find(
          (s) => s.type === "token" && s.name === "fade-in"
        )
      ).toBeDefined();
      // @keyframes and #app should remain as html embed
      const htmlEmbed = fragment.instances.find(
        (i) => i.component === "HtmlEmbed"
      );
      expect(htmlEmbed).toBeDefined();
      const codeProp = fragment.props.find(
        (p) => p.instanceId === htmlEmbed!.id && p.name === "code"
      );
      expect(codeProp!.type === "string" && codeProp!.value).toContain(
        "@keyframes"
      );
      expect(codeProp!.type === "string" && codeProp!.value).toContain("#app");
    });

    test("navigation component with multiple states and breakpoints", () => {
      const fragment = generateFragmentFromHtml(`
        <style>
          .nav { display: flex; gap: 8px; }
          .nav-link { color: gray; text-decoration: none; }
          .nav-link:hover { color: blue; }
          .nav-link:focus { outline: 2px solid blue; }
          .nav-link::after { content: ""; display: block; height: 2px; }
          @media (min-width: 768px) {
            .nav { gap: 16px; }
            .nav-link { font-size: 16px; }
          }
        </style>
        <nav class="nav">
          <a class="nav-link">Home</a>
          <a class="nav-link">About</a>
        </nav>
      `);
      const navToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "nav"
      );
      const linkToken = fragment.styleSources.find(
        (s) => s.type === "token" && s.name === "nav-link"
      );
      expect(navToken).toBeDefined();
      expect(linkToken).toBeDefined();
      // nav-link should have hover, focus, and ::after states
      const linkStates = new Set(
        fragment.styles
          .filter((s) => s.styleSourceId === linkToken!.id && s.state)
          .map((s) => s.state)
      );
      expect(linkStates.has(":hover")).toBe(true);
      expect(linkStates.has(":focus")).toBe(true);
      expect(linkStates.has("::after")).toBe(true);
      // both should have breakpoint styles
      const navBreakpoints = new Set(
        fragment.styles
          .filter((s) => s.styleSourceId === navToken!.id)
          .map((s) => s.breakpointId)
      );
      expect(navBreakpoints.size).toBeGreaterThanOrEqual(2);
      // nav-link token should be reused for both <a> elements
      const linkSelections = fragment.styleSourceSelections.filter((sel) =>
        sel.values.includes(linkToken!.id)
      );
      expect(linkSelections).toHaveLength(2);
    });
  });

  describe("nested selectors", () => {
    test("resolve descendant selector to matching element", () => {
      const cardInnerToken = token(
        "card__inner",
        css`
          color: red;
        `
      );
      expect(
        generateFragmentFromHtml(`
          <style>.card .inner { color: red; }</style>
          <div class="card"><span class="inner">Hello</span></div>
        `)
      ).toEqual(
        renderTemplate(
          <ws.element ws:tag="div" class="card">
            <ws.element ws:tag="span" ws:tokens={[cardInnerToken]}>
              Hello
            </ws.element>
          </ws.element>
        )
      );
    });

    test("resolve child combinator to direct child", () => {
      const parentChildToken = token(
        "parent__child",
        css`
          margin: 0;
        `
      );
      expect(
        generateFragmentFromHtml(`
          <style>.parent > .child { margin: 0; }</style>
          <div class="parent"><span class="child">Hello</span></div>
        `)
      ).toEqual(
        renderTemplate(
          <ws.element ws:tag="div" class="parent">
            <ws.element ws:tag="span" ws:tokens={[parentChildToken]}>
              Hello
            </ws.element>
          </ws.element>
        )
      );
    });

    test("child combinator does not match non-direct child", () => {
      const result = _generateFragmentFromHtml(`
        <style>.parent > .child { color: red; }</style>
        <div class="parent"><div><span class="child">Hello</span></div></div>
      `);
      // .child is nested inside an intermediate div, not a direct child of .parent
      expect(result.skippedSelectors).toEqual([".parent > .child"]);
      // no token created for the nested rule
      expect(
        result.styleSources.filter((s) => s.type === "token")
      ).toHaveLength(0);
    });

    test("skip unresolved nested selector and report it", () => {
      const result = _generateFragmentFromHtml(`
        <style>.card .title { color: red; }</style>
        <div class="card"><span>No title class here</span></div>
      `);
      expect(result.skippedSelectors).toEqual([".card .title"]);
      expect(
        result.styleSources.filter((s) => s.type === "token")
      ).toHaveLength(0);
    });

    test("style-only paste with nested selector — all skipped", () => {
      const result = _generateFragmentFromHtml(`
        <style>.card .title { color: red; }</style>
      `);
      expect(result.skippedSelectors).toEqual([".card .title"]);
      expect(result.styleSources).toHaveLength(0);
    });

    test("mixed simple and nested selectors", () => {
      const result = _generateFragmentFromHtml(`
        <style>
          .card { display: flex; }
          .card .title { font-weight: bold; }
        </style>
        <div class="card"><h1 class="title">Hello</h1></div>
      `);
      expect(result.skippedSelectors).toEqual([]);
      // .card token + .card__title nested token
      const tokenNames = result.styleSources
        .filter((s) => s.type === "token")
        .map((s) => s.name);
      expect(tokenNames).toContain("card");
      expect(tokenNames).toContain("card__title");
    });

    test("multiple ancestors: .a .b .c", () => {
      const result = _generateFragmentFromHtml(`
        <style>.a .b .c { color: red; }</style>
        <div class="a"><div class="b"><span class="c">Hi</span></div></div>
      `);
      expect(result.skippedSelectors).toEqual([]);
      const tokenNames = result.styleSources
        .filter((s) => s.type === "token")
        .map((s) => s.name);
      expect(tokenNames).toContain("a__b__c");
    });

    test("nested selector with media query", () => {
      const result = _generateFragmentFromHtml(`
        <style>
          .card .title { color: red; }
          @media (min-width: 768px) {
            .card .title { color: blue; }
          }
        </style>
        <div class="card"><h1 class="title">Hello</h1></div>
      `);
      expect(result.skippedSelectors).toEqual([]);
      const nestedToken = result.styleSources.find(
        (s) => s.type === "token" && s.name === "card__title"
      );
      expect(nestedToken).toBeDefined();
      // should have styles at base breakpoint and 768px breakpoint
      const nestedStyles = result.styles.filter(
        (s) => s.styleSourceId === nestedToken!.id
      );
      const breakpointIds = new Set(nestedStyles.map((s) => s.breakpointId));
      expect(breakpointIds.size).toBe(2);
    });

    test("sibling combinators stay as leftover", () => {
      const result = _generateFragmentFromHtml(`
        <style>.a + .b { color: red; }</style>
        <div class="a">A</div><div class="b">B</div>
      `);
      // sibling selector is not class-based → stays as HtmlEmbed
      expect(result.instances.some((i) => i.component === "HtmlEmbed")).toBe(
        true
      );
    });
  });

  test("resolves cross-rule CSS variable in background shorthand", () => {
    // --clr-red is defined in .my-parent but used in .my-child.
    // background: var(--clr-red) must expand to background-color with the
    // var() reference preserved — NOT inlined to the concrete color #f00.
    const result = _generateFragmentFromHtml(`
      <style>
        .my-parent { --clr-red: #f00; }
        .my-child { background: var(--clr-red); }
      </style>
      <div class="my-parent">
        <div class="my-child">test</div>
      </div>
    `);
    const childToken = result.styleSources.find(
      (s) => s.type === "token" && s.name === "my-child"
    );
    expect(childToken).toBeDefined();
    const bgColor = result.styles.find(
      (s) =>
        s.styleSourceId === childToken!.id && s.property === "backgroundColor"
    );
    // Must be a var() reference, not a concrete inlined color
    expect(bgColor?.value).toEqual(
      expect.objectContaining({ type: "var", value: "clr-red" })
    );
  });
});
