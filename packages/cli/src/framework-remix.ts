import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { generateRemixRoute } from "@webstudio-is/react-sdk";
import {
  baseComponentImportSource,
  createFrameworkComponentRegistry,
} from "@webstudio-is/sdk-components-registry/framework";
import * as remixComponents from "@webstudio-is/sdk-components-react-remix";
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

  const remix = "@webstudio-is/sdk-components-react-remix";
  const { components, metas } = createFrameworkComponentRegistry({
    routerComponents: remixComponents,
    routerComponentPackage: remix,
  });

  return {
    metas,
    components,
    tags: {
      textarea: `${baseComponentImportSource}:Textarea`,
      input: `${baseComponentImportSource}:Input`,
      select: `${baseComponentImportSource}:Select`,
      body: `${remix}:Body`,
      a: `${remix}:Link`,
      form: `${remix}:RemixForm`,
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
