import { describe, test, expect } from "@jest/globals";
import { Instance, Prop } from "@webstudio-is/project-build";
import { parse } from "./plugin-markdown";

const parseInstanceData = (data?: ReturnType<typeof parse>) => {
  if (data === undefined) {
    return;
  }
  const { children, instances, props } = data;
  for (const instance of instances) {
    Instance.parse(instance);
  }
  for (const prop of props) {
    Prop.parse(prop);
  }
  return { children, instances, props };
};

const options = { generateId: () => "123" };

describe("Plugin Markdown", () => {
  test("paragraph", () => {
    expect(parseInstanceData(parse("xyz", options))).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("h1", () => {
    expect(parseInstanceData(parse("# heading", options)))
      .toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("h6", () => {
    expect(parseInstanceData(parse("###### heading", options)))
      .toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("bold 1", () => {
    expect(parseInstanceData(parse("__bold__", options)))
      .toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("bold 2", () => {
    expect(parseInstanceData(parse("**bold**", options)))
      .toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("italic 1", () => {
    expect(parseInstanceData(parse("_italic_", options)))
      .toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("italic 2", () => {
    expect(parseInstanceData(parse("*italic*", options)))
      .toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("link", () => {
    expect(parseInstanceData(parse('[link](/uri "Title")', options)))
      .toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("image", () => {
    expect(parseInstanceData(parse('![foo](/url "title")', options)))
      .toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("hard line break", () => {
    expect(
      parseInstanceData(
        parse(
          `foo  
      baz`,
          options
        )
      )
    ).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("soft line break", () => {
    expect(
      parseInstanceData(
        parse(
          `foo
      baz`,
          options
        )
      )
    ).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("blockquote", () => {
    expect(parseInstanceData(parse("> bar", options))).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("inline code", () => {
    expect(parseInstanceData(parse("`foo`", options))).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
        "instances": [
          {
            "children": [
              {
                "type": "text",
                "value": "foo",
              },
            ],
            "component": "Code",
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
            "name": "inline",
            "type": "boolean",
            "value": true,
          },
        ],
      }
    `);
  });

  test("code", () => {
    expect(parseInstanceData(parse("```js meta\nfoo\n```", options)))
      .toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
        "instances": [
          {
            "children": [
              {
                "type": "text",
                "value": "foo",
              },
            ],
            "component": "Code",
            "id": "123",
            "type": "instance",
          },
        ],
        "props": [
          {
            "id": "123",
            "instanceId": "123",
            "name": "inline",
            "type": "boolean",
            "value": false,
          },
          {
            "id": "123",
            "instanceId": "123",
            "name": "lang",
            "type": "string",
            "value": "js",
          },
          {
            "id": "123",
            "instanceId": "123",
            "name": "meta",
            "type": "string",
            "value": "meta",
          },
        ],
      }
    `);
  });

  test("list unordered", () => {
    expect(parseInstanceData(parse("- one", options))).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("list ordered", () => {
    expect(parseInstanceData(parse("3. one", options))).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
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
      }
    `);
  });

  test("thematic break | separator", () => {
    expect(parseInstanceData(parse("---", options))).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "type": "id",
            "value": "123",
          },
        ],
        "instances": [
          {
            "children": [],
            "component": "Separator",
            "id": "123",
            "type": "instance",
          },
        ],
        "props": [],
      }
    `);
  });

  // @todo For some reason doesn't work
  test.skip("strikethrough", () => {
    expect(
      parseInstanceData(parse("~One~ ~~two~~ ~~~three~~~.", options))
    ).toMatchInlineSnapshot();
  });
});
