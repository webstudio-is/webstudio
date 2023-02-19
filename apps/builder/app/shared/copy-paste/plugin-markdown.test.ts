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
});
