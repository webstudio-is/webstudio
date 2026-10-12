import { join, relative } from "node:path";
import { readFile, readdir } from "node:fs/promises";
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

const readTemplates = async (directory: string) => {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  return Object.fromEntries(
    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const file = join(entry.parentPath, entry.name);
          // Raw code placeholders use .template to stay out of typechecking.
          return [
            relative(directory, file).replace(/\.template$/, ""),
            await readFile(file, "utf8"),
          ] as const;
        })
    )
  );
};

export const createFramework = async (
  options: FrameworkOptions = {}
): Promise<Framework> => {
  const templatesDirectory = getFrameworkTemplatesDirectory(options);
  const [sharedTemplates, htmlTemplates, textTemplates, dynamicTemplates] =
    await Promise.all(
      ["shared", "html", "text", "dynamic"].map((directory) =>
        readTemplates(join(templatesDirectory, directory))
      )
    );

  const getRouteTemplates = (
    type: "html" | "text",
    pagePath: string,
    prerenderPaths: readonly string[] = []
  ) => {
    const route =
      type === "html"
        ? generateVikeRoute(pagePath)
        : generateVikeTextRoute(pagePath);
    const templates = {
      ...sharedTemplates,
      ...(type === "html" ? htmlTemplates : textTemplates),
      ...(isPathnamePattern(pagePath) ? dynamicTemplates : {}),
    };
    return Object.entries(templates).map(([file, template]) => ({
      file: join("pages", route, file),
      template: template
        .replaceAll("__PAGE_PATH__", () => JSON.stringify(pagePath))
        .replaceAll("__PRERENDER_PATHS__", () =>
          JSON.stringify(prerenderPaths)
        ),
    }));
  };

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
      return getRouteTemplates("html", pagePath, prerenderPaths);
    },
    xml: () => [],
    text: ({ pagePath }) =>
      isPathnamePattern(pagePath) ? [] : getRouteTemplates("text", pagePath),
    defaultSitemap: () => [],
  };
};
