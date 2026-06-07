import { insertAuthorizationToken, loadDevBuild, updateBuild } from "../db";

export type SeededContentModeProject = {
  projectId: string;
  buildId: string;
  editorToken: string;
  initialVersion: number;
  listItemInstanceId: string;
};

const createContentModeBuildData = ({
  listItemInstanceId,
  pages,
  breakpoints = JSON.stringify([]),
}: {
  listItemInstanceId: string;
  pages: string;
  breakpoints?: string;
}) => {
  const rootInstanceId = "body";
  const contentBlockId = "content-block";
  const contentBlockTemplateId = "content-block-template";
  const instances = [
    {
      type: "instance",
      id: rootInstanceId,
      component: "ws:element",
      tag: "body",
      children: [{ type: "id", value: contentBlockId }],
    },
    {
      type: "instance",
      id: contentBlockId,
      component: "ws:block",
      children: [
        { type: "id", value: listItemInstanceId },
        { type: "id", value: contentBlockTemplateId },
      ],
    },
    {
      type: "instance",
      id: contentBlockTemplateId,
      component: "ws:block-template",
      children: [],
    },
    {
      type: "instance",
      id: listItemInstanceId,
      component: "ws:element",
      tag: "h1",
      label: "Heading",
      children: [{ type: "text", value: "Initial content" }],
    },
  ];

  const nextPages = JSON.parse(pages) as {
    homePageId: string;
    pages: Array<{ id: string; rootInstanceId: string }>;
  };
  const homePage = nextPages.pages.find(
    (page) => page.id === nextPages.homePageId
  );
  if (homePage === undefined) {
    throw new Error("Expected existing build to have a home page");
  }
  homePage.rootInstanceId = rootInstanceId;

  return {
    pages: JSON.stringify(nextPages),
    instances: JSON.stringify(instances),
    props: JSON.stringify([]),
    styleSources: JSON.stringify([]),
    styleSourceSelections: JSON.stringify([]),
    styles: JSON.stringify([]),
    breakpoints,
    dataSources: JSON.stringify([]),
    resources: JSON.stringify([]),
    marketplaceProduct: JSON.stringify({}),
  };
};

export const prepareExistingContentModeProject = async ({
  projectId,
  editorToken = "e2e-editor-token",
  listItemInstanceId = "list-item",
}: {
  projectId: string;
  editorToken?: string;
  listItemInstanceId?: string;
}): Promise<SeededContentModeProject> => {
  const build = await loadDevBuild({ projectId });

  await updateBuild(build.id, {
    version: 0,
    ...createContentModeBuildData({
      listItemInstanceId,
      pages: build.pages,
      breakpoints: build.breakpoints,
    }),
  });

  await insertAuthorizationToken({
    token: editorToken,
    projectId,
    name: "E2E editor token",
    relation: "editors",
  });

  return {
    projectId,
    buildId: build.id,
    editorToken,
    initialVersion: 0,
    listItemInstanceId,
  };
};
