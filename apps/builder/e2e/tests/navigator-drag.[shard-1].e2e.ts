import assert from "node:assert/strict";
import {
  createDragProject,
  dragIds,
  loadChildIds,
} from "../fixtures/drag-project";
import { getCanvasInstance, openProjectBuilder } from "../flows/builder";
import {
  dragTreeRow,
  ensureInteractiveCanvas,
  getTreeRowByButton,
} from "../flows/drag";
import { openNavigatorPanel } from "../flows/navigator";
import { newIsolatedPage, test } from "../harness";

let fixture: Awaited<ReturnType<typeof createDragProject>>;

test.beforeAll(async () => {
  fixture = await createDragProject("navigator");
});

test("Navigator pointer drag reorders and reparents instances", async () => {
  const { page, close } = await newIsolatedPage();
  try {
    const canvas = await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    const headingSelector = [dragIds.heading, dragIds.wrapper, dragIds.body];
    await ensureInteractiveCanvas(
      page,
      canvas,
      getCanvasInstance({ canvas, instanceSelector: headingSelector })
    );
    await openNavigatorPanel({ page });

    const row = (label: string) =>
      getTreeRowByButton(
        page
          .locator("[data-navigator-tree] [data-tree-button]")
          .filter({ hasText: label })
          .first()
      );
    await row("Drag Heading").waitFor();

    await dragTreeRow(page, row("Drag Heading"), row("Drag Box"), "above");
    assert.deepEqual(await loadChildIds(fixture.projectId, dragIds.wrapper), [
      dragIds.heading,
      dragIds.box,
      dragIds.container,
    ]);
    const reloadedCanvas = await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await ensureInteractiveCanvas(
      page,
      reloadedCanvas,
      getCanvasInstance({
        canvas: reloadedCanvas,
        instanceSelector: headingSelector,
      })
    );
    await openNavigatorPanel({ page });
    await row("Drag Box").waitFor();
    await dragTreeRow(page, row("Drag Box"), row("Drop Container"), "inside");

    const wrapper = await loadChildIds(fixture.projectId, dragIds.wrapper);
    const container = await loadChildIds(fixture.projectId, dragIds.container);
    assert.deepEqual(wrapper, [dragIds.heading, dragIds.container]);
    assert(container?.includes(dragIds.box));
  } finally {
    await close();
  }
});
