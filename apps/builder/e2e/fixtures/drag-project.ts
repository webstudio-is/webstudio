import type { SerializedPages } from "@webstudio-is/project-migrations/pages";
import type { Instance } from "@webstudio-is/sdk";
import { loadDevBuild } from "../db";
import { createSeededBuilderProject } from "./builder-project";

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

const element = (
  id: string,
  tag: string,
  children: Instance["children"],
  label?: string
): Instance => ({
  type: "instance",
  id,
  component: "ws:element",
  tag,
  label,
  children,
});

const seedBuild = (serializedPages: string) => {
  const pages = JSON.parse(serializedPages) as SerializedPages;
  const home = pages.pages.find(({ id }) => id === pages.homePageId);
  const root = pages.folders.find(({ id }) => id === pages.rootFolderId);
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
  pages.folders.push({
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
  return await createSeededBuilderProject({
    email: `drag-${name}@webstudio.test`,
    title: `Drag ${name}`,
    builderToken: `drag-${name}-builder-token`,
    createBuildUpdate: (build) => seedBuild(build.pages),
  });
};

export const loadInstances = async (projectId: string) => {
  const build = await loadDevBuild({ projectId });
  return JSON.parse(build.instances) as Instance[];
};

export const getChildIds = (instances: Instance[], parentId: string) =>
  instances
    .find(({ id }) => id === parentId)
    ?.children.filter(({ type }) => type === "id")
    .map(({ value }) => value);

export const loadChildIds = async (projectId: string, parentId: string) =>
  getChildIds(await loadInstances(projectId), parentId);

export const loadPages = async (projectId: string) => {
  const build = await loadDevBuild({ projectId });
  return JSON.parse(build.pages) as SerializedPages;
};
