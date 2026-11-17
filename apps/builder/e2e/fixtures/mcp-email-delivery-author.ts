import { mkdir, writeFile } from "node:fs/promises";
import { loadDevBuild } from "../db";
import { createLocalBundleFromDevBuild } from "../flows/generated-app";
import { authorManagedForm } from "./mcp-managed-form-author";

export const preparePreviewBundle = async (projectId: string) => {
  const standard = await authorManagedForm(projectId, { mode: "email" });
  const isolated = await authorManagedForm(projectId, {
    mode: "email-isolation",
  });
  const combined = await authorManagedForm(projectId, {
    mode: "email-http-combination",
  });
  const build = await loadDevBuild({ projectId });
  await mkdir(".webstudio", { recursive: true });
  await writeFile(
    ".webstudio/data.json",
    `${JSON.stringify(createLocalBundleFromDevBuild(build))}\n`
  );
  return { standard, isolated, combined };
};
