/*

This is an auto-generated file. Please don't change manually.
If needed to make any changes. Add them to ./templates folder and run pnpm run build:templates

*/

import type { Folder, ProjectTarget } from "../args";

export const templates: Record<ProjectTarget, Folder> = {
  defaults: {
    name: "defaults",
    files: [
      {
        name: "package.json",
        content:
          '{\n  "private": true,\n  "sideEffects": false,\n  "scripts": {\n    "build": "remix build",\n    "dev": "remix dev",\n    "typecheck": "tsc"\n  },\n  "dependencies": {\n    "@remix-run/css-bundle": "^1.17.1",\n    "@remix-run/node": "^1.17.1",\n    "@remix-run/react": "^1.17.1",\n    "@webstudio-is/react-sdk": "^0.82.0",\n    "@webstudio-is/sdk-components-react-remix": "^0.82.0",\n    "@webstudio-is/sdk-components-react": "^0.82.0",\n    "@webstudio-is/form-handlers": "^0.75.0",\n    "isbot": "^3.6.8",\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  },\n  "devDependencies": {\n    "@remix-run/serve": "^1.17.1",\n    "@remix-run/dev": "^1.17.1",\n    "@remix-run/eslint-config": "^1.17.1",\n    "@types/react": "^18.0.35",\n    "@types/react-dom": "^18.0.11",\n    "eslint": "^8.38.0",\n    "typescript": "^5.0.4"\n  },\n  "engines": {\n    "node": ">=18.0.0"\n  }\n}\n',
        encoding: "utf-8",
      },
      {
        name: "remix.config.js",
        content:
          '/** @type {import(\'@remix-run/dev\').AppConfig} */\nmodule.exports = {\n  ignoredRouteFiles: ["**/.*"],\n  serverModuleFormat: "cjs",\n  serverDependenciesToBundle: [\n    /@webstudio-is\\/(?!prisma-client)/,\n    "pretty-bytes",\n    "nanoevents",\n    "nanostores",\n    "@nanostores/react",\n    /micromark/,\n    "decode-named-character-reference",\n    "character-entities",\n    /mdast-/,\n    "unist-util-stringify-position",\n  ],\n  future: {\n    v2_errorBoundary: true,\n    v2_headers: true,\n    v2_meta: true,\n    v2_normalizeFormMethod: true,\n    v2_routeConvention: true,\n  },\n};\n',
        encoding: "utf-8",
      },
      {
        name: "template.tsx",
        content:
          'import {\n  V2_MetaFunction,\n  LinksFunction,\n  LinkDescriptor,\n  ActionArgs,\n  json,\n} from "@remix-run/node";\n\nimport {\n  InstanceRoot,\n  type RootPropsData,\n  type Data,\n} from "@webstudio-is/react-sdk";\nimport { n8nHandler, hasMatchingForm } from "@webstudio-is/form-handlers";\n\nimport {\n  fontAssets,\n  components,\n  pageData,\n  user,\n  projectId,\n} from "../__generated__/index";\nimport css from "../__generated__/index.css";\n\nexport type PageData = Omit<Data, "build"> & {\n  build: Pick<Data["build"], "props" | "instances" | "dataSources">;\n};\n\nexport const meta: V2_MetaFunction = () => {\n  const { page } = pageData;\n  return [{ title: page?.title || "Webstudio", ...page?.meta }];\n};\n\nexport const links: LinksFunction = () => {\n  const result: LinkDescriptor[] = [];\n\n  result.push({\n    rel: "stylesheet",\n    href: css,\n  });\n\n  for (const asset of fontAssets) {\n    if (asset.type === "font") {\n      result.push({\n        rel: "preload",\n        href: `/cgi/asset/${asset.name}`,\n        as: "font",\n        crossOrigin: "anonymous",\n        // @todo add mimeType\n        // type: asset.mimeType,\n      });\n    }\n  }\n\n  return result;\n};\n\nconst getRequestHost = (request: Request): string =>\n  request.headers.get("x-forwarded-host") || request.headers.get("host") || "";\n\nexport const action = async ({ request, context }: ActionArgs) => {\n  const formData = await request.formData();\n\n  // We\'re throwing rather than returning `{ success: false }`\n  // because this isn\'t supposed to happen normally: bug or malicious user\n  if (hasMatchingForm(formData, pageData.build.instances) === false) {\n    throw json("Form not found", { status: 404 });\n  }\n\n  const email = user?.email;\n\n  if (email == null) {\n    return { success: false };\n  }\n\n  // wrapped in try/catch just in cases `new URL()` throws\n  // (should not happen)\n  let pageUrl: URL;\n  try {\n    pageUrl = new URL(request.url);\n    pageUrl.host = getRequestHost(request);\n  } catch {\n    return { success: false };\n  }\n\n  const formInfo = {\n    formData,\n    projectId,\n    pageUrl: pageUrl.toString(),\n    toEmail: email,\n    fromEmail: `${pageUrl.hostname}@webstudio.email`,\n  };\n\n  const result = await n8nHandler({\n    formInfo,\n    hookUrl: context.N8N_FORM_EMAIL_HOOK as string,\n  });\n\n  return result;\n};\n\nconst Outlet = () => {\n  const pagesCanvasData: PageData = pageData;\n\n  const page = pagesCanvasData.page;\n\n  if (page === undefined) {\n    throw json("Page not found", {\n      status: 404,\n    });\n  }\n\n  const assetBaseUrl = `/cgi/asset/`;\n  const imageBaseUrl = `/cgi/image/`;\n\n  const params: Data["params"] = {\n    assetBaseUrl,\n    imageBaseUrl,\n  };\n\n  const data: RootPropsData = {\n    build: pagesCanvasData.build,\n    assets: pagesCanvasData.assets,\n    page,\n    pages: pagesCanvasData.pages,\n    params,\n  };\n\n  /*\n    TODO:\n    Figure out, what\'s the executeComputingExpressions function is\n    This needs to be passed, or the projecs break.\n\n  */\n\n  return <InstanceRoot data={data} components={components} />;\n};\n\nexport default Outlet;\n',
        encoding: "utf-8",
      },
    ],
    subFolders: [
      {
        name: "app",
        files: [
          {
            name: "root.tsx",
            content:
              'export { Root as default } from "@webstudio-is/react-sdk";\n',
            encoding: "utf-8",
          },
        ],
        subFolders: [],
      },
    ],
  },
  vercel: {
    name: "vercel",
    files: [
      {
        name: "package.json",
        content:
          '{\n  "dependencies": {\n    "@remix-run/vercel": "^1.17.1",\n    "@vercel/node": "^2.10.3"\n  }\n}\n',
        encoding: "utf-8",
      },
      {
        name: "remix.config.js",
        content:
          '/** @type {import(\'@remix-run/dev\').AppConfig} */\nmodule.exports = {\n  ignoredRouteFiles: ["**/.*"],\n  // When running locally in development mode, we use the built-in remix\n  // server. This does not understand the vercel lambda module format,\n  // so we default back to the standard build output.\n  server: process.env.NODE_ENV === "development" ? undefined : "./server.ts",\n  serverBuildPath: "api/index.js",\n  serverDependenciesToBundle: [\n    /@webstudio-is\\/(?!prisma-client)/,\n    "pretty-bytes",\n    "nanoevents",\n    "nanostores",\n    "@nanostores/react",\n    /micromark/,\n    "decode-named-character-reference",\n    "character-entities",\n    /mdast-/,\n    "unist-util-stringify-position",\n  ],\n  future: {\n    v2_errorBoundary: true,\n    v2_headers: true,\n    v2_meta: true,\n    v2_normalizeFormMethod: true,\n    v2_routeConvention: true,\n  },\n};\n',
        encoding: "utf-8",
      },
      {
        name: "server.ts",
        content:
          'import * as build from "@remix-run/dev/server-build";\nimport { installGlobals } from "@remix-run/node";\nimport { createRequestHandler } from "@remix-run/vercel";\n\ninstallGlobals();\n\nexport default createRequestHandler({ build, mode: process.env.NODE_ENV });\n',
        encoding: "utf-8",
      },
    ],
    subFolders: [],
  },
  "remix-app-server": {
    name: "remix-app-server",
    files: [
      {
        name: "package.json",
        content:
          '{\n  "scripts": {\n    "start": "remix-serve build"\n  }\n}\n',
        encoding: "utf-8",
      },
    ],
    subFolders: [],
  },
};
