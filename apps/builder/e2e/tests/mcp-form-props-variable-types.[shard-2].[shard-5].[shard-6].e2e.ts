import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { openProjectBuilder } from "../flows/builder";
import { selectNavigatorItem } from "../flows/navigator";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

test("MCP-authored new Form exposes Form controls and hides native rendered-tag props", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-props-types@webstudio.test",
    title: "MCP Form props and variable types",
    assetNamePrefix: "mcp-form-props-types-",
    builderToken: "mcp-form-props-types-builder-token",
  });
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      reactGlobalPath,
      "--conditions=webstudio",
      authorPath,
      fixture.projectId,
    ],
    {
      timeout: 60_000,
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: fileURLToPath(
          new URL(
            "../../../../packages/cli/tsconfig.local.json",
            import.meta.url
          )
        ),
      },
    }
  );
  expect(JSON.parse(stdout)).toEqual(
    expect.objectContaining({ formId: expect.any(String) })
  );

  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await selectNavigatorItem({ page, name: "Form (Beta)" });
  await page.getByRole("tab", { name: "Settings" }).click();

  await expect(page.getByText("Action", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("Success redirect", { exact: true }).first()
  ).toBeVisible();
  for (const nativeProp of [
    "Tag",
    "Method",
    "Target",
    "Enc type",
    "No validate",
  ]) {
    await expect(page.getByText(nativeProp, { exact: true })).toHaveCount(0);
  }

  const resourceRow = page.getByRole("button", {
    name: "Variable Blocked HTTP action",
  });
  await expect(resourceRow).toBeVisible();
  await resourceRow.click();
  const dialog = page.getByRole("dialog");
  const type = dialog.locator('button[role="combobox"]').filter({
    hasText: "REST resource",
  });
  await expect(type).toContainText("REST resource");
  await type.click();
  expect(
    await page
      .getByRole("option")
      .evaluateAll((options) =>
        options.map((option) => option.textContent?.replace(/Pro$/, "").trim())
      )
  ).toEqual([
    "String",
    "Number",
    "Boolean",
    "JSON",
    "REST resource",
    "GraphQL resource",
    "Assets resource",
    "Email resource",
    "Sitemap resource",
    "Current date resource",
  ]);
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Close" }).last().click();

  for (const resourceType of [
    "GraphQL resource",
    "Assets resource",
    "Email resource",
    "Sitemap resource",
    "Current date resource",
  ]) {
    await resourceRow.click();
    const currentType = dialog.locator('button[role="combobox"]').filter({
      hasText: /resource/i,
    });
    await currentType.click();
    await page.getByRole("option", { name: resourceType }).click();
    await expect(currentType).toContainText(resourceType);
    await dialog.getByRole("button", { name: "Close" }).last().click();
    await resourceRow.click();
    await expect(
      dialog
        .locator('button[role="combobox"]')
        .filter({ hasText: resourceType })
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).last().click();
  }
});
