import { expect, test } from "vitest";
import { setEnv } from "@webstudio-is/feature-flags";
import { renderData, ws } from "@webstudio-is/template";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import { registerContainers } from "../sync";
import { $instances, $pages, $project } from "../nano-states";
import { $awareness } from "../awareness";
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
  $awareness.set({ pageId: "pageId", instanceSelector: ["divId", "bodyId"] });
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
  $awareness.set({ pageId: "pageId", instanceSelector: ["divId", "bodyId"] });
  expect(await html.onPaste?.(`It works`)).toEqual(false);
  expect($instances.get()).toEqual(data.instances);
});
