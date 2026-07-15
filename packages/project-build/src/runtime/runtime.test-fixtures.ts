import { expect } from "vitest";
import type { BuilderRuntimeContext } from "./context";
import type { BuilderState } from "../state/builder-state";
import type { SemanticValidationIssue } from "./errors";
import { executeBuilderRuntimeOperation } from "./registry";

export const context: BuilderRuntimeContext = {
  createId: () => "id",
};

export const expectRuntimeValidationError = (
  operationId: string,
  input: unknown,
  expectedIssue?: Partial<SemanticValidationIssue>
) => {
  try {
    executeBuilderRuntimeOperation({
      id: operationId,
      state,
      input,
      context,
    });
  } catch (error) {
    expect(error).toMatchObject({
      name: "BuilderRuntimeError",
      code: "INVALID_INPUT",
      issues: expect.any(Array),
    });
    if (expectedIssue !== undefined) {
      expect(
        (error as { issues?: readonly SemanticValidationIssue[] }).issues
      ).toEqual(
        expect.arrayContaining([expect.objectContaining(expectedIssue)])
      );
    }
    return;
  }
  throw new Error(`Expected ${operationId} to reject invalid input`);
};

export const state = {
  pages: {
    homePageId: "home",
    rootFolderId: "root",
    redirects: [{ old: "/old", new: "/new", status: "301" }],
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          title: "Home",
          path: "",
          rootInstanceId: "body",
          meta: {},
        },
      ],
      [
        "post",
        {
          id: "post",
          name: "Post",
          title: "Post",
          path: "/post",
          rootInstanceId: "post-body",
          meta: {
            description: "Post description",
            excludePageFromSearch: "true",
          },
        },
      ],
    ]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home", "blog"],
        },
      ],
      [
        "blog",
        {
          id: "blog",
          name: "Blog",
          slug: "blog",
          children: ["post"],
        },
      ],
    ]),
  },
  projectSettings: { meta: {}, compiler: {} },
  instances: new Map([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        tag: "body",
        children: [{ type: "id", value: "heading" }],
      },
    ],
    [
      "heading",
      {
        type: "instance",
        id: "heading",
        component: "Text",
        tag: "h1",
        label: "Hero",
        children: [{ type: "text", value: "Hello" }],
      },
    ],
  ]),
  props: new Map([
    [
      "prop",
      {
        id: "prop",
        instanceId: "heading",
        name: "title",
        type: "string",
        value: "Heading",
      },
    ],
    [
      "labelProp",
      {
        id: "labelProp",
        instanceId: "heading",
        name: "aria-label",
        type: "string",
        value: "Heading label",
      },
    ],
    [
      "resourceProp",
      {
        id: "resourceProp",
        instanceId: "heading",
        name: "src",
        type: "resource",
        value: "resource",
      },
    ],
  ]),
  styleSources: new Map([
    ["local", { type: "local", id: "local" }],
    ["token", { type: "token", id: "token", name: "Brand" }],
  ]),
  styleSourceSelections: new Map([
    ["heading", { instanceId: "heading", values: ["token", "local"] }],
  ]),
  styles: new Map([
    [
      "local:base::color",
      {
        styleSourceId: "local",
        breakpointId: "base",
        state: undefined,
        property: "color",
        value: { type: "unparsed", value: "var(--brand-color)" },
      },
    ],
    [
      "local:base::--brand-color",
      {
        styleSourceId: "local",
        breakpointId: "base",
        state: undefined,
        property: "--brand-color",
        value: { type: "keyword", value: "red" },
      },
    ],
    [
      "token:base::color",
      {
        styleSourceId: "token",
        breakpointId: "base",
        state: undefined,
        property: "color",
        value: { type: "keyword", value: "blue" },
      },
    ],
  ]),
  dataSources: new Map([
    [
      "variable",
      {
        id: "variable",
        type: "variable",
        name: "Title",
        scopeInstanceId: "heading",
        value: { type: "string", value: "Hello" },
      },
    ],
    [
      "resourceDataSource",
      {
        id: "resourceDataSource",
        type: "resource",
        name: "Posts",
        scopeInstanceId: "heading",
        resourceId: "resource",
      },
    ],
  ]),
  resources: new Map([
    [
      "resource",
      {
        id: "resource",
        name: "Posts",
        method: "get",
        url: `"/posts"`,
        headers: [],
        searchParams: [],
      },
    ],
  ]),
  assets: new Map([
    [
      "asset",
      {
        id: "asset",
        projectId: "project",
        name: "asset.png",
        type: "image",
        size: 1,
        format: "png",
        createdAt: "2026-01-01T00:00:00.000Z",
        description: null,
        meta: { width: 100, height: 100 },
      },
    ],
    [
      "next",
      {
        id: "next",
        projectId: "project",
        name: "next.png",
        type: "image",
        size: 1,
        format: "png",
        createdAt: "2026-01-01T00:00:00.000Z",
        filename: "Hero",
        description: null,
        meta: { width: 100, height: 100 },
      },
    ],
  ]),
  breakpoints: new Map([
    ["base", { id: "base", label: "Base" }],
    ["desktop", { id: "desktop", label: "Desktop", minWidth: 1024 }],
  ]),
} satisfies BuilderState;
