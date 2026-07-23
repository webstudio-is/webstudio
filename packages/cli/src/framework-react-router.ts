import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { generateRemixRoute } from "@webstudio-is/react-sdk";
import {
  baseComponentImportSource,
  createFrameworkComponentRegistry,
} from "@webstudio-is/sdk-components-registry/framework";
import * as reactRouterComponents from "@webstudio-is/sdk-components-react-router";
import {
  cleanupFrameworkTemplates,
  routeTemplatesDirectory,
  type Framework,
  type FrameworkOptions,
} from "./framework";

export const createFramework = async (
  options: FrameworkOptions = {}
): Promise<Framework> => {
  const htmlTemplate = await readFile(
    join(routeTemplatesDirectory, "html.tsx"),
    "utf8"
  );
  const xmlTemplate = await readFile(
    join(routeTemplatesDirectory, "xml.tsx"),
    "utf8"
  );
  const textTemplate = await readFile(
    join(routeTemplatesDirectory, "text.tsx"),
    "utf8"
  );
  const defaultSitemapTemplate = await readFile(
    join(routeTemplatesDirectory, "default-sitemap.tsx"),
    "utf8"
  );
  // cleanup route templates after reading to not bloat generated code
  await cleanupFrameworkTemplates(options);

  const reactRouter = "@webstudio-is/sdk-components-react-router";
  const { components, metas } = createFrameworkComponentRegistry({
    routerComponents: reactRouterComponents,
    routerComponentPackage: reactRouter,
  });

  return {
    metas,
    components,
    tags: {
      textarea: `${baseComponentImportSource}:Textarea`,
      input: `${baseComponentImportSource}:Input`,
      select: `${baseComponentImportSource}:Select`,
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
