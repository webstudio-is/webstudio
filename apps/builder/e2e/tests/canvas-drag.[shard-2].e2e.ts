import { loadDevBuild } from "../db";
import { createDragProject, dragIds } from "../fixtures/drag-project";
import { openProjectBuilder } from "../flows/builder";
import {
  dragCanvasInstanceToInstance,
  dragComponentCardToCanvas,
  ensureInteractiveCanvas,
} from "../flows/canvas-drag";
import { newIsolatedPage, test } from "../harness";

let fixture: Awaited<ReturnType<typeof createDragProject>>;
const selector = (...ids: string[]) => `[data-ws-selector="${ids.join(",")}"]`;

test.beforeAll(async () => {
  fixture = await createDragProject("canvas");
});

test("Canvas pointer drag reparents and inserts instances", async () => {
  const { page, close } = await newIsolatedPage();
  try {
    const canvas = await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    const heading = selector(dragIds.heading, dragIds.wrapper, dragIds.body);
    const container = selector(
      dragIds.container,
      dragIds.wrapper,
      dragIds.body
    );

    await dragCanvasInstanceToInstance({
      page,
      canvas,
      sourceSelector: heading,
      targetSelector: container,
    });
    await ensureInteractiveCanvas({
      page,
      canvas,
      probeSelector: selector(dragIds.container, dragIds.wrapper, dragIds.body),
    });
    await page.getByRole("tab", { name: "Components" }).click();
    await page.getByPlaceholder("Find components").fill("Box");
    const card = page.locator("[data-drag-component]").first();
    await card.waitFor();
    await dragComponentCardToCanvas({
      page,
      canvas,
      card,
      targetSelector: container,
    });

    const build = await loadDevBuild({ projectId: fixture.projectId });
    const instances = JSON.parse(build.instances) as Array<{
      id: string;
      children: Array<{ type: string; value: string }>;
    }>;
    const children = instances
      .find(({ id }) => id === dragIds.container)
      ?.children.filter(({ type }) => type === "id")
      .map(({ value }) => value);
    if (children?.includes(dragIds.heading) !== true || children.length < 2) {
      throw new Error(
        `Expected reparented and inserted instances: ${children}`
      );
    }
  } finally {
    await close();
  }
});
