import type { Page } from "playwright";
import { loadDevBuild } from "../db";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { expectGeneratedAppBuild } from "../flows/generated-app";
import { openNavigatorPanel } from "../flows/navigator";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";

const openCommandPanel = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ControlOrMeta+K");
  await page
    .getByPlaceholder("Type a command or search...", { exact: true })
    .waitFor();
};

const selectCommandPanelItem = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const item = page.locator("[cmdk-item]").filter({ hasText: text }).first();
  await item.waitFor({ state: "visible" });
  await item.dblclick();
};

const wrapSelectedInstance = async ({
  page,
  option,
}: {
  page: Page;
  option: string;
}) => {
  await openCommandPanel({ page });
  const commandInput = page.getByPlaceholder("Type a command or search...", {
    exact: true,
  });
  await commandInput.fill("Wrap");
  await selectCommandPanelItem({ page, text: "Wrap" });
  const optionInput = page.getByPlaceholder(
    "Search components to wrap with...",
    {
      exact: true,
    }
  );
  await optionInput.waitFor();
  await optionInput.fill(option);
  const save = waitForChangeToBeSaved({ page });
  await selectCommandPanelItem({ page, text: option });
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const selectNavigatorItem = async ({
  page,
  itemName,
}: {
  page: Page;
  itemName: string;
}) => {
  await openNavigatorPanel({ page });
  const item = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: itemName })
    .last();
  await item.waitFor({ state: "visible" });
  await item.click();
  await item.click();
};

const addAnimationPreset = async ({
  page,
  presetName,
}: {
  page: Page;
  presetName: string;
}) => {
  await page.getByRole("tab", { name: "Settings" }).click();
  const animationsTitle = page.getByText("Animations", { exact: true });
  await animationsTitle.waitFor();
  await page.getByRole("button", { name: "Add animation" }).click();
  await page.getByRole("menuitem", { name: presetName }).click();
  await waitForSyncStatus({ page, status: "idle" });
  await page.getByText(presetName, { exact: true }).waitFor();
};

const expectPersistedAnimation = async ({
  projectId,
  presetName,
}: {
  projectId: string;
  presetName: string;
}) => {
  const build = await loadDevBuild({ projectId });
  const props = JSON.parse(build.props) as Array<{
    type: string;
    name: string;
    value?: {
      type?: string;
      animations?: Array<{ name?: string }>;
    };
  }>;
  const animationProp = props.find(
    (prop) =>
      prop.name === "action" &&
      prop.type === "animationAction" &&
      prop.value?.animations?.some(
        (animation) => animation.name === presetName
      ) === true
  );
  if (animationProp === undefined) {
    throw new Error(
      `Expected persisted animation action with "${presetName}". Received ${JSON.stringify(props)}`
    );
  }
};

const waitForPersistedAnimation = async ({
  projectId,
  presetName,
}: {
  projectId: string;
  presetName: string;
}) => {
  const startedAt = Date.now();
  let lastError: unknown;
  while (Date.now() - startedAt < 10_000) {
    try {
      await expectPersistedAnimation({ projectId, presetName });
      return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError;
};

test("Builder animation UI creates supported animation props that persist and build", async () => {
  const email = "animation-runtime@webstudio.test";
  const fixture = await createContentModeProject({
    email,
    title: "Animation Runtime",
    assetNamePrefix: "animation-runtime-",
    editorToken: "animation-runtime-editor-token",
    builderToken: "animation-runtime-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const text = "Initial content";
  const wrapperName = "Animation Group";
  const presetName = "Fade In";

  try {
    await measure("animation runtime open builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text });
    await selectCanvasTextInstance({ page, text });

    await measure("animation runtime wrap selected text", async () => {
      await wrapSelectedInstance({ page, option: wrapperName });
    });
    await selectNavigatorItem({ page, itemName: wrapperName });

    await measure("animation runtime add preset", async () => {
      await addAnimationPreset({ page, presetName });
    });
    await waitForPersistedAnimation({
      projectId: fixture.projectId,
      presetName,
    });

    await measure("animation runtime reload builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text });
    await expectPersistedAnimation({
      projectId: fixture.projectId,
      presetName,
    });

    await measure("animation runtime generated app build", async () => {
      await expectGeneratedAppBuild({
        projectId: fixture.projectId,
        expectedText: text,
      });
    });
  } finally {
    await close();
  }
});
