import { expect, test } from "vitest";
import { parseWebstudioPragma } from "./webstudio-pragma";

test("reads the same Webstudio pragma in HTML and CSS comments", () => {
  expect(
    parseWebstudioPragma({
      source: "<div></div><!-- @webstudio/inception/1 -->",
      syntax: "html",
      namespace: "inception",
    })
  ).toMatchObject({ owned: true, valid: true, version: "1" });
  expect(
    parseWebstudioPragma({
      source:
        '/* @webstudio/token-css/v1 "Button" */\n.ws-token { color: red; }',
      syntax: "css",
      namespace: "token-css",
    })
  ).toMatchObject({
    owned: true,
    valid: true,
    version: "v1",
    value: "Button",
  });
});

test("keeps other comments separate and rejects malformed owned pragmas", () => {
  expect(
    parseWebstudioPragma({
      source: "/* ordinary */ .box { color: red; }",
      syntax: "css",
      namespace: "token-css",
    })
  ).toEqual({ owned: false, valid: false });
  expect(
    parseWebstudioPragma({
      source:
        '.box::before { content: "/* @webstudio/token-css/v1 \\"Fake\\" */"; }',
      syntax: "css",
      namespace: "token-css",
    })
  ).toEqual({ owned: false, valid: false });
  expect(
    parseWebstudioPragma({
      source: '<div title="<!-- @webstudio/inception/1 -->"></div>',
      syntax: "html",
      namespace: "inception",
    })
  ).toEqual({ owned: false, valid: false });
  expect(
    parseWebstudioPragma({
      source: '/* @webstudio/token-css/v1 "Broken */',
      syntax: "css",
      namespace: "token-css",
    })
  ).toMatchObject({ owned: true, valid: false });
});
