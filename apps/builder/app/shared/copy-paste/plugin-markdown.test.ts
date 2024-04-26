import { describe, test, expect } from "@jest/globals";
import { parse } from "./plugin-markdown";
import { $breakpoints } from "../nano-states";

const options = { generateId: () => "123" };

$breakpoints.set(new Map([["0", { id: "0", label: "base" }]]));

describe("Plugin Markdown", () => {
  test("paragraph", () => {
    expect(parse("xyz", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "xyz",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("h1", () => {
    expect(parse("# heading", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "heading",
        },
      ],
      "component": "Heading",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [
    {
      "id": "123",
      "instanceId": "123",
      "name": "tag",
      "type": "string",
      "value": "h1",
    },
  ],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("h6", () => {
    expect(parse("###### heading", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "heading",
        },
      ],
      "component": "Heading",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [
    {
      "id": "123",
      "instanceId": "123",
      "name": "tag",
      "type": "string",
      "value": "h6",
    },
  ],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("bold 1", () => {
    expect(parse("__bold__", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "bold",
        },
      ],
      "component": "Bold",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("bold 2", () => {
    expect(parse("**bold**", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "bold",
        },
      ],
      "component": "Bold",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("italic 1", () => {
    expect(parse("_italic_", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "italic",
        },
      ],
      "component": "Italic",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("italic 2", () => {
    expect(parse("*italic*", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "italic",
        },
      ],
      "component": "Italic",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("link", () => {
    expect(parse('[link](/uri "Title")', options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "link",
        },
      ],
      "component": "RichTextLink",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [
    {
      "id": "123",
      "instanceId": "123",
      "name": "href",
      "type": "string",
      "value": "/uri",
    },
    {
      "id": "123",
      "instanceId": "123",
      "name": "title",
      "type": "string",
      "value": "Title",
    },
  ],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("image", () => {
    expect(parse('![foo](/url "title")', options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [],
      "component": "Image",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [
    {
      "id": "123",
      "instanceId": "123",
      "name": "src",
      "type": "string",
      "value": "/url",
    },
    {
      "id": "123",
      "instanceId": "123",
      "name": "title",
      "type": "string",
      "value": "title",
    },
    {
      "id": "123",
      "instanceId": "123",
      "name": "alt",
      "type": "string",
      "value": "foo",
    },
  ],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("hard line break", () => {
    expect(
      parse(
        `foo  
      baz`,
        options
      )
    ).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "foo",
        },
        {
          "type": "text",
          "value": "baz",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("soft line break", () => {
    expect(
      parse(
        `foo
      baz`,
        options
      )
    ).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "foo
baz",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("blockquote", () => {
    expect(parse("> bar", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "bar",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "Blockquote",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("inline code", () => {
    expect(parse("`foo`", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [],
      "component": "CodeText",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [
    {
      "id": "123",
      "instanceId": "123",
      "name": "code",
      "type": "string",
      "value": "foo",
    },
  ],
  "resources": [],
  "styleSourceSelections": [
    {
      "instanceId": "123",
      "values": [
        "123",
      ],
    },
  ],
  "styleSources": [
    {
      "id": "123",
      "type": "local",
    },
  ],
  "styles": [
    {
      "breakpointId": "0",
      "property": "display",
      "styleSourceId": "123",
      "value": {
        "type": "keyword",
        "value": "inline-block",
      },
    },
  ],
}
`);
  });

  test("code", () => {
    expect(parse("```js meta\nfoo\n```", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [],
      "component": "CodeText",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [
    {
      "id": "123",
      "instanceId": "123",
      "name": "code",
      "type": "string",
      "value": "foo",
    },
    {
      "id": "123",
      "instanceId": "123",
      "name": "lang",
      "type": "string",
      "value": "js",
    },
  ],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("list unordered", () => {
    expect(parse("- one", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "one",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "ListItem",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "List",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [
    {
      "id": "123",
      "instanceId": "123",
      "name": "ordered",
      "type": "boolean",
      "value": false,
    },
  ],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("list ordered", () => {
    expect(parse("3. one", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [
        {
          "type": "text",
          "value": "one",
        },
      ],
      "component": "Paragraph",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "ListItem",
      "id": "123",
      "type": "instance",
    },
    {
      "children": [
        {
          "type": "id",
          "value": "123",
        },
      ],
      "component": "List",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [
    {
      "id": "123",
      "instanceId": "123",
      "name": "ordered",
      "type": "boolean",
      "value": true,
    },
    {
      "id": "123",
      "instanceId": "123",
      "name": "start",
      "type": "number",
      "value": 3,
    },
  ],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  test("thematic break | separator", () => {
    expect(parse("---", options)).toMatchInlineSnapshot(`
{
  "assets": [],
  "breakpoints": [],
  "children": [
    {
      "type": "id",
      "value": "123",
    },
  ],
  "dataSources": [],
  "instances": [
    {
      "children": [],
      "component": "Separator",
      "id": "123",
      "type": "instance",
    },
  ],
  "props": [],
  "resources": [],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [],
}
`);
  });

  // @todo For some reason doesn't work
  test.skip("strikethrough", () => {
    expect(
      parse("~One~ ~~two~~ ~~~three~~~.", options)
    ).toMatchInlineSnapshot();
  });
});
