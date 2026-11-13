import { expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { materializeMdxSource } from "./mdx-source";
import { serializeMdxAuthoredContent } from "./mdx-authored-content";

test("saves content when extracting template records changes their map order", async () => {
  const data: Omit<WebstudioData, "pages"> = {
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
          children: [
            { type: "id", value: "heading" },
            { type: "id", value: "paragraph" },
          ],
        },
      ],
      [
        "heading",
        {
          type: "instance",
          id: "heading",
          component: elementComponent,
          tag: "h2",
          children: [],
        },
      ],
      [
        "paragraph",
        {
          type: "instance",
          id: "paragraph",
          component: elementComponent,
          tag: "p",
          children: [],
        },
      ],
    ]),
    props: new Map(),
    dataSources: new Map(),
    resources: new Map(),
    assets: new Map(),
    breakpoints: new Map(),
    styles: new Map(),
    styleSources: new Map([
      ["heading-style", { type: "local", id: "heading-style" }],
      ["paragraph-style", { type: "local", id: "paragraph-style" }],
    ]),
    styleSourceSelections: new Map([
      ["heading", { instanceId: "heading", values: ["heading-style"] }],
      ["paragraph", { instanceId: "paragraph", values: ["paragraph-style"] }],
    ]),
  };
  const { root } = await materializeMdxSource({
    source: "## Heading\n\nParagraph",
    identity: {
      blockInstanceId: "block",
      assetId: "article",
      revision: "one",
      contentRef: "article.mdx",
      format: "mdx",
      renderScope: "page",
    },
    data,
    metas: componentMetas,
    projectId: "project",
  });
  const fragment = structuredClone(root.fragment);
  expect(fragment.styleSourceSelections).toHaveLength(2);
  fragment.styleSourceSelections.reverse();
  fragment.styleSources.reverse();
  fragment.instances.find(({ tag }) => tag === "h2")!.children = [
    { type: "text", value: "Updated heading" },
  ];
  const source = await serializeMdxAuthoredContent({ root, fragment });
  expect(source).toContain("Updated heading");
  expect(source).toContain("Paragraph");
  expect(source).not.toContain("heading-style");

  // Changing selections themselves must still be rejected, not silently lost.
  fragment.styleSourceSelections[0].values.push("another-style");
  await expect(serializeMdxAuthoredContent({ root, fragment })).rejects.toThrow(
    "Changes to styleSourceSelections"
  );
});
