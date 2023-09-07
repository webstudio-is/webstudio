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
          '{\n  "private": true,\n  "sideEffects": false,\n  "scripts": {\n    "build": "remix build",\n    "dev": "remix dev",\n    "start": "remix-serve build",\n    "typecheck": "tsc"\n  },\n  "dependencies": {\n    "@remix-run/node": "^1.19.2",\n    "@remix-run/react": "^1.19.2",\n    "@webstudio-is/react-sdk": "^0.94.0",\n    "@webstudio-is/sdk-components-react-radix": "^0.94.0",\n    "@webstudio-is/sdk-components-react-remix": "^0.94.0",\n    "@webstudio-is/sdk-components-react": "^0.94.0",\n    "@webstudio-is/form-handlers": "^0.94.0",\n    "@webstudio-is/sdk": "^0.94.0",\n    "isbot": "^3.6.8",\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  },\n  "devDependencies": {\n    "@remix-run/serve": "^1.19.2",\n    "@remix-run/dev": "^1.19.2",\n    "@types/react": "^18.2.20",\n    "@types/react-dom": "^18.2.7",\n    "@webstudio-is/http-client": "^0.94.0",\n    "eslint": "^8.48.0",\n    "typescript": "5.2.2"\n  },\n  "engines": {\n    "node": ">=18.0.0"\n  }\n}\n',
        encoding: "utf-8",
        merge: true,
      },
      {
        name: "remix.config.js",
        content:
          '/** @type {import(\'@remix-run/dev\').AppConfig} */\nmodule.exports = {\n  ignoredRouteFiles: ["**/.*"],\n  serverModuleFormat: "cjs",\n  serverDependenciesToBundle: [\n    /@webstudio-is\\/(?!prisma-client)/,\n    "nanoevents",\n    "nanostores",\n    "@nanostores/react",\n    "nanoid",\n    "@jsep-plugin/assignment",\n  ],\n  future: {\n    v2_errorBoundary: true,\n    v2_headers: true,\n    v2_meta: true,\n    v2_normalizeFormMethod: true,\n    v2_routeConvention: true,\n    v2_dev: true,\n  },\n};\n',
        encoding: "utf-8",
        merge: false,
      },
      {
        name: "remix.env.d.ts",
        content:
          '/// <reference types="@remix-run/dev" />\n/// <reference types="@remix-run/node" />\n',
        encoding: "utf-8",
        merge: false,
      },
      {
        name: "tsconfig.json",
        content:
          '{\n  "include": ["remix.env.d.ts", "**/*.ts", "**/*.tsx"],\n  "compilerOptions": {\n    "lib": ["DOM", "DOM.Iterable", "ES2022"],\n    "isolatedModules": true,\n    "esModuleInterop": true,\n    "jsx": "react-jsx",\n    "moduleResolution": "bundler",\n    "resolveJsonModule": true,\n    "target": "ES2022",\n    "strict": true,\n    "allowJs": true,\n    "forceConsistentCasingInFileNames": true,\n    "allowImportingTsExtensions": true,\n    "baseUrl": ".",\n    "paths": {\n      "~/*": ["./app/*"]\n    },\n    "customConditions": ["source"],\n\n    // Remix takes care of building everything in `remix build`.\n    "noEmit": true,\n    "skipLibCheck": true\n  }\n}\n',
        encoding: "utf-8",
        merge: false,
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
            merge: false,
          },
        ],
        subFolders: [],
      },
    ],
  },
};
