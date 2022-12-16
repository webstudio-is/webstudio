import { describe, test, expect } from "@jest/globals";
import { type Instance } from "@webstudio-is/react-sdk";
import { findInsertLocation } from "./instance";

const tree: Instance = {
  component: "Body",
  id: "root",
  cssRules: [],
  children: [
    { component: "Heading", id: "heading1", cssRules: [], children: [] },
    {
      component: "Box",
      id: "box1",
      cssRules: [],
      children: [
        { component: "Box", id: "box2", cssRules: [], children: [] },
        { component: "Heading", id: "heading2", cssRules: [], children: [] },
        { component: "Heading", id: "heading3", cssRules: [], children: [] },
      ],
    },
  ],
};

describe("findInsertLocation", () => {
  test("if no selected instance, insert into root", () => {
    expect(findInsertLocation(tree, undefined)).toEqual({
      parentId: "root",
      position: "end",
    });
  });

  test("if selected instance can accept children insert into it", () => {
    expect(findInsertLocation(tree, "box1")).toEqual({
      parentId: "box1",
      position: "end",
    });
  });

  test("if selected instance can not accept children insert into parent", () => {
    expect(findInsertLocation(tree, "heading1")).toEqual({
      parentId: "root",
      position: 1,
    });
    expect(findInsertLocation(tree, "heading2")).toEqual({
      parentId: "box1",
      position: 2,
    });
  });
});
