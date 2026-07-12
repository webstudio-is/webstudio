import { insertAuthorizationToken, loadDevBuild, updateBuild } from "../db";
import { loginAndCreateBlankProject } from "../flows/dashboard";
import { newPage } from "../harness";

export const dragIds = {
  body: "drag-body",
  wrapper: "drag-wrapper",
  box: "drag-box",
  heading: "drag-heading",
  container: "drag-container",
  alpha: "drag-alpha-page",
  beta: "drag-beta-page",
  folder: "drag-folder",
} as const;

type Pages = {
  homePageId: string;
  rootFolderId?: string;
  pages: Array<{
    id: string;
    name: string;
    path: string;
    title: string;
    meta: Record<string, unknown>;
    rootInstanceId: string;
  }>;
  folders?: Array<{
    id: string;
    name: string;
    slug: string;
    children: string[];
  }>;
};

const seedBuild = (serializedPages: string) => {
  const pages = JSON.parse(serializedPages) as Pages;
  const home = pages.pages.find(({ id }) => id === pages.homePageId);
  const root = pages.folders?.find(
    ({ id }) => id === (pages.rootFolderId ?? "root")
  );
  if (home === undefined || root === undefined) {
    throw new Error("Expected the blank project home page and root folder");
  }

  home.rootInstanceId = dragIds.body;
  const alphaBody = `${dragIds.alpha}-body`;
  const betaBody = `${dragIds.beta}-body`;
  pages.pages.push(
    {
      id: dragIds.alpha,
      name: "Alpha",
      path: "/alpha",
      title: '"Alpha"',
      meta: {},
      rootInstanceId: alphaBody,
    },
    {
      id: dragIds.beta,
      name: "Beta",
      path: "/beta",
      title: '"Beta"',
      meta: {},
      rootInstanceId: betaBody,
    }
  );
  pages.folders?.push({
    id: dragIds.folder,
    name: "Group",
    slug: "group",
    children: [],
  });
  root.children.push(dragIds.alpha, dragIds.beta, dragIds.folder);

  const pageBodies = pages.pages
    .filter(({ id }) => id !== pages.homePageId)
    .map(({ rootInstanceId, name }) => ({
      type: "instance",
      id: rootInstanceId,
      component: "ws:element",
      tag: "body",
      children: [{ type: "text", value: `${name} page` }],
    }));

  return {
    pages: JSON.stringify(pages),
    instances: JSON.stringify([
      ...pageBodies,
      {
        type: "instance",
        id: dragIds.body,
        component: "ws:element",
        tag: "body",
        children: [{ type: "id", value: dragIds.wrapper }],
      },
      {
        type: "instance",
        id: dragIds.wrapper,
        component: "ws:element",
        tag: "main",
        label: "Drag Wrapper",
        children: [
          { type: "id", value: dragIds.box },
          { type: "id", value: dragIds.heading },
          { type: "id", value: dragIds.container },
        ],
      },
      {
        type: "instance",
        id: dragIds.box,
        component: "ws:element",
        tag: "div",
        label: "Drag Box",
        children: [{ type: "text", value: "Box" }],
      },
      {
        type: "instance",
        id: dragIds.heading,
        component: "ws:element",
        tag: "h1",
        label: "Drag Heading",
        children: [{ type: "text", value: "Heading" }],
      },
      {
        type: "instance",
        id: dragIds.container,
        component: "ws:element",
        tag: "section",
        label: "Drop Container",
        children: [{ type: "text", value: "Drop here" }],
      },
    ]),
    props: "[]",
    styleSources: "[]",
    styleSourceSelections: "[]",
    styles: "[]",
    dataSources: "[]",
    resources: "[]",
    marketplaceProduct: "{}",
  };
};

export const createDragProject = async (name: string) => {
  const page = await newPage();
  try {
    const projectId = await loginAndCreateBlankProject({
      page,
      email: `drag-${name}@webstudio.test`,
      title: `Drag ${name}`,
    });
    const build = await loadDevBuild({ projectId });
    await updateBuild(build.id, { version: 0, ...seedBuild(build.pages) });
    const builderToken = `${projectId}-drag-builder`;
    await insertAuthorizationToken({
      token: builderToken,
      projectId,
      name: "Drag E2E builder token",
      relation: "builders",
    });
    return { projectId, builderToken };
  } finally {
    await page.close();
  }
};
