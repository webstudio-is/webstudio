import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { makeSchema, queryType } from "nexus";

import { PagesQuery, type PageSource } from "./pages";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type RootValues = {
  pages: PageSource[];
};

export const Query = queryType({
  sourceType: {
    module: fileURLToPath(import.meta.url),
    export: "RootValues",
  },
  definition(t) {
    // We need to define some field here, to avoid error that at least 1 field is required
    t.int("version");
  },
});

export type AppContext = {
  x: string;
};

export const schema = makeSchema({
  types: [Query, PagesQuery],
  outputs: {
    typegen: join(__dirname, "__generated__", "nexus-typegen.ts"),
  },
  contextType: {
    export: "AppContext",
    module: fileURLToPath(import.meta.url),
  },
});
