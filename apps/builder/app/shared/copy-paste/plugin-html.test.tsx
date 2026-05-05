import { expect, test } from "vitest";
import { setEnv } from "@webstudio-is/feature-flags";
import { renderData, ws } from "@webstudio-is/template";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import { registerContainers } from "../sync/sync-stores";
import { $instances } from "~/shared/sync/data-stores";
import { $pages, $project } from "~/shared/sync/data-stores";
import { $selectedPageId, $selectedInstanceSelector } from "../nano-states";
import { html } from "./plugin-html";

setEnv("*");
registerContainers();

test("paste html fragment", async () => {
  const data = renderData(
    <ws.element ws:tag="body" ws:id="bodyId">
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    </ws.element>
  );
  $project.set({ id: "" } as Project);
  $instances.set(data.instances);
  $pages.set(
    createDefaultPages({ rootInstanceId: "bodyId", homePageId: "pageId" })
  );
  $selectedPageId.set("pageId");
  $selectedInstanceSelector.set(["divId", "bodyId"]);
  expect(
    await html.onPaste?.(`
      <section>
        <h1>It works</h1>
      </section>
    `)
  ).toEqual(true);
  const [_bodyId, _divId, sectionId, headingId] = $instances.get().keys();
  expect(sectionId).toBeTruthy();
  expect(headingId).toBeTruthy();
  expect($instances.get()).toEqual(
    renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="divId">
          <ws.element ws:tag="section" ws:id={sectionId}>
            <ws.element ws:tag="h1" ws:id={headingId}>
              It works
            </ws.element>
          </ws.element>
        </ws.element>
      </ws.element>
    ).instances
  );
});

test("ignore html without any tags", async () => {
  const data = renderData(
    <ws.element ws:tag="body" ws:id="bodyId">
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    </ws.element>
  );
  $project.set({ id: "" } as Project);
  $instances.set(data.instances);
  $pages.set(
    createDefaultPages({ rootInstanceId: "bodyId", homePageId: "pageId" })
  );
  $selectedPageId.set("pageId");
  $selectedInstanceSelector.set(["divId", "bodyId"]);
  expect(await html.onPaste?.(`It works`)).toEqual(false);
  expect($instances.get()).toEqual(data.instances);
});

test("skip whitespace-only text nodes between element siblings", async () => {
  const data = renderData(
    <ws.element ws:tag="body" ws:id="bodyId">
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    </ws.element>
  );
  $project.set({ id: "" } as Project);
  $instances.set(data.instances);
  $pages.set(
    createDefaultPages({ rootInstanceId: "bodyId", homePageId: "pageId" })
  );
  $selectedPageId.set("pageId");
  $selectedInstanceSelector.set(["divId", "bodyId"]);

  // Regression test: whitespace between elements should not create separate text nodes
  // but the space should be preserved as part of one of the adjacent span instances
  // This ensures the second span gets text-content control in settings panel
  expect(
    await html.onPaste?.(`<div><span>✓</span> <span>text</span></div>`)
  ).toEqual(true);

  const instances = Array.from($instances.get().values()).filter(
    (i) => i.id !== "bodyId" && i.id !== "divId"
  );

  const divs = instances.filter((i) => i.tag === "div");
  expect(divs.length).toBeGreaterThan(0);

  const pastedDiv = divs[0];
  expect(pastedDiv?.children).toHaveLength(2);

  // Both children should be element ids (the two spans), not a text node for the space
  expect(pastedDiv?.children[0].type).toBe("id");
  expect(pastedDiv?.children[1].type).toBe("id");
  expect(pastedDiv?.children.some((c) => c.type === "text")).toBe(false);

  // Verify the space is preserved in one of the spans' text content
  const child0 = pastedDiv?.children[0];
  const child1 = pastedDiv?.children[1];
  const span1Id = child0?.type === "id" ? child0.value : undefined;
  const span2Id = child1?.type === "id" ? child1.value : undefined;

  const span1 = span1Id ? $instances.get().get(span1Id) : undefined;
  const span2 = span2Id ? $instances.get().get(span2Id) : undefined;

  const span1Text =
    span1?.children[0]?.type === "text" ? span1.children[0].value : "";
  const span2Text =
    span2?.children[0]?.type === "text" ? span2.children[0].value : "";

  // Space should be preserved as part of one of the spans, not lost
  const combinedText = span1Text + span2Text;
  expect(combinedText).toContain("✓");
  expect(combinedText).toContain("text");
  expect(combinedText).toContain(" ");
});
