import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { isPathnamePattern } from "@webstudio-is/sdk";
import {
  baseComponentImportSource,
  createFrameworkComponentRegistry,
} from "@webstudio-is/sdk-components-registry/framework";
import {
  cleanupFrameworkTemplates,
  routeTemplatesDirectory,
  type Framework,
  type FrameworkOptions,
} from "./framework";

const generateVikeRoute = (pagePath: string) => {
  if (pagePath === "/") {
    return "index";
  }
  return pagePath;
};

export const createFramework = async (
  options: FrameworkOptions = {}
): Promise<Framework> => {
  const htmlPageTemplate = await readFile(
    join(routeTemplatesDirectory, "html", "+Page.tsx"),
    "utf8"
  );
  const htmlHeadTemplate = await readFile(
    join(routeTemplatesDirectory, "html", "+Head.tsx"),
    "utf8"
  );
  const htmlDataTemplate = await readFile(
    join(routeTemplatesDirectory, "html", "+data.ts"),
    "utf8"
  );

  // cleanup route templates after reading to not bloat generated code
  await cleanupFrameworkTemplates(options);

  const { components, metas } = createFrameworkComponentRegistry();

  return {
    metas,
    components,
    tags: {
      textarea: `${baseComponentImportSource}:Textarea`,
      input: `${baseComponentImportSource}:Input`,
      select: `${baseComponentImportSource}:Select`,
      a: `${baseComponentImportSource}:Link`,
    },
    html: ({ pagePath }: { pagePath: string }) => {
      // ignore dynamic pages in static export
      if (isPathnamePattern(pagePath)) {
        return [];
      }
      return [
        {
          file: join("pages", generateVikeRoute(pagePath), "+Page.tsx"),
          template: htmlPageTemplate,
        },
        {
          file: join("pages", generateVikeRoute(pagePath), "+Head.tsx"),
          template: htmlHeadTemplate,
        },
        {
          file: join("pages", generateVikeRoute(pagePath), "+data.ts"),
          template: htmlDataTemplate,
        },
      ];
    },
    xml: () => [],
    text: () => [],
    defaultSitemap: () => [],
  };
};
