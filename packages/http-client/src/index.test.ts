import { expect, test } from "vitest";
import { parseBuilderUrl } from "./index";

test("parseBuilderUrl wstd.dev", async () => {
  expect(
    parseBuilderUrl("https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.wstd.dev")
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://wstd.dev",
    }
  `);
});

test("parseBuilderUrl localhost", async () => {
  expect(
    parseBuilderUrl("https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.localhost")
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://localhost",
    }
  `);
});

test("parseBuilderUrl localhost", async () => {
  expect(parseBuilderUrl("https://p-eee.localhost")).toMatchInlineSnapshot(`
    {
      "projectId": undefined,
      "sourceOrigin": "https://p-eee.localhost",
    }
  `);
});

test("parseBuilderUrl development.webstudio.is", async () => {
  expect(
    parseBuilderUrl(
      "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.development.webstudio.is"
    )
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://development.webstudio.is",
    }
  `);
});

test("parseBuilderUrl main.development.webstudio.is", async () => {
  expect(
    parseBuilderUrl(
      "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb-dot-main.development.webstudio.is"
    )
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://main.development.webstudio.is",
    }
  `);
});

test("parseBuilderUrl branch.development.webstudio.is", async () => {
  expect(
    parseBuilderUrl(
      "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb-dot-branch.development.webstudio.is"
    )
  ).toMatchInlineSnapshot(`
{
  "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
  "sourceOrigin": "https://branch.development.webstudio.is",
}
`);
});

test("parseBuilderUrl apps.webstudio.is", async () => {
  expect(
    parseBuilderUrl(
      "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is"
    )
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://apps.webstudio.is",
    }
  `);
});

test("parseBuilderUrl apps.webstudio.is", async () => {
  expect(parseBuilderUrl("https://apps.webstudio.is")).toMatchInlineSnapshot(`
    {
      "projectId": undefined,
      "sourceOrigin": "https://apps.webstudio.is",
    }
  `);
});
