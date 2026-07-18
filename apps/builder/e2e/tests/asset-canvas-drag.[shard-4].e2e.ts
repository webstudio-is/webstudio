import assert from "node:assert/strict";
import {
  createDragProject,
  dragIds,
  loadDragProjectData,
} from "../fixtures/drag-project";
import { openAssetsPanel, uploadAsset } from "../flows/assets-panel";
import { getCanvasInstance, openProjectBuilder } from "../flows/builder";
import { dragToCanvas, ensureInteractiveCanvas } from "../flows/drag";
import { newIsolatedPage, test } from "../harness";

test("Dragging an image asset onto canvas inserts a bound Image", async () => {
  const fixture = await createDragProject("asset-canvas");
  const { page, close } = await newIsolatedPage();
  try {
    const canvas = await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    const container = getCanvasInstance({
      canvas,
      instanceSelector: [dragIds.container, dragIds.wrapper, dragIds.body],
    });
    await ensureInteractiveCanvas(page, canvas, container);
    await openAssetsPanel({ page });
    const assetTitle = await uploadAsset({
      page,
      filename: "upload-image.svg",
    });

    await dragToCanvas(page, canvas, page.getByTitle(assetTitle), container);
    await page
      .getByRole("tabpanel", { name: "Assets" })
      .waitFor({ state: "hidden" });

    const { instances, props } = await loadDragProjectData(fixture.projectId);
    const image = instances.find(({ component }) => component === "Image");
    assert(image, "Expected an Image on the canvas");
    const source = props.find(
      (prop) => prop.instanceId === image.id && prop.name === "src"
    );
    assert(source?.type === "asset", "Expected an asset-bound image source");
    assert(source.value.length > 0, "Expected the uploaded asset id");
  } finally {
    await close();
  }
});
