import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { createFramework } from "./framework-react-router";

test("loads generated route templates from the preview workspace", async () => {
  const testDirectory = await mkdtemp(join(tmpdir(), "webstudio-framework-"));
  const projectDirectory = join(testDirectory, "project");
  const previewDirectory = join(testDirectory, "preview");
  const templatesDirectory = join(previewDirectory, "app", "route-templates");
  await Promise.all([
    mkdir(projectDirectory),
    mkdir(templatesDirectory, { recursive: true }),
  ]);
  await Promise.all(
    ["html.tsx", "xml.tsx", "text.tsx", "default-sitemap.tsx"].map((file) =>
      writeFile(join(templatesDirectory, file), file, "utf8")
    )
  );

  const previousDirectory = process.cwd();
  process.chdir(projectDirectory);
  try {
    const framework = await createFramework({
      preserveTemplates: true,
      templatesDirectory,
    });

    expect(framework.html({ pagePath: "/" })[0]?.template).toBe("html.tsx");
  } finally {
    process.chdir(previousDirectory);
    await rm(testDirectory, { recursive: true, force: true });
  }
});
