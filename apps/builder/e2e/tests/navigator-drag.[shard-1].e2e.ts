import { loadDevBuild } from "../db";
import { createDragProject, dragIds } from "../fixtures/drag-project";
import { openProjectBuilder } from "../flows/builder";
import { ensureInteractiveCanvas } from "../flows/canvas-drag";
import { dragTreeRowAndSave, getTreeRowByButton } from "../flows/tree-drag";
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
    await ensureInteractiveCanvas({ page, canvas, probeSelector: heading });
    const navigator = page.getByRole("tab", { name: "Navigator" });
    if ((await navigator.getAttribute("aria-selected")) !== "true") {
      await navigator.click();
    }
    await page.getByText("Navigator", { exact: true }).first().waitFor();

    const row = (label: string) =>
      getTreeRowByButton({
        rowButton: page
          .locator("[data-navigator-tree] [data-tree-button]")
          .filter({ hasText: label })
          .first(),
      });
    await row("Drag Heading").waitFor();

    await dragTreeRowAndSave({
      page,
      sourceRow: row("Drag Heading"),
      targetRow: row("Drag Box"),
      position: "above",
    });
    const reloadedCanvas = await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await ensureInteractiveCanvas({
      page,
      canvas: reloadedCanvas,
      probeSelector: heading,
    });
    if ((await navigator.getAttribute("aria-selected")) !== "true") {
      await navigator.click();
    }
    await row("Drag Box").waitFor();
    await dragTreeRowAndSave({
      page,
      sourceRow: row("Drag Box"),
      targetRow: row("Drop Container"),
      position: "inside",
    });

    const build = await loadDevBuild({ projectId: fixture.projectId });
    const instances = JSON.parse(build.instances) as Array<{
      id: string;
      children: Array<{ type: string; value: string }>;
    }>;
    const childIds = (id: string) =>
      instances
        .find((instance) => instance.id === id)
        ?.children.filter(({ type }) => type === "id")
        .map(({ value }) => value);
    if (
      JSON.stringify(childIds(dragIds.wrapper)) !==
        JSON.stringify([dragIds.heading, dragIds.container]) ||
      childIds(dragIds.container)?.includes(dragIds.box) !== true
    ) {
      throw new Error("Navigator drag result did not persist");
    }
  } finally {
    await close();
  }
});
