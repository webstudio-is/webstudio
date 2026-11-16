import assert from "node:assert/strict";
import {
  createDragProject,
  dragIds,
  getChildIds,
  loadInstances,
} from "../fixtures/drag-project";
import { getCanvasInstance, openProjectBuilder } from "../flows/builder";
import { dragToCanvas, ensureInteractiveCanvas } from "../flows/drag";
import { test, withBrowserContext } from "../test";

let fixture: Awaited<ReturnType<typeof createDragProject>>;

test.beforeAll(async ({ browser }) => {
  fixture = await withBrowserContext(browser, (context) =>
    createDragProject(context, "canvas")
  );
});

test("Canvas pointer drag reparents a heading and inserts a component", async ({
  page,
}) => {
  const canvas = await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  const instance = (...instanceSelector: string[]) =>
    getCanvasInstance({ canvas, instanceSelector });
  const heading = instance(dragIds.heading, dragIds.wrapper, dragIds.body);
  const container = instance(dragIds.container, dragIds.wrapper, dragIds.body);

  await ensureInteractiveCanvas(page, canvas, container);
  await dragToCanvas(page, canvas, heading, container);
  await ensureInteractiveCanvas(page, canvas, container);
  await page.getByRole("tab", { name: "Components" }).click();
  const componentName = "Checkbox";
  await page.getByPlaceholder("Find components").fill(componentName);
  const card = page.locator('[data-drag-component="checkbox"]');
  await card.waitFor();
  await dragToCanvas(page, canvas, card, container);

  const instances = await loadInstances(fixture.projectId);
  const children = getChildIds(instances, dragIds.container);
  assert(children?.includes(dragIds.heading));
  const inserted = instances.filter(
    ({ id }) => children?.includes(id) === true && id !== dragIds.heading
  );
  assert(
    inserted.some(({ label }) => label === `${componentName} Field`),
    `Expected inserted ${componentName}, received ${JSON.stringify(inserted)}`
  );
});
