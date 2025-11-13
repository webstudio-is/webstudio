import { join } from "node:path";
import { readFile, rm } from "node:fs/promises";
import { isPathnamePattern, type WsComponentMeta } from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as animationComponentMetas from "@webstudio-is/sdk-components-animation/metas";
import * as radixComponentMetas from "@webstudio-is/sdk-components-react-radix/metas";
import type { Framework } from "./framework";

const generateVikeRoute = (pagePath: string) => {
  if (pagePath === "/") {
    return "index";
  }
  return pagePath;
};

export const createFramework = async (): Promise<Framework> => {
  const routeTemplatesDir = join("app", "route-templates");

  const htmlPageTemplate = await readFile(
    join(routeTemplatesDir, "html", "+Page.tsx"),
    "utf8"
  );
  const htmlHeadTemplate = await readFile(
    join(routeTemplatesDir, "html", "+Head.tsx"),
    "utf8"
  );
  const htmlDataTemplate = await readFile(
    join(routeTemplatesDir, "html", "+data.ts"),
    "utf8"
  );

  // cleanup route templates after reading to not bloat generated code
  await rm(routeTemplatesDir, { recursive: true, force: true });

  const base = "@webstudio-is/sdk-components-react";
  const reactRadix = "@webstudio-is/sdk-components-react-radix";
  const animation = "@webstudio-is/sdk-components-animation";
  const components: Record<string, string> = {};
  const metas: Record<string, WsComponentMeta> = {};
  for (const [name, meta] of Object.entries(baseComponentMetas)) {
    components[name] = `${base}:${name}`;
    metas[name] = meta;
  }
  for (const [name, meta] of Object.entries(radixComponentMetas)) {
    components[`${reactRadix}:${name}`] = `${reactRadix}:${name}`;
    metas[`${reactRadix}:${name}`] = meta;
  }
  for (const [name, meta] of Object.entries(animationComponentMetas)) {
    components[`${animation}:${name}`] = `${animation}:${name}`;
    metas[`${animation}:${name}`] = meta;
  }

  return {
    metas,
    components,
    tags: {
      textarea: `${base}:Textarea`,
      input: `${base}:Input`,
      select: `${base}:Select`,
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
    redirect: () => [],
    defaultSitemap: () => [],
  };
};
