import { randomUUID } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";
import { serializedPages } from "@webstudio-is/project-migrations/pages";
import type { Instance } from "@webstudio-is/sdk";
import { instance, prop } from "@webstudio-is/sdk/schema";
import { z } from "zod";
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

const seedBuild = (pagesJson: string) => {
  const pages = serializedPages.parse(JSON.parse(pagesJson));
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

export const createDragProject = async (
  context: BrowserContext,
  name: string,
  page?: Page
) => {
  return await createSeededBuilderProject({
    context,
    page,
    email: `drag-${name}@webstudio.test`,
    title: `Drag ${name}`,
    builderToken: `drag-${name}-${randomUUID()}-builder-token`,
    createBuildUpdate: (build) => seedBuild(build.pages),
  });
};

export const loadDragProjectData = async (projectId: string) => {
  const build = await loadDevBuild({ projectId });
  return {
    instances: z.array(instance).parse(JSON.parse(build.instances)),
    props: z.array(prop).parse(JSON.parse(build.props)),
  };
};

export const loadInstances = async (projectId: string) =>
  (await loadDragProjectData(projectId)).instances;

export const getChildIds = (instances: Instance[], parentId: string) =>
  instances
    .find(({ id }) => id === parentId)
    ?.children.filter(({ type }) => type === "id")
    .map(({ value }) => value);

export const loadChildIds = async (projectId: string, parentId: string) =>
  getChildIds(await loadInstances(projectId), parentId);

export const loadPages = async (projectId: string) => {
  const build = await loadDevBuild({ projectId });
  return serializedPages.parse(JSON.parse(build.pages));
};
