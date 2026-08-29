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
});
