import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { validateRegistry } from "./validate-registry";

const tempDirs = new Set<string>();

afterEach(async () => {
  process.exitCode = undefined;
  await Promise.all(
    [...tempDirs].map((dir) => rm(dir, { recursive: true, force: true }))
  );
  tempDirs.clear();
});

const createTempDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), "webstudio-shadcn-registry-"));
  tempDirs.add(dir);
  return dir;
};

describe("validateRegistry shadcn integration", () => {
  test("validates generated Webstudio registry output with shadcn tooling", async () => {
    const dir = await createTempDir();
    const templatePath =
      "webstudio/components/%40webstudio-is%2Fsdk-components-react-radix%3ASelect.template.json";
    const templateContent = `${JSON.stringify(
      {
        instances: [
          {
            type: "instance",
            id: "0",
            component: "@webstudio-is/sdk-components-react-radix:Select",
            children: [],
          },
        ],
        children: [{ type: "id", value: "0" }],
        props: [],
        styles: [],
        styleSources: [],
        styleSourceSelections: [],
        dataSources: [],
        resources: [],
        assets: [],
      },
      null,
      2
    )}\n`;
    const registry = {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "webstudio",
      homepage: "https://webstudio.is",
      items: [
        {
          name: "template:@webstudio-is/sdk-components-react-radix:Select",
          title: "Select",
          description: "Webstudio Select template registry item.",
          type: "registry:ui",
          dependencies: [],
          registryDependencies: [],
          files: [
            {
              path: templatePath,
              type: "registry:file",
              target: templatePath,
              content: templateContent,
            },
          ],
          docs: "webstudio://project/components/%40webstudio-is%2Fsdk-components-react-radix%3ASelect",
          meta: {
            catalogId:
              "template:@webstudio-is/sdk-components-react-radix:Select",
            source: "template",
            component: "@webstudio-is/sdk-components-react-radix:Select",
            category: "radix",
            label: "Select",
            insert: {
              component: "@webstudio-is/sdk-components-react-radix:Select",
              template: true,
              firstInstance: {
                component: "@webstudio-is/sdk-components-react-radix:Select",
              },
            },
            examples: [
              {
                name: "insert-registered-template",
                description:
                  "Insert this item with its registered Webstudio template.",
                tool: "insert-component",
                input: {
                  component: "@webstudio-is/sdk-components-react-radix:Select",
                },
              },
            ],
          },
        },
      ],
    };

    await mkdir(dirname(join(dir, templatePath)), { recursive: true });
    await writeFile(join(dir, templatePath), templateContent);
    await writeFile(
      join(dir, "registry.json"),
      `${JSON.stringify(registry, null, 2)}\n`
    );

    await validateRegistry(join(dir, "registry.json"), { stdio: "ignore" });

    expect(process.exitCode).toBeUndefined();
  });
});
