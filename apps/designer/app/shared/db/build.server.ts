import { prisma, Build as DbBuild } from "@webstudio-is/prisma-client";
import { z } from "zod";

const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  title: z.string(),
  meta: z.record(z.string(), z.string()),
  treeId: z.string(),
});

type Page = z.infer<typeof PageSchema>;

const PagesSchema: z.ZodType<{ homePage: Page; pages: Array<Page> }> = z.object(
  {
    homePage: PageSchema,
    pages: z.array(PageSchema),
  }
);

type Pages = z.infer<typeof PagesSchema>;

type Build = {
  id: DbBuild["id"];
  pages: Pages;
};

export const load = async (id: Build["id"]): Promise<Build> => {
  if (typeof id !== "string") {
    throw new Error("Build ID required");
  }

  const build = await prisma.build.findUnique({
    where: { id },
  });

  if (build === null) {
    throw new Error("Build not found");
  }

  const pages = Pages.parse(JSON.parse(build.pages));
  return { id, pages };
};
