import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { getAllPages, getPagePath, type Pages } from "@webstudio-is/sdk";
import { createWsAuthResources } from "@webstudio-is/wsauth";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import type { PublishedProjectBundle } from "@webstudio-is/protocol";

export const LOCAL_AUTH_FILE = ".webstudio/auth.json";

export const createAuthConfigResources = (pages: Pages) =>
  createWsAuthResources({
    projectContent: pages.meta?.auth,
    pages: getAllPages(pages)
      .filter((page) => page.meta.auth !== undefined)
      .map((page) => ({
        route: getPagePath(page.id, pages),
        auth: page.meta.auth,
      })),
  });

export const createAuthConfigContentFromBundle = (
  data: Pick<PublishedProjectBundle, "build">
) => createAuthConfigResources(migratePages(data.build.pages)).content;

export const assertAuthConfigMatchesBundle = ({
  authFileContent,
  data,
}: {
  authFileContent: string;
  data: Pick<PublishedProjectBundle, "build">;
}) => {
  let actual: unknown;
  try {
    actual = JSON.parse(authFileContent);
  } catch {
    throw new Error(`${LOCAL_AUTH_FILE} is invalid JSON`);
  }

  const expected = JSON.parse(createAuthConfigContentFromBundle(data));
  if (isDeepStrictEqual(actual, expected) === false) {
    throw new Error(`${LOCAL_AUTH_FILE} does not match .webstudio/data.json`);
  }
};

export const validateAuthConfigFile = async ({
  data,
  filePath,
}: {
  data: Pick<PublishedProjectBundle, "build">;
  filePath: string;
}) => {
  const authFileContent = await readFile(filePath, "utf8").catch((error) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  });

  if (authFileContent === undefined) {
    return false;
  }

  assertAuthConfigMatchesBundle({ authFileContent, data });
  return true;
};
