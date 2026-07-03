import { join } from "node:path";
import { readFile, rm } from "node:fs/promises";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { generateRemixRoute } from "@webstudio-is/react-sdk";
import baseComponentRegistry from "@webstudio-is/sdk-components-react/registry";
import animationComponentRegistry from "@webstudio-is/sdk-components-animation/registry";
import radixComponentRegistry from "@webstudio-is/sdk-components-react-radix/registry";
import * as reactRouterComponents from "@webstudio-is/sdk-components-react-router";
import {
  addComponentOverridesFromExports,
  addComponentsFromRegistry,
} from "./component-registry";
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
  const textTemplate = await readFile(
    join(routeTemplatesDir, "text.tsx"),
    "utf8"
  );
  const defaultSitemapTemplate = await readFile(
    join(routeTemplatesDir, "default-sitemap.tsx"),
    "utf8"
  );
  // cleanup route templates after reading to not bloat generated code
  await rm(routeTemplatesDir, { recursive: true, force: true });

  const base = "@webstudio-is/sdk-components-react/components";
  const reactRouter = "@webstudio-is/sdk-components-react-router";
  const reactRadix = "@webstudio-is/sdk-components-react-radix";
  const animation = "@webstudio-is/sdk-components-animation";
  const components: Record<string, string> = {};
  const metas: Record<string, WsComponentMeta> = {};
  addComponentsFromRegistry({
    registry: baseComponentRegistry,
    componentPackage: base,
    components,
    metas,
  });
  addComponentOverridesFromExports({
    componentExports: reactRouterComponents,
    componentPackage: reactRouter,
    components,
  });
  addComponentsFromRegistry({
    registry: radixComponentRegistry,
    componentPackage: reactRadix,
    components,
    metas,
    namespace: true,
  });
  addComponentsFromRegistry({
    registry: animationComponentRegistry,
    componentPackage: animation,
    components,
    metas,
    namespace: true,
  });

  return {
    metas,
    components,
    tags: {
      textarea: `${base}:Textarea`,
      input: `${base}:Input`,
      select: `${base}:Select`,
      body: `${reactRouter}:Body`,
      a: `${reactRouter}:Link`,
      form: `${reactRouter}:RemixForm`,
    },
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
    text: ({ pagePath }: { pagePath: string }) => [
      {
        file: join("app", "routes", `${generateRemixRoute(pagePath)}.tsx`),
        template: textTemplate,
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
