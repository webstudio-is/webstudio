import { join } from "node:path";
import { readFile, rm } from "node:fs/promises";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { generateRemixRoute, namespaceMeta } from "@webstudio-is/react-sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as animationComponentMetas from "@webstudio-is/sdk-components-animation/metas";
import * as reactRouterComponentMetas from "@webstudio-is/sdk-components-react-router/metas";
import * as radixComponentMetas from "@webstudio-is/sdk-components-react-radix/metas";
import type { Framework } from "./framework";

export const createFramework = async (): Promise<Framework> => {
  const routeTemplatesDir = join("app", "route-templates");

  const htmlTemplate = await readFile(
    join(routeTemplatesDir, "html.tsx"),
    "utf8"
  );
  const xmlTemplate = await readFile(
    join(routeTemplatesDir, "xml.tsx"),
    "utf8"
  );
  const defaultSitemapTemplate = await readFile(
    join(routeTemplatesDir, "default-sitemap.tsx"),
    "utf8"
  );
  const redirectTemplate = await readFile(
    join(routeTemplatesDir, "redirect.tsx"),
    "utf8"
  );

  // cleanup route templates after reading to not bloat generated code
  await rm(routeTemplatesDir, { recursive: true, force: true });

  const radixComponentNamespacedMetas: Record<string, WsComponentMeta> = {};
  for (const [name, meta] of Object.entries(radixComponentMetas)) {
    const namespace = "@webstudio-is/sdk-components-react-radix";
    radixComponentNamespacedMetas[`${namespace}:${name}`] = namespaceMeta(
      meta,
      namespace,
      new Set(Object.keys(radixComponentMetas))
    );
  }

  const animationComponentNamespacedMetas: Record<string, WsComponentMeta> = {};
  for (const [name, meta] of Object.entries(animationComponentMetas)) {
    const namespace = "@webstudio-is/sdk-components-animation";
    animationComponentNamespacedMetas[`${namespace}:${name}`] = namespaceMeta(
      meta as WsComponentMeta,
      namespace,
      new Set(Object.keys(animationComponentMetas))
    );
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
      {
        source: "@webstudio-is/sdk-components-react-router",
        metas: reactRouterComponentMetas,
      },
    ],
    html: ({ pagePath }: { pagePath: string }) => [
      {
        file: join("app", "routes", `${generateRemixRoute(pagePath)}.tsx`),
        template: htmlTemplate,
      },
    ],
    xml: ({ pagePath }: { pagePath: string }) => [
      {
        file: join("app", "routes", `${generateRemixRoute(pagePath)}.tsx`),
        template: xmlTemplate,
      },
    ],
    redirect: ({ pagePath }: { pagePath: string }) => [
      {
        file: join("app", "routes", `${generateRemixRoute(pagePath)}.ts`),
        template: redirectTemplate,
      },
    ],
    defaultSitemap: () => [
      {
        file: join(
          "app",
          "routes",
          `${generateRemixRoute("/sitemap.xml")}.tsx`
        ),
        template: defaultSitemapTemplate,
      },
    ],
  };
};
