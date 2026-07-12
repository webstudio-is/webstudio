import { loadDevBuild } from "../db";
import { createDragProject, dragIds } from "../fixtures/drag-project";
import { openProjectBuilder, waitForCanvasFrame } from "../flows/builder";
import { openPagesPanel } from "../flows/pages-panel";
import { dragTreeRowAndSave, getTreeRowByButton } from "../flows/tree-drag";
import { newIsolatedPage, test } from "../harness";

let fixture: Awaited<ReturnType<typeof createDragProject>>;

test.beforeAll(async () => {
  fixture = await createDragProject("pages");
});

test("Pages panel pointer drag reorders and nests pages", async () => {
  const { page, close } = await newIsolatedPage();
  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await openPagesPanel({ page });

    const row = (kind: "Page" | "Folder", name: string) =>
      getTreeRowByButton({
        rowButton: page.getByRole("group", {
          name: `${kind} ${name}`,
          exact: true,
        }),
      });
    await dragTreeRowAndSave({
      page,
      sourceRow: row("Page", "Beta"),
      targetRow: row("Page", "Alpha"),
      position: "above",
    });
    await dragTreeRowAndSave({
      page,
      sourceRow: row("Page", "Alpha"),
      targetRow: row("Folder", "Group"),
      position: "inside",
    });

    await page.reload();
    await waitForCanvasFrame({ page });
    await openPagesPanel({ page });
    await page
      .getByRole("group", { name: "Folder Group", exact: true })
      .locator("[data-tree-button]")
      .click();
    await page
      .getByRole("group", { name: "Page Alpha", exact: true })
      .waitFor();

    const build = await loadDevBuild({ projectId: fixture.projectId });
    const pages = JSON.parse(build.pages) as {
      rootFolderId: string;
      folders: Array<{ id: string; children: string[] }>;
    };
    const children = (id: string) =>
      pages.folders.find((folder) => folder.id === id)?.children;
    const rootChildren = children(pages.rootFolderId);
    if (
      JSON.stringify(children(dragIds.folder)) !==
        JSON.stringify([dragIds.alpha]) ||
      rootChildren?.indexOf(dragIds.beta) !==
        (rootChildren?.indexOf(dragIds.folder) ?? 0) - 1
    ) {
      throw new Error("Pages drag result did not persist");
    }
  } finally {
    await close();
  }
});
