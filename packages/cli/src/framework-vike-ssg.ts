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

  const radixComponentNamespacedMetas: Record<string, WsComponentMeta> = {};
  for (const [name, meta] of Object.entries(radixComponentMetas)) {
    const namespace = "@webstudio-is/sdk-components-react-radix";
    radixComponentNamespacedMetas[`${namespace}:${name}`] = meta;
  }

  const animationComponentNamespacedMetas: Record<string, WsComponentMeta> = {};
  for (const [name, meta] of Object.entries(animationComponentMetas)) {
    const namespace = "@webstudio-is/sdk-components-animation";
    animationComponentNamespacedMetas[`${namespace}:${name}`] = meta;
  }

  return {
    components: [
      {
        source: "@webstudio-is/sdk-components-react",
        metas: baseComponentMetas,
      },
      {
        source: "@webstudio-is/sdk-components-animation",
        metas: animationComponentNamespacedMetas,
      },
      {
        source: "@webstudio-is/sdk-components-react-radix",
        metas: radixComponentNamespacedMetas,
      },
    ],
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
