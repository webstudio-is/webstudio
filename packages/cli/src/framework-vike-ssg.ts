import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isPathnamePattern, matchPathnameParams } from "@webstudio-is/sdk";
import {
  baseComponentImportSource,
  createFrameworkComponentRegistry,
} from "@webstudio-is/sdk-components-registry/framework";
import {
  cleanupFrameworkTemplates,
  getFrameworkTemplatesDirectory,
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

const generateVikeTextRoute = (pagePath: string) =>
  `text-${createHash("sha256").update(pagePath).digest("hex")}`;

export const createFramework = async (
  options: FrameworkOptions = {}
): Promise<Framework> => {
  const templatesDirectory = getFrameworkTemplatesDirectory(options);
  const htmlPageTemplate = await readFile(
    join(templatesDirectory, "html", "+Page.tsx"),
    "utf8"
  );
  const htmlHeadTemplate = await readFile(
    join(templatesDirectory, "html", "+Head.tsx"),
    "utf8"
  );
  const htmlDataTemplate = await readFile(
    join(templatesDirectory, "html", "+data.ts"),
    "utf8"
  );
  const textPageTemplate = await readFile(
    join(templatesDirectory, "text", "+Page.tsx"),
    "utf8"
  );
  const textConfigTemplate = await readFile(
    join(templatesDirectory, "text", "+config.ts"),
    "utf8"
  );

  // cleanup route templates after reading to not bloat generated code
  await cleanupFrameworkTemplates(options);

  const { components, metas, buildHooks } = createFrameworkComponentRegistry();

  return {
    metas,
    components,
    componentBuildHooks: buildHooks,
    tags: {
      textarea: `${baseComponentImportSource}:Textarea`,
      input: `${baseComponentImportSource}:Input`,
      select: `${baseComponentImportSource}:Select`,
      a: `${baseComponentImportSource}:Link`,
    },
    html: ({ pagePath, prerenderPaths = [] }) => {
      if (pagePath === "/*") {
        return [];
      }
      const dynamic = isPathnamePattern(pagePath);
      if (dynamic && prerenderPaths.length === 0) {
        return [];
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
    text: ({ pagePath }) => {
      if (isPathnamePattern(pagePath)) {
        return [];
      }
      const route = generateVikeTextRoute(pagePath);
      return [
        {
          file: join("pages", route, "+Page.tsx"),
          template: textPageTemplate,
        },
        {
          file: join("pages", route, "+config.ts"),
          template: textConfigTemplate,
        },
        {
          file: join("pages", route, "+data.ts"),
          template: htmlDataTemplate,
        },
        {
          file: join("pages", route, "+route.ts"),
          template: `export default ${JSON.stringify(pagePath)};\n`,
        },
      ];
    },
    defaultSitemap: () => [],
  };
};
