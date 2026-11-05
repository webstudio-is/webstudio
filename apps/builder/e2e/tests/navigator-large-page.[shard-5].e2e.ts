import { expect } from "@playwright/test";
import type { Instance } from "@webstudio-is/sdk";
import { createSeededBuilderProject } from "../fixtures/builder-project";
import {
  getCanvasInstanceSelector,
  openProjectBuilder,
} from "../flows/builder";
import { dragTreeRow, getTreeRowByButton } from "../flows/drag";
import { openNavigatorPanel } from "../flows/navigator";
import { waitForChangeToBeSaved } from "../flows/sync-status";
import { measure } from "../perf";
import { test } from "../test";

test("large-page Navigator selection, repeated reorder, drag, and reload", async ({
  page,
  context,
}) => {
  const count = 2000;
  const fixture = await createSeededBuilderProject({
    context,
    email: "navigator-large-page-e2e@webstudio.test",
    title: "Large Navigator E2E",
    builderToken: "navigator-large-page-e2e-builder-token",
    createBuildUpdate: (build) => {
      const pages = JSON.parse(build.pages) as {
        homePageId: string;
        pages: Array<{ id: string; rootInstanceId: string }>;
      };
      pages.pages.find(({ id }) => id === pages.homePageId)!.rootInstanceId =
        "body";
      const instances: Instance[] = Array.from(
        { length: count },
        (_, index) => ({
          type: "instance",
          id: `row-${index}`,
          component: "ws:element",
          tag: "p",
          label: `Row ${index}`,
          children: [{ type: "text", value: `Row ${index}` }],
        })
      );
      instances.unshift({
        type: "instance",
        id: "body",
        component: "ws:element",
        tag: "body",
        children: instances.map(({ id }) => ({ type: "id", value: id })),
      });
      const breakpointId = (
        JSON.parse(build.breakpoints) as Array<{ id: string }>
      )[0].id;
      return {
        pages: JSON.stringify(pages),
        instances: JSON.stringify(instances),
        props: "[]",
        styleSources: JSON.stringify(
          instances.map(({ id }) => ({ type: "local", id }))
        ),
        styleSourceSelections: JSON.stringify(
          instances.map(({ id }) => ({ instanceId: id, values: [id] }))
        ),
        styles: JSON.stringify(
          instances.flatMap(({ id }) => [
            {
              styleSourceId: id,
              breakpointId,
              property: "marginTop",
              value: { type: "unit", unit: "px", value: 0 },
            },
            {
              styleSourceId: id,
              breakpointId,
              property: "marginBottom",
              value: { type: "unit", unit: "px", value: 4 },
            },
          ])
        ),
      };
    },
  });
  const canvas = await measure("large Navigator initial project load", () =>
    openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    })
  );
  await openNavigatorPanel({ page });
  const tree = page.locator("[data-navigator-tree]");
  const row = (index: number) =>
    tree.getByRole("button", { name: `Row ${index}`, exact: true });
  const order = () =>
    tree
      .locator("[data-tree-button]")
      .evaluateAll((buttons) =>
        buttons.slice(2, 5).map((button) => button.textContent)
      );
  await measure("large Navigator select row", async () => {
    await row(1).click();
    await expect(row(1)).toHaveAttribute("aria-selected", "true");
  });
  await row(2).click({ modifiers: ["ControlOrMeta"] });
  await expect(
    tree.locator('[data-tree-button][aria-selected="true"]')
  ).toHaveCount(2);
  // Move commands currently require one selected instance path.
  await page.keyboard.press("Control+ArrowDown");
  await expect.poll(order).toEqual(["Row 0", "Row 1", "Row 2"]);
  await expect(
    tree.locator('[data-tree-button][aria-selected="true"]')
  ).toHaveCount(2);
  await row(1).click();
  for (const direction of ["ArrowUp", "ArrowDown", "ArrowUp"]) {
    await Promise.all([
      measure("large Navigator save completion", () =>
        waitForChangeToBeSaved({ page })
      ),
      (async () => {
        await measure(
          "large Navigator keyboard move and row update",
          async () => {
            await page.keyboard.press(`Control+${direction}`);
            await expect
              .poll(order)
              .toEqual(
                direction === "ArrowUp"
                  ? ["Row 1", "Row 0", "Row 2"]
                  : ["Row 0", "Row 1", "Row 2"]
              );
            await expect(row(1)).toBeFocused();
          }
        );
        await measure("large Navigator canvas order observed", async () => {
          await expect
            .poll(() =>
              canvas
                .locator(
                  [0, 1, 2]
                    .map((index) =>
                      getCanvasInstanceSelector([`row-${index}`, "body"])
                    )
                    .join(",")
                )
                .allTextContents()
            )
            .toEqual(
              direction === "ArrowUp"
                ? ["Row 1", "Row 0", "Row 2"]
                : ["Row 0", "Row 1", "Row 2"]
            );
        });
      })(),
    ]);
  }
  await measure("large Navigator drag and save", () =>
    dragTreeRow(
      page,
      getTreeRowByButton(row(2)),
      getTreeRowByButton(row(1)),
      "above"
    )
  );
  await expect.poll(order).toEqual(["Row 2", "Row 1", "Row 0"]);
  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await openNavigatorPanel({ page });
  await expect.poll(order).toEqual(["Row 2", "Row 1", "Row 0"]);
});
