import {
  createDragProject,
  dragIds,
  loadChildIds,
} from "../fixtures/drag-project";
import { openProjectBuilder } from "../flows/builder";
import { dragToCanvas, ensureInteractiveCanvas } from "../flows/drag";
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

    await ensureInteractiveCanvas(page, canvas, container);
    await dragToCanvas(
      page,
      canvas,
      canvas.locator(heading).first(),
      container
    );
    await ensureInteractiveCanvas(page, canvas, container);
    await page.getByRole("tab", { name: "Components" }).click();
    await page.getByPlaceholder("Find components").fill("Box");
    const card = page.locator("[data-drag-component]").first();
    await card.waitFor();
    await dragToCanvas(page, canvas, card, container);

    const children = await loadChildIds(fixture.projectId, dragIds.container);
    if (children?.includes(dragIds.heading) !== true || children.length < 2) {
      throw new Error(
        `Expected reparented and inserted instances: ${children}`
      );
    }
  } finally {
    await close();
  }
});
