import type { Asset, Page } from "@webstudio-is/sdk/schema";
import { bundleVersion, type PublishedProjectBundle } from "./schema";

type SerializedBuild = PublishedProjectBundle["build"];
type SerializedPages = SerializedBuild["pages"];
type ImageAsset = Extract<Asset, { type: "image" }>;
type SerializedBuildFixtureOptions = Partial<Omit<SerializedBuild, "pages">> & {
  pages?: Partial<SerializedPages>;
};

export const createPageFixture = (overrides: Partial<Page> = {}): Page => ({
  id: "home",
  name: "Home",
  path: "",
  title: "Home",
  meta: {},
  rootInstanceId: "root",
  ...overrides,
});

export const createImageAssetFixture = (
  overrides: Partial<ImageAsset> = {}
): ImageAsset => ({
  id: "asset-1",
  projectId: "source-project",
  name: "image.png",
  type: "image",
  createdAt: "2024-01-01T00:00:00.000Z",
  format: "png",
  size: 100,
  meta: { width: 100, height: 100 },
  ...overrides,
});

export const createSerializedBuildFixture = ({
  pages,
  ...overrides
}: SerializedBuildFixtureOptions = {}): SerializedBuild => {
  const page = createPageFixture();
  return {
    id: "build-1",
    projectId: "source-project",
    version: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    pages: {
      homePageId: page.id,
      rootFolderId: "root-folder",
      pages: [page],
      folders: [
        {
          id: "root-folder",
          name: "Root",
          slug: "",
          children: [page.id],
        },
      ],
      ...pages,
    } as SerializedPages,
    breakpoints: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    props: [],
    instances: [],
    dataSources: [],
    resources: [],
    ...overrides,
  };
};

type PublishedProjectBundleFixtureOptions = Partial<
  Omit<PublishedProjectBundle, "assets" | "build" | "page" | "pages">
> & {
  build?: SerializedBuildFixtureOptions;
  buildPages?: Partial<SerializedPages>;
  page?: Partial<Page>;
  assets?: Asset[];
  pages?: Page[];
};

export const createPublishedProjectBundleFixture = (
  options: PublishedProjectBundleFixtureOptions = {}
): PublishedProjectBundle => {
  const {
    assets,
    build,
    buildPages,
    page: pageOverrides,
    pages,
    ...overrides
  } = options;
  const page = createPageFixture(pageOverrides);
  return {
    bundleVersion,
    origin: "https://example.com",
    projectDomain: "example",
    projectTitle: "Example",
    page,
    pages: "pages" in options ? (pages as Page[]) : [page],
    assets: "assets" in options ? (assets as Asset[]) : [],
    build: createSerializedBuildFixture({
      ...build,
      pages: {
        homePageId: page.id,
        pages: [page],
        folders: [
          {
            id: "root-folder",
            name: "Root",
            slug: "",
            children: [page.id],
          },
        ],
        ...build?.pages,
        ...buildPages,
      },
    }),
    ...overrides,
  };
};
