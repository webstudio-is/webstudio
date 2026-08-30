import assert from "node:assert/strict";
import {
  createDragProject,
  dragIds,
  loadPages,
} from "../fixtures/drag-project";
import { openProjectBuilder } from "../flows/builder";
import { dragTreeRow, getTreeRowByButton } from "../flows/drag";
import { openPagesPanel } from "../flows/pages-panel";
import { newIsolatedPage, test, withBrowserContext } from "../test";

let fixture: Awaited<ReturnType<typeof createDragProject>>;

test.beforeAll(async ({ browser }) => {
  fixture = await withBrowserContext(browser, (context) =>
    createDragProject(context, "pages")
  );
});

test("Pages panel pointer drag reorders and nests pages", async ({
  browser,
}) => {
  const { page, close } = await newIsolatedPage(browser);
  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await openPagesPanel({ page });

    const row = (kind: "Page" | "Folder", name: string) =>
      getTreeRowByButton(
        page.getByRole("group", {
          name: `${kind} ${name}`,
          exact: true,
        })
      );
    await dragTreeRow(page, row("Page", "Beta"), row("Page", "Alpha"), "above");
    await dragTreeRow(
      page,
      row("Page", "Alpha"),
      row("Folder", "Group"),
      "inside"
    );

    const pages = await loadPages(fixture.projectId);
    const root = pages.folders.find(({ id }) => id === pages.rootFolderId);
    const folder = pages.folders.find(({ id }) => id === dragIds.folder);
    assert.deepEqual(root?.children.slice(-2), [dragIds.beta, dragIds.folder]);
    assert.deepEqual(folder?.children, [dragIds.alpha]);
  } finally {
    await close();
  }
});
