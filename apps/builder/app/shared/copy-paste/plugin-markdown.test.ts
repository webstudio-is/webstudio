import { describe, test, expect } from "@jest/globals";
import { InstancesItem, Prop } from "@webstudio-is/project-build";
import { parse } from "./plugin-markdown";

const parseInstanceData = (data?: ReturnType<typeof parse>) => {
  if (data === undefined) {
    return;
  }
  const { rootIds, instances, props } = data;
  for (const instance of instances) {
    InstancesItem.parse(instance);
  }
  for (const prop of props) {
    Prop.parse(prop);
  }
  return { rootIds, instances, props };
};

const options = { generateId: () => "123" };

describe("Plugin Markdown", () => {
  test("paragraph", () => {
    expect(parseInstanceData(parse("xyz", options))).toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("h1", () => {
    expect(parseInstanceData(parse("# heading", options)))
      .toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("h6", () => {
    expect(parseInstanceData(parse("###### heading", options)))
      .toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("bold 1", () => {
    expect(parseInstanceData(parse("__bold__", options)))
      .toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("bold 2", () => {
    expect(parseInstanceData(parse("**bold**", options)))
      .toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("italic 1", () => {
    expect(parseInstanceData(parse("_italic_", options)))
      .toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("italic 2", () => {
    expect(parseInstanceData(parse("*italic*", options)))
      .toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("link", () => {
    expect(parseInstanceData(parse('[link](/uri "Title")', options)))
      .toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("image", () => {
    expect(parseInstanceData(parse('![foo](/url "title")', options)))
      .toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
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
        "rootIds": [
          "123",
        ],
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("blockquote", () => {
    expect(parseInstanceData(parse("> bar", options))).toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("inline code", () => {
    expect(parseInstanceData(parse("`foo`", options))).toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("code", () => {
    expect(parseInstanceData(parse("```js meta\nfoo\n```", options)))
      .toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("list unordered", () => {
    expect(parseInstanceData(parse("- one", options))).toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("list ordered", () => {
    expect(parseInstanceData(parse("3. one", options))).toMatchInlineSnapshot(`
      {
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
        "rootIds": [
          "123",
        ],
      }
    `);
  });

  test("thematic break | separator", () => {
    expect(parseInstanceData(parse("---", options))).toMatchInlineSnapshot(`
      {
        "instances": [
          {
            "children": [],
            "component": "Separator",
            "id": "123",
            "type": "instance",
          },
        ],
        "props": [],
        "rootIds": [
          "123",
        ],
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
