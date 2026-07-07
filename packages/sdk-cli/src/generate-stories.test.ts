import { createElement } from "react";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { $, type TemplateMeta } from "@webstudio-is/template";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { generateStories } from "./generate-stories";

const originalCwd = process.cwd();
const tempRoot = path.join(originalCwd, ".temp");
const tempDirs: string[] = [];

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
  await rmdir(tempRoot).catch(() => undefined);
});

const writeFixtureFile = async (
  root: string,
  file: string,
  content: string
) => {
  await writeFile(path.join(root, file), content);
};

const createTempPackage = async ({
  packageJson,
}: {
  packageJson: Record<string, unknown>;
}) => {
  await mkdir(tempRoot, { recursive: true });
  const root = await mkdtemp(path.join(tempRoot, "webstudio-sdk-stories-"));
  tempDirs.push(root);
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFixtureFile(root, "package.json", JSON.stringify(packageJson));
  return root;
};

const boxMeta: WsComponentMeta = {
  label: "Box",
  contentModel: {
    category: "instance",
    children: ["instance", "text"],
  },
  presetStyle: {},
  props: {},
};

const labelMeta: WsComponentMeta = {
  label: "Label",
  contentModel: {
    category: "instance",
    children: ["instance", "text"],
  },
  presetStyle: {},
  props: {},
};

describe("generateStories", () => {
  test("generates stories from explicit package-local templates and metas", async () => {
    const root = await createTempPackage({
      packageJson: {
        name: "@webstudio-is/sdk-components-react",
        type: "module",
      },
    });

    process.chdir(root);
    await generateStories({
      packageName: "@webstudio-is/sdk-components-react",
      templates: {
        Box: {
          category: "general",
          template: createElement($.Box, undefined, "Explicit story"),
        } satisfies TemplateMeta,
      },
      metas: {
        Box: boxMeta,
      },
    });

    await expect(
      readFile(path.join(root, "src/__generated__/box.stories.tsx"), "utf8")
    ).resolves.toContain('title: "Components/Box"');
  });

  test("imports default components from the base package even when local metas share the short name", async () => {
    const root = await createTempPackage({
      packageJson: {
        name: "@webstudio-is/sdk-components-react-radix",
        type: "module",
      },
    });

    process.chdir(root);
    await generateStories({
      packageName: "@webstudio-is/sdk-components-react-radix",
      templates: {
        BaseLabel: {
          category: "general",
          template: createElement($.Label, undefined, "Base label"),
        } satisfies TemplateMeta,
      },
      metas: {
        Label: {
          ...labelMeta,
          label: "Radix Label",
        },
      },
      namespaceMetas: new Map([
        [
          "@webstudio-is/sdk-components-react/components",
          {
            Box: boxMeta,
            Label: labelMeta,
          },
        ],
      ]),
    });

    const story = await readFile(
      path.join(root, "src/__generated__/base-label.stories.tsx"),
      "utf8"
    );
    expect(story).toContain(
      'import { Box as Box, Label as Label } from "@webstudio-is/sdk-components-react/components";'
    );
    expect(story).not.toContain('from "../components"');
  });
});
