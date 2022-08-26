import { prisma, Build as DbBuild } from "@webstudio-is/prisma-client";
import { z } from "zod";

const Page = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  title: z.string(),
  meta: z.record(z.string(), z.string()),
  treeId: z.string(),
});

type Page = z.infer<typeof Page>;

const Pages: z.ZodType<{ homePage: Page; pages: Array<Page> }> = z.object({
  homePage: Page,
  pages: z.array(Page),
});

type Pages = z.infer<typeof Pages>;

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
