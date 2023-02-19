import { describe, expect } from "@jest/globals";
import { Instance, Prop } from "@webstudio-is/project-build";
import { parse } from "./plugin-markdown";

const parseInstanceData = (data?: {
  instances: Instance["children"];
  props: Array<Prop>;
}) => {
  if (data === undefined) {
    return;
  }
  const { instances, props } = data;
  for (const instance of instances) {
    if ("id" in instance) {
      Instance.parse(instance);
    }
    if ("children" in instance) {
      parseInstanceData({ instances: instance.children, props });
    }
  }
  for (const prop of props) {
    Prop.parse(prop);
  }
  return { instances, props };
};

const options = { generateId: () => "123" };

describe("Plugin Markdown", () => {
  test("paragraph", () => {
    expect(parseInstanceData(parse("xyz", options))).toMatchSnapshot();
  });

  test("h1", () => {
    expect(parseInstanceData(parse("# heading", options))).toMatchSnapshot();
  });

  test("h6", () => {
    expect(
      parseInstanceData(parse("###### heading", options))
    ).toMatchSnapshot();
  });

  test("bold 1", () => {
    expect(parseInstanceData(parse("__bold__", options))).toMatchSnapshot();
  });

  test("bold 2", () => {
    expect(parseInstanceData(parse("**bold**", options))).toMatchSnapshot();
  });

  test("italic 1", () => {
    expect(parseInstanceData(parse("_italic_", options))).toMatchSnapshot();
  });

  test("italic 2", () => {
    expect(parseInstanceData(parse("*italic*", options))).toMatchSnapshot();
  });

  test("link", () => {
    expect(
      parseInstanceData(parse('[link](/uri "Title")', options))
    ).toMatchSnapshot();
  });

  test("image", () => {
    expect(
      parseInstanceData(parse('![foo](/url "title")', options))
    ).toMatchSnapshot();
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
    ).toMatchSnapshot();
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
    ).toMatchSnapshot();
  });

  test("blockquote", () => {
    expect(parseInstanceData(parse("> bar", options))).toMatchSnapshot();
  });

  test("inline code", () => {
    expect(parseInstanceData(parse("`foo`", options))).toMatchSnapshot();
  });

  test("code", () => {
    expect(
      parseInstanceData(parse("```js meta\nfoo\n```", options))
    ).toMatchSnapshot();
  });

  test("list unordered", () => {
    expect(parseInstanceData(parse("- one", options))).toMatchSnapshot();
  });

  test("list ordered", () => {
    expect(parseInstanceData(parse("3. one", options))).toMatchSnapshot();
  });

  // @todo For some reason doesn't work
  test.skip("strikethrough", () => {
    expect(
      parseInstanceData(parse("~One~ ~~two~~ ~~~three~~~.", options))
    ).toMatchSnapshot();
  });
});
