import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { createPublishedProjectBundleFixture } from "@webstudio-is/protocol/fixtures";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import {
  assertAuthConfigMatchesBundle,
  createAuthConfigResources,
  createAuthConfigContentFromBundle,
  LOCAL_AUTH_FILE,
} from "./auth-config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixturesRoot = join(root, "fixtures");

const getFixtureBundleFiles = () =>
  readdirSync(fixturesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      fixtureName: entry.name,
      authFile: join(fixturesRoot, entry.name, LOCAL_AUTH_FILE),
      dataFile: join(fixturesRoot, entry.name, ".webstudio/data.json"),
    }))
    .filter(
      ({ authFile, dataFile }) => existsSync(authFile) && existsSync(dataFile)
    );

describe("auth config", () => {
  test("creates auth config content from bundle data", () => {
    expect(
      JSON.parse(
        createAuthConfigContentFromBundle(createPublishedProjectBundleFixture())
      )
    ).toEqual({
      version: 1,
      routes: {},
    });
  });

  test("skips pages without auth when creating auth resources", () => {
    const pages = migratePages(
      createPublishedProjectBundleFixture().build.pages
    );
    const page = pages.pages.get(pages.homePageId);
    if (page === undefined) {
      throw new Error("Home page is missing");
    }
    page.meta.auth = {
      method: "basic",
      login: "admin",
      password: "secret",
    };

    expect(createAuthConfigResources(pages).routes).toEqual([
      {
        route: "/",
        auth: {
          method: "basic",
          login: "admin",
          password: "secret",
          credentials: "admin:secret",
        },
      },
    ]);
  });

  test("rejects malformed auth json", () => {
    expect(() =>
      assertAuthConfigMatchesBundle({
        authFileContent: "{",
        data: createPublishedProjectBundleFixture(),
      })
    ).toThrow(`${LOCAL_AUTH_FILE} is invalid JSON`);
  });

  test("rejects auth config content that does not match bundle data", () => {
    expect(() =>
      assertAuthConfigMatchesBundle({
        authFileContent: JSON.stringify({
          version: 1,
          routes: {
            "/private": {
              method: "basic",
              login: "admin",
              password: "secret",
            },
          },
        }),
        data: createPublishedProjectBundleFixture(),
      })
    ).toThrow(`${LOCAL_AUTH_FILE} does not match .webstudio/data.json`);
  });

  test.each(getFixtureBundleFiles())(
    "$fixtureName auth config matches bundle data",
    ({ authFile, dataFile }) => {
      assertAuthConfigMatchesBundle({
        authFileContent: readFileSync(authFile, "utf8"),
        data: JSON.parse(readFileSync(dataFile, "utf8")),
      });
    }
  );
});
