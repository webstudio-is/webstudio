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

type Child = { type: "id" | "text"; value: string };
const element = (
  id: string,
  tag: string,
  children: Child[],
  label?: string
) => ({
  type: "instance",
  id,
  component: "ws:element",
  tag,
  label,
  children,
});

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
    .map(({ rootInstanceId }) => element(rootInstanceId, "body", []));

  return {
    pages: JSON.stringify(pages),
    instances: JSON.stringify([
      ...pageBodies,
      element(dragIds.body, "body", [{ type: "id", value: dragIds.wrapper }]),
      element(
        dragIds.wrapper,
        "main",
        [
          { type: "id", value: dragIds.box },
          { type: "id", value: dragIds.heading },
          { type: "id", value: dragIds.container },
        ],
        "Drag Wrapper"
      ),
      element(dragIds.box, "div", [{ type: "text", value: "Box" }], "Drag Box"),
      element(
        dragIds.heading,
        "h1",
        [{ type: "text", value: "Heading" }],
        "Drag Heading"
      ),
      element(
        dragIds.container,
        "section",
        [{ type: "text", value: "Drop here" }],
        "Drop Container"
      ),
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

export const loadChildIds = async (projectId: string, parentId: string) => {
  const build = await loadDevBuild({ projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    children: Child[];
  }>;
  return instances
    .find(({ id }) => id === parentId)
    ?.children.filter(({ type }) => type === "id")
    .map(({ value }) => value);
};
