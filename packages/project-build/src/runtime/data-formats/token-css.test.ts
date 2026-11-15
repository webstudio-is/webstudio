import { expect, test } from "vitest";
import { copyDesignToken } from "../token-transfer";
import {
  parseTagStyleTransferData,
  parseTokenTransferData,
  serializeTokenCss,
} from "./token-css";

test("Tag style clipboard data accepts only a supported tag and its CSS selector", () => {
  expect(
    parseTagStyleTransferData(
      '/* @webstudio/tag-style-css/v1 "not-a-tag" */\n.ws-tag-style { color: red; }'
    ).valid
  ).toBe(false);
  expect(
    parseTagStyleTransferData(
      '/* @webstudio/tag-style-css/v1 "button" */\n.ws-token { color: red; }'
    ).valid
  ).toBe(false);
  expect(
    parseTagStyleTransferData(
      '/* @webstudio/tag-style-css/v1 "button" */\n.ws-tag-style p { color: red; }'
    ).valid
  ).toBe(true);
});

test("Tag style clipboard data accepts one nested tag with a state", () => {
  const parsed = parseTagStyleTransferData(
    '/* @webstudio/tag-style-css/v1 "button" */\n.ws-tag-style h2:hover { color: red; }'
  );
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.styles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ state: " h2:hover", property: "color" }),
      ])
    );
  }
});

test("reads a CSS token with variables, states, breakpoints, images, and fonts", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
@font-face {
  font-family: "Example";
  font-style: normal;
  font-weight: 100 900;
  src: url("https://builder.example.com/cgi/asset/example.woff2") format("woff2");
}
:root { --brand: #e0e0e0; }
.ws-token { color: var(--brand); background-image: url("https://builder.example.com/cgi/image/image.png?format=raw"); font-family: Example; }
.ws-token:hover { color: red; }
@media (max-width: 600px) { .ws-token { color: blue; } }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid === false) {
    return;
  }
  expect(parsed.data.sourceOrigin).toBe("https://builder.example.com");
  expect(parsed.data.fragment.styleSources[0]).toMatchObject({
    name: "Button",
  });
  expect(parsed.data.fragment.breakpoints).toEqual(
    expect.arrayContaining([expect.objectContaining({ maxWidth: 600 })])
  );
  expect(parsed.data.fragment.styles).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ state: ":hover", property: "color" }),
      expect.objectContaining({ property: "--brand" }),
    ])
  );
  expect(parsed.data.fragment.assets).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "font", name: "example.woff2" }),
      expect.objectContaining({ type: "image", name: "image.png" }),
    ])
  );
});

test("rejects unsupported token CSS while keeping ordinary CSS pasteable", () => {
  expect(parseTokenTransferData(".button { color: red; }")).toEqual({
    owned: false,
    valid: false,
  });
  expect(
    parseTokenTransferData(
      '/* @webstudio/token-css/v1 "Button" */ .other { color: red; }'
    )
  ).toEqual({
    owned: true,
    valid: false,
  });
});

test("does not claim the removed JSON token format", () => {
  expect(parseTokenTransferData('{"@webstudio/token/v0.1":{}}')).toEqual({
    owned: false,
    valid: false,
  });
});

test("keeps token attribute and descendant states", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
.ws-token[disabled] { opacity: .5; }
.ws-token > svg { fill: red; }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid === false) {
    return;
  }
  expect(parsed.data.fragment.styles.map((style) => style.state)).toEqual([
    "[disabled]",
    ">svg",
  ]);
});

test("keeps complete functional and compound token states", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
.ws-token:nth-child(2) { color: red; }
.ws-token:hover:focus { color: blue; }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.styles.map((style) => style.state)).toEqual([
      ":nth-child(2)",
      ":hover:focus",
    ]);
  }
});

test("keeps conditional root variables and variable-backed shorthands", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
:root { --space: 10px; }
:root:hover { --space: 20px; }
.ws-token { padding: var(--space); }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.styles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: "--space", state: ":hover" }),
        expect.objectContaining({ property: "paddingTop" }),
        expect.objectContaining({ property: "paddingRight" }),
        expect.objectContaining({ property: "paddingBottom" }),
        expect.objectContaining({ property: "paddingLeft" }),
      ])
    );
  }
});

test("keeps same-rule variable references in token shorthands", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
.ws-token { --space: 10px; padding: var(--space); }
@media (max-width: 600px) { .ws-token { --space: 20px; } }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(
      parsed.data.fragment.styles.find(
        (style) => style.property === "paddingTop"
      )?.value
    ).toEqual({ type: "unparsed", value: "var(--space)" });
  }
});

test("keeps variable references in mixed token shorthands", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
.ws-token { --width: 2px; outline: var(--width) solid red; }
@media (max-width: 600px) { .ws-token { --width: 4px; } }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(
      parsed.data.fragment.styles.find(
        (style) => style.property === "outlineWidth"
      )?.value
    ).toEqual({ type: "unparsed", value: "var(--width)" });
  }
});

test("keeps fallback variables in mixed token shorthands", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
.ws-token { outline: var(--width, 2px) solid red; }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(
      parsed.data.fragment.styles.find(
        (style) => style.property === "outlineWidth"
      )?.value
    ).toEqual({ type: "unparsed", value: "var(--width, 2px)" });
  }
});

test("keeps token styles at non-pixel width breakpoints", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
@media (min-width: 40em) { .ws-token { color: red; } }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.breakpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ condition: "min-width:40em" }),
      ])
    );
    expect(parsed.data.fragment.styles).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "color" })])
    );
  }
});

test("keeps range-syntax custom media conditions", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
@media (width >= 600px) { .ws-token { color: red; } }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.breakpoints[1].condition).toContain("width");
    expect(parsed.data.fragment.styles).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "color" })])
    );
    expect(serializeTokenCss(parsed.data)).toContain(
      "@media all and (width>=600px)"
    );
  }
});

test("keeps combined width and custom media conditions", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
@media (min-width: 600px) and (orientation: landscape) {
  .ws-token { color: red; }
}
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.breakpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          condition: "min-width:600px) and (orientation:landscape",
        }),
      ])
    );
    expect(parsed.data.fragment.breakpoints[1]).not.toHaveProperty("minWidth");
    expect(serializeTokenCss(parsed.data)).toContain(
      "@media all and (min-width:600px) and (orientation:landscape)"
    );
  }
});

test("keeps combined custom media conditions", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
@media (orientation: landscape) and (hover: hover) {
  .ws-token { color: red; }
}
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(serializeTokenCss(parsed.data)).toContain(
      "@media all and (orientation:landscape) and (hover:hover)"
    );
  }
});

test.each(["prefers-reduced-motion: reduce", "min-width: 600px"])(
  "keeps negated media condition %s",
  (feature) => {
    const parsed =
      parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
@media not (${feature}) {
  .ws-token { color: red; }
}
`);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      const condition = `not (${feature.replace(": ", ":")})`;
      expect(parsed.data.fragment.breakpoints[1].condition).toBe(condition);
      expect(serializeTokenCss(parsed.data)).toContain(`@media ${condition}`);
    }
  }
);

test("keeps boolean operators between width conditions", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
@media (min-width: 600px) or (max-width: 400px) {
  .ws-token { color: red; }
}
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.breakpoints[1].condition).toBe(
      "min-width:600px) or (max-width:400px"
    );
    expect(serializeTokenCss(parsed.data)).toContain(
      "@media all and (min-width:600px) or (max-width:400px)"
    );
  }
});

test("allows token shorthands to reference ancestor variables", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
.ws-token { padding: var(--space); }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(
      parsed.data.fragment.styles.filter((style) =>
        style.property.startsWith("padding")
      )
    ).toHaveLength(4);
    expect(parsed.data.fragment.styles[0].value).toEqual({
      type: "unparsed",
      value: "var(--space)",
    });
  }
});

test("keeps pseudo-class positions before descendant selectors", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
.ws-token:hover > svg { fill: red; }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.styles[0].state).toBe(":hover>svg");
  }
});

test("absolutizes relative image URLs when copying a pasted token", () => {
  const first = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
:root { --hero: url(/cgi/image/target.svg?format=raw); }
.ws-token { background-image: var(--hero); }
`);
  expect(first.valid).toBe(true);
  if (first.valid === false) {
    return;
  }
  const copiedAgain = serializeTokenCss({
    ...first.data,
    sourceOrigin: "https://target.example.com",
  });
  const parsedAgain = parseTokenTransferData(copiedAgain);
  expect(parsedAgain.valid).toBe(true);
  if (parsedAgain.valid) {
    expect(parsedAgain.data.sourceOrigin).toBe("https://target.example.com");
    expect(parsedAgain.data.fragment.assets).toEqual([
      expect.objectContaining({ name: "target.svg", type: "image" }),
    ]);
  }
});

test("imports image URLs inside custom properties", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
:root { --hero: url("https://builder.example.com/cgi/image/hero.svg?format=raw"); }
.ws-token { background-image: var(--hero); }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.assets).toEqual([
      expect.objectContaining({ name: "hero.svg", type: "image" }),
    ]);
  }
});

test("discovers image assets inside variable fallbacks", () => {
  const parsed = parseTokenTransferData(`/* @webstudio/token-css/v1 "Button" */
:root { --hero: var(--missing, url("https://builder.example.com/cgi/image/hero.svg?format=raw")); }
.ws-token { background-image: var(--hero); }
`);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.assets).toEqual([
      expect.objectContaining({ name: "hero.svg", type: "image" }),
    ]);
  }
});

test("escapes token names that contain a CSS comment terminator", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map(),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "End */ marker" }],
      ]),
      styleSourceSelections: new Map(),
      styles: new Map(),
    },
    { tokenId: "token" }
  );
  const parsed = parseTokenTransferData(copied.data);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.styleSources[0]).toMatchObject({
      name: "End */ marker",
    });
  }
});
