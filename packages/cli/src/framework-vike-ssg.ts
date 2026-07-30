import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { isPathnamePattern, matchPathnameParams } from "@webstudio-is/sdk";
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
  let route = pagePath;
  const matches = [...matchPathnameParams(pagePath)].reverse();
  for (const match of matches) {
    const name = match.groups?.name;
    if (name === undefined || match.index === undefined) {
      continue;
    }
    route = `${route.slice(0, match.index)}@${name}${route.slice(match.index + match[0].length)}`;
  }
  return route;
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
    html: ({ pagePath, prerenderPaths = [] }) => {
      const dynamic = isPathnamePattern(pagePath);
      if (dynamic && prerenderPaths.length === 0) {
        throw new Error(
          `Dynamic SSG page ${JSON.stringify(pagePath)} has no enumerable Assets query paths`
        );
      }
      const route = generateVikeRoute(pagePath);
      const entries = [
        {
          file: join("pages", route, "+Page.tsx"),
          template: htmlPageTemplate,
        },
        {
          file: join("pages", route, "+Head.tsx"),
          template: htmlHeadTemplate,
        },
        {
          file: join("pages", route, "+data.ts"),
          template: htmlDataTemplate,
        },
      ];
      if (dynamic) {
        entries.push({
          file: join("pages", route, "+onBeforePrerenderStart.ts"),
          template: `export const onBeforePrerenderStart = () => ${JSON.stringify(
            prerenderPaths
          )};\n`,
        });
      }
      return entries;
    },
    xml: () => [],
    text: () => [],
    defaultSitemap: () => [],
  };
};
