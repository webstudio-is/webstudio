import { expect, test } from "vitest";
import { copyDesignToken } from "../token-transfer";
import { parseTokenTransferData } from "./token-css";

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
    " > svg",
  ]);
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
