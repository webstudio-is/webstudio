import { execFile } from "node:child_process";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type {
  Instance,
  Page,
  Resource,
  StructuredAssetQueryFilterBinding,
} from "@webstudio-is/sdk";
import {
  createStructuredAssetQueryResourceBody,
  encodeDataSourceVariable,
  SYSTEM_VARIABLE_ID,
} from "@webstudio-is/sdk";
import type { AssetFileDocument } from "@webstudio-is/content-engine";
import {
  createAssetIndex,
  createCanonicalAssetFileEntry,
} from "@webstudio-is/content-engine/compiler";
import {
  createPageFixture,
  createPublishedProjectBundleFixture,
} from "@webstudio-is/protocol/fixtures";
import type { PublishedProjectBundle } from "@webstudio-is/protocol";

const execFileAsync = promisify(execFile);
const repositoryRoot = join(import.meta.dirname, "../../..");
const projectId = "ssg-assets-smoke";
const postDataSourceId = "post-data";
const systemExpression = encodeDataSourceVariable(SYSTEM_VARIABLE_ID);
const renderedTitle = "Hello from packaged Assets";

const run = async (args: string[], cwd = repositoryRoot) => {
  try {
    return await execFileAsync("pnpm", args, {
      cwd,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (error) {
    if (error instanceof Error && "stdout" in error && "stderr" in error) {
      error.message += `\n${String(error.stdout)}\n${String(error.stderr)}`;
    }
    throw error;
  }
};

const createAssetsResource = ({
  id,
  filter,
  result = "many",
}: {
  id: string;
  filter: StructuredAssetQueryFilterBinding;
  result?: "many" | "one";
}): Resource => ({
  id,
  name: id,
  control: "system",
  method: "post",
  url: '"/$resources/assets"',
  headers: [],
  body: createStructuredAssetQueryResourceBody({
    result,
    where: { all: [filter] },
    sort: [],
    limit: result === "one" ? "1" : "20",
    offset: "0",
    output: { mode: "all", includeMetadata: false },
    content: { mode: "none" },
  }),
});

const createFixture = async (): Promise<PublishedProjectBundle> => {
  const document: AssetFileDocument = {
    _id: "post-1",
    _type: "asset.file",
    name: "hello-world.md",
    path: "blog/hello-world.md",
    key: "hello-world",
    extension: "md",
    mimeType: "text/markdown",
    size: 13,
    revision: "post-1-revision",
    contentRef: "hello-world.md",
    properties: {
      slug: "hello-world",
      title: renderedTitle,
      draft: false,
    },
  };
  const assetIndex = await createAssetIndex({
    projectId,
    entries: [createCanonicalAssetFileEntry({ projectId, document })],
  });
  const pages: Page[] = [
    createPageFixture({ rootInstanceId: "home-root" }),
    createPageFixture({
      id: "unrelated-query",
      name: "Unrelated query",
      title: "Unrelated query",
      path: "/unrelated/:slug",
      rootInstanceId: "unrelated-root",
    }),
    createPageFixture({
      id: "post",
      name: "Post",
      title: `${encodeDataSourceVariable(postDataSourceId)}.data?.properties?.title ?? "Missing post"`,
      path: "/posts/:slug",
      rootInstanceId: "post-root",
    }),
  ];
  const instances: PublishedProjectBundle["build"]["instances"] = pages.map(
    ({ rootInstanceId }) => [
      rootInstanceId,
      {
        type: "instance",
        id: rootInstanceId,
        component: "Box",
        children: [],
      } satisfies Instance,
    ]
  );
  const unrelatedResource = createAssetsResource({
    id: "unrelated-posts",
    filter: {
      field: ["properties", "draft"],
      operator: "eq",
      value: "false",
    },
  });
  const postResource = createAssetsResource({
    id: "post",
    result: "one",
    filter: {
      field: ["properties", "slug"],
      operator: "eq",
      value: `${systemExpression}.params.slug`,
    },
  });

  return createPublishedProjectBundleFixture({
    projectDomain: "example.com",
    projectTitle: "SSG Assets package smoke",
    page: pages[0],
    pages,
    assetIndex,
    buildPages: {
      homePageId: pages[0].id,
      rootFolderId: "root",
      pages,
      folders: [
        {
          id: "root",
          name: "Root",
          slug: "",
          children: pages.map(({ id }) => id),
        },
      ],
    },
    build: {
      projectId,
      instances,
      dataSources: [
        [
          "unrelated-posts-data",
          {
            id: "unrelated-posts-data",
            type: "resource",
            name: "unrelatedPosts",
            resourceId: unrelatedResource.id,
            scopeInstanceId: "unrelated-root",
          },
        ],
        [
          postDataSourceId,
          {
            id: postDataSourceId,
            type: "resource",
            name: "post",
            resourceId: postResource.id,
            scopeInstanceId: "post-root",
          },
        ],
      ],
      resources: [
        [unrelatedResource.id, unrelatedResource],
        [postResource.id, postResource],
      ],
    },
  });
};

const fixtureDirectory = await mkdtemp(
  join(tmpdir(), "webstudio-ssg-package-")
);

try {
  await run(["--filter", "ssg-cloudflare-pages^...", "run", "build"]);
  await run(["--filter", "ssg-cloudflare-pages", "deploy", fixtureDirectory]);
  await rm(join(fixtureDirectory, "pages"), { recursive: true, force: true });
  await mkdir(join(fixtureDirectory, ".webstudio"), { recursive: true });
  await writeFile(
    join(fixtureDirectory, ".webstudio", "data.json"),
    JSON.stringify(await createFixture()),
    "utf8"
  );

  const cliBuild = await run(
    [
      "-C",
      fixtureDirectory,
      "exec",
      "webstudio",
      "build",
      "--no-assets",
      "--template",
      "ssg",
      "--template",
      "internal",
    ],
    fixtureDirectory
  );
  const siteBuild = await run(["-C", fixtureDirectory, "build"]);
  const output = `${cliBuild.stdout}\n${cliBuild.stderr}\n${siteBuild.stdout}\n${siteBuild.stderr}`;
  assert.doesNotMatch(output, /Failed to load resource request/);

  const html = await readFile(
    join(
      fixtureDirectory,
      "dist",
      "client",
      "posts",
      "hello-world",
      "index.html"
    ),
    "utf8"
  );
  assert.match(html, new RegExp(`<title>${renderedTitle}</title>`));
  await assert.rejects(
    stat(join(fixtureDirectory, "dist", "client", "unrelated")),
    { code: "ENOENT" },
    "An unrelated Assets query produced a dynamic SSG path."
  );
} finally {
  await rm(fixtureDirectory, { recursive: true, force: true });
}
