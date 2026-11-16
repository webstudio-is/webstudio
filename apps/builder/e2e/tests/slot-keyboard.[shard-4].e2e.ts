import { randomUUID } from "node:crypto";
import { expect, type BrowserContext, type Frame } from "@playwright/test";
import {
  getCanvasInstance,
  getCanvasInstanceSelector,
  openProjectBuilder,
  waitForCanvasFrame,
} from "../flows/builder";
import { openNavigatorPanel } from "../flows/navigator";
import { waitForSyncComplete } from "../flows/sync-status";
import { createSlotKeyboardProject } from "../fixtures/slot-keyboard-project";
import { test } from "../test";

test.describe.configure({ mode: "parallel" });

const wrapper = ["slot-keyboard-wrapper", "slot-keyboard-body"];
const box = "slot-keyboard-div";
const heading = "slot-keyboard-heading";
const getSlotPair = (suffix = "") => {
  const slotA = [`slot-keyboard-slot-a${suffix}`, ...wrapper];
  const slotB = [`slot-keyboard-slot-b${suffix}`, ...wrapper];
  return {
    slotA,
    slotB,
    fragmentA: [`slot-keyboard-fragment${suffix}`, ...slotA],
    fragmentB: [`slot-keyboard-fragment${suffix}`, ...slotB],
  };
};

const { fragmentA, fragmentB } = getSlotPair();

// Each move starts with the same two children in a separate shared fragment.
const canvasDetachMoves = [
  { key: "ArrowLeft", suffix: "-outdent", id: heading, position: "after" },
  { key: "ArrowUp", suffix: "-above", id: box, position: "before" },
  { key: "ArrowDown", suffix: "-below", id: heading, position: "after" },
] as const;

const expectInstanceOrder = async (
  canvas: Frame,
  before: string[],
  after: string[]
) => {
  const ordered = canvas.locator(
    `${getCanvasInstanceSelector(before)}, ${getCanvasInstanceSelector(after)}`
  );
  await expect(ordered).toHaveCount(2);
  await expect(ordered.first()).toHaveAttribute(
    "data-ws-selector",
    before.join(",")
  );
  await expect(ordered.last()).toHaveAttribute(
    "data-ws-selector",
    after.join(",")
  );
};

const createFixture = async (
  context: BrowserContext,
  additionalPairSuffixes: string[] = []
) => {
  const id = randomUUID();
  return await createSlotKeyboardProject({
    context,
    email: `slot-keyboard-${id}@webstudio.test`,
    builderToken: `slot-keyboard-${id}-builder-token`,
    additionalPairSuffixes,
  });
};

const expectIndented = async (canvas: Frame) => {
  await expect(
    getCanvasInstance({
      canvas,
      instanceSelector: [heading, box, ...fragmentA],
    })
  ).toBeVisible();
  await expect(
    getCanvasInstance({
      canvas,
      instanceSelector: [heading, box, ...fragmentB],
    })
  ).toBeVisible();
};

const expectDetached = async (
  canvas: Frame,
  {
    id,
    suffix = "",
    position,
  }: {
    id: string;
    suffix?: string;
    position: "before" | "after";
  }
) => {
  const { slotA, slotB, fragmentA, fragmentB } = getSlotPair(suffix);
  const movedSelector = [`${id}${suffix}`, ...wrapper];
  for (const fragment of [fragmentA, fragmentB]) {
    await expect(
      getCanvasInstance({
        canvas,
        instanceSelector: [`${id}${suffix}`, ...fragment],
      })
    ).toBeHidden();
  }
  await expect(
    getCanvasInstance({ canvas, instanceSelector: movedSelector })
  ).toBeVisible();
  if (position === "before") {
    await expectInstanceOrder(canvas, movedSelector, slotA);
    return;
  }
  await expectInstanceOrder(canvas, slotA, movedSelector);
  await expectInstanceOrder(canvas, movedSelector, slotB);
};

test("Canvas shortcuts select shared Slot siblings and persist keyboard moves", async ({
  page,
  context,
}) => {
  const { projectId, builderToken } = await createFixture(
    context,
    canvasDetachMoves.map(({ suffix }) => suffix)
  );
  const canvas = await openProjectBuilder({
    page,
    projectId,
    authToken: builderToken,
  });
  const canvasHeading = getCanvasInstance({
    canvas,
    instanceSelector: [heading, ...fragmentA],
  });

  await canvasHeading.click();
  await page.keyboard.press("Control+A");
  await openNavigatorPanel({ page });
  await expect(
    page.locator("[data-tree-button][aria-selected='true']")
  ).toHaveText([/Drop Div/, /Slot Heading/]);

  // Refocus the canvas and select just the heading before moving it.
  await canvasHeading.click();
  await page.keyboard.press("Control+ArrowRight");
  await expectIndented(canvas);

  for (const move of canvasDetachMoves) {
    await test.step(`Canvas ${move.key} moves a child out of both Slots`, async () => {
      const { fragmentA } = getSlotPair(move.suffix);
      await getCanvasInstance({
        canvas,
        instanceSelector: [`${move.id}${move.suffix}`, ...fragmentA],
      }).click();
      await page.keyboard.press(`Control+${move.key}`);
      await expectDetached(canvas, move);
    });
  }

  await waitForSyncComplete({ page, timeout: 30_000 });
  await page.reload();
  const reloadedCanvas = await waitForCanvasFrame({ page });
  await expectIndented(reloadedCanvas);
  for (const move of canvasDetachMoves) {
    await expectDetached(reloadedCanvas, move);
  }
});

test("Navigator shortcuts reorder and outdent shared Slot children while keeping keyboard focus", async ({
  page,
  context,
}) => {
  const { projectId, builderToken } = await createFixture(context);
  const canvas = await openProjectBuilder({
    page,
    projectId,
    authToken: builderToken,
  });
  await getCanvasInstance({
    canvas,
    instanceSelector: [heading, ...fragmentA],
  }).click();
  await openNavigatorPanel({ page });

  const navigator = page.locator("[data-navigator-tree]");
  const row = navigator
    .getByRole("button", { name: "Slot Heading", exact: true })
    .first();
  await row.click();
  await page.keyboard.press("Control+ArrowUp");
  for (const fragment of [fragmentA, fragmentB]) {
    const headingSelector = [heading, ...fragment];
    const boxSelector = [box, ...fragment];
    await expect(
      getCanvasInstance({ canvas, instanceSelector: headingSelector })
    ).toBeVisible();
    await expect(
      getCanvasInstance({ canvas, instanceSelector: boxSelector })
    ).toBeVisible();
    await expectInstanceOrder(canvas, headingSelector, boxSelector);
  }
  await expect(row).toBeFocused();

  await page.keyboard.press("Control+ArrowLeft");
  await expectDetached(canvas, { id: heading, position: "before" });
  await expect(row).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(
    navigator.getByRole("button", {
      name: "Slot Keyboard Wrapper",
      exact: true,
    })
  ).toBeFocused();

  await waitForSyncComplete({ page, timeout: 30_000 });
  await page.reload();
  await expectDetached(await waitForCanvasFrame({ page }), {
    id: heading,
    position: "before",
  });
});
