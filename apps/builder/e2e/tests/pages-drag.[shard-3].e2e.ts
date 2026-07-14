import { createDragProject } from "../fixtures/drag-project";
import { openProjectBuilder, waitForCanvasFrame } from "../flows/builder";
import { dragTreeRow, getTreeRowByButton } from "../flows/drag";
import { openPagesPanel } from "../flows/pages-panel";
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

    const labels = await page
      .locator(
        '[role="group"][aria-label^="Page "], [role="group"][aria-label^="Folder "]'
      )
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("aria-label")));
    const beta = labels.indexOf("Page Beta");
    if (
      labels.slice(beta, beta + 3).join() !==
      "Page Beta,Folder Group,Page Alpha"
    ) {
      throw new Error("Pages drag result did not persist");
    }
  } finally {
    await close();
  }
});
