import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
} from "@webstudio-is/sdk";
import { createDefaultPages } from "../shared/pages-utils";
import type { BuilderState } from "../state/builder-state";
import { executeBuilderRuntimeOperation } from "./registry";
import type { BuilderRuntimeMutation } from "./mutation";
import type { MdxPasteResult } from "./mdx-paste";
import { InvalidMdxTemplateStructureError } from "./mdx-template-resolution";

const createState = (): BuilderState => ({
  pages: createDefaultPages({ rootInstanceId: "block" }),
  instances: new Map([
    [
      "block",
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [{ type: "id", value: "templates" }],
      },
    ],
    [
      "templates",
      {
        type: "instance",
        id: "templates",
        component: blockTemplateComponent,
        children: [{ type: "id", value: "hero" }],
      },
    ],
    [
      "hero",
      {
        type: "instance",
        id: "hero",
        component: elementComponent,
        tag: "article",
        label: "Hero Card",
        children: [{ type: "text", value: "Template" }],
      },
    ],
  ]),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
});

const createId = () => {
  let index = 0;
  return () => `generated-${index++}`;
};

describe("instances.insertMdxText", () => {
  test("inserts Markdown and resolves destination template names", async () => {
    const mutation = await executeBuilderRuntimeOperation<
      BuilderRuntimeMutation<MdxPasteResult>
    >({
      id: "instances.insertMdxText",
      state: createState(),
      input: {
        parentInstanceId: "block",
        source: '# Heading\n\n<ws.element ws:name="Hero Card" />',
      },
      context: { createId: createId(), projectId: "project" },
    });

    expect(mutation.result.diagnostics).toEqual([]);
    expect(mutation.result.rootInstanceIds).toHaveLength(2);
    expect(mutation.payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ namespace: "instances" }),
      ])
    );
  });

  test("rejects invalid or executable MDX", async () => {
    await expect(
      executeBuilderRuntimeOperation({
        id: "instances.insertMdxText",
        state: createState(),
        input: { parentInstanceId: "block", source: '{alert("unsafe")}' },
        context: { createId: createId(), projectId: "project" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("inserts Markdown outside a Content Block without template resolution", async () => {
    const state = createState();
    const instances = state.instances;
    const root = instances?.get("block");
    if (root === undefined || instances === undefined) {
      throw new Error("Expected root instance");
    }
    root.component = elementComponent;
    root.tag = "main";
    root.children = [];
    instances.delete("templates");
    instances.delete("hero");

    const mutation = await executeBuilderRuntimeOperation<
      BuilderRuntimeMutation<MdxPasteResult>
    >({
      id: "instances.insertMdxText",
      state,
      input: { parentInstanceId: "block", source: "# Heading" },
      context: { createId: createId(), projectId: "project" },
    });

    expect(mutation.result.rootInstanceIds).toHaveLength(1);
    expect(mutation.result.diagnostics).toEqual([]);
  });

  test.each([
    ["without", 0],
    ["with multiple", 2],
  ])(
    "rejects insertion into a block %s Templates containers",
    async (_, count) => {
      const state = createState();
      const instances = state.instances;
      const block = instances?.get("block");
      if (block === undefined || instances === undefined) {
        throw new Error("Expected Content Block");
      }
      if (count === 0) {
        block.children = [];
        instances.delete("templates");
      } else {
        block.children.push({ type: "id", value: "templates-2" });
        instances.set("templates-2", {
          type: "instance",
          id: "templates-2",
          component: blockTemplateComponent,
          children: [],
        });
      }

      await expect(
        executeBuilderRuntimeOperation({
          id: "instances.insertMdxText",
          state,
          input: { parentInstanceId: "block", source: "# Heading" },
          context: { createId: createId(), projectId: "project" },
        })
      ).rejects.toBeInstanceOf(InvalidMdxTemplateStructureError);
    }
  );
});
