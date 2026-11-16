import { mkdir, writeFile } from "node:fs/promises";
import { loadDevBuild } from "../db";
import { createLocalBundleFromDevBuild } from "../flows/generated-app";
import { authorManagedForm } from "./mcp-managed-form-author";

export const preparePreviewBundle = async (
  projectId: string,
  ...scenarios: string[]
) => {
  const formIds: string[] = [];
  // Each author reads the build persisted by the previous one.
  for (const scenario of scenarios) {
    const { formId } = await authorManagedForm(projectId, JSON.parse(scenario));
    formIds.push(formId);
  }
  const build = await loadDevBuild({ projectId });
  await mkdir(".webstudio", { recursive: true });
  await writeFile(
    ".webstudio/data.json",
    `${JSON.stringify(createLocalBundleFromDevBuild(build))}\n`
  );
  return formIds;
};
