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
          '{\n  "private": true,\n  "sideEffects": false,\n  "scripts": {\n    "build": "remix build",\n    "dev": "remix dev",\n    "start": "remix-serve build",\n    "typecheck": "tsc"\n  },\n  "dependencies": {\n    "@remix-run/css-bundle": "^1.19.2",\n    "@remix-run/node": "^1.19.2",\n    "@remix-run/react": "^1.19.2",\n    "@webstudio-is/react-sdk": "^0.82.0",\n    "@webstudio-is/sdk-components-react-remix": "^0.82.0",\n    "@webstudio-is/sdk-components-react": "^0.82.0",\n    "@webstudio-is/form-handlers": "^0.75.0",\n    "isbot": "^3.6.8",\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  },\n  "devDependencies": {\n    "@remix-run/serve": "^1.19.2",\n    "@remix-run/dev": "^1.19.2",\n    "@remix-run/eslint-config": "^1.19.2",\n    "@types/react": "^18.0.35",\n    "@types/react-dom": "^18.0.11",\n    "eslint": "^8.38.0",\n    "typescript": "^5.0.4"\n  },\n  "engines": {\n    "node": ">=18.0.0"\n  }\n}\n',
        encoding: "utf-8",
      },
      {
        name: "remix.config.js",
        content:
          '/** @type {import(\'@remix-run/dev\').AppConfig} */\nmodule.exports = {\n  ignoredRouteFiles: ["**/.*"],\n  serverModuleFormat: "cjs",\n  serverDependenciesToBundle: [\n    /@webstudio-is\\/(?!prisma-client)/,\n    "nanoevents",\n    "nanostores",\n    "@nanostores/react",\n  ],\n  future: {\n    v2_errorBoundary: true,\n    v2_headers: true,\n    v2_meta: true,\n    v2_normalizeFormMethod: true,\n    v2_routeConvention: true,\n  },\n};\n',
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
};
