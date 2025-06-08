import { join } from "node:path";
import { readFile, rm } from "node:fs/promises";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { generateRemixRoute } from "@webstudio-is/react-sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as animationComponentMetas from "@webstudio-is/sdk-components-animation/metas";
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

  const base = "@webstudio-is/sdk-components-react";
  const reactRouter = "@webstudio-is/sdk-components-react-router";
  const reactRadix = "@webstudio-is/sdk-components-react-radix";
  const animation = "@webstudio-is/sdk-components-animation";
  const components: Record<string, string> = {};
  const metas: Record<string, WsComponentMeta> = {};
  for (const [name, meta] of Object.entries(baseComponentMetas)) {
    components[name] = `${base}:${name}`;
    metas[name] = meta;
  }
  for (const name of ["Body", "Link", "RichTextLink", "Form", "RemixForm"]) {
    components[name] = `${reactRouter}:${name}`;
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
