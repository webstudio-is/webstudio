import {
  createDragProject,
  dragIds,
  loadChildIds,
} from "../fixtures/drag-project";
import { openProjectBuilder } from "../flows/builder";
import {
  dragTreeRow,
  ensureInteractiveCanvas,
  getTreeRowByButton,
} from "../flows/drag";
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
    const heading = `[data-ws-selector="${dragIds.heading},${dragIds.wrapper},${dragIds.body}"]`;
    await ensureInteractiveCanvas(page, canvas, heading);
    const navigator = page.getByRole("tab", { name: "Navigator" });
    if ((await navigator.getAttribute("aria-selected")) !== "true") {
      await navigator.click();
    }
    await page.getByText("Navigator", { exact: true }).first().waitFor();

    const row = (label: string) =>
      getTreeRowByButton(
        page
          .locator("[data-navigator-tree] [data-tree-button]")
          .filter({ hasText: label })
          .first()
      );
    await row("Drag Heading").waitFor();

    await dragTreeRow(page, row("Drag Heading"), row("Drag Box"), "above");
    const reloadedCanvas = await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await ensureInteractiveCanvas(page, reloadedCanvas, heading);
    if ((await navigator.getAttribute("aria-selected")) !== "true") {
      await navigator.click();
    }
    await row("Drag Box").waitFor();
    await dragTreeRow(page, row("Drag Box"), row("Drop Container"), "inside");

    const wrapper = await loadChildIds(fixture.projectId, dragIds.wrapper);
    const container = await loadChildIds(fixture.projectId, dragIds.container);
    if (
      JSON.stringify(wrapper) !==
        JSON.stringify([dragIds.heading, dragIds.container]) ||
      container?.includes(dragIds.box) !== true
    ) {
      throw new Error("Navigator drag result did not persist");
    }
  } finally {
    await close();
  }
});
