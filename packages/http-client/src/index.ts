import fetch from "isomorphic-fetch";
import type { Includes, Project } from "./index.d";

export const loadProject = async ({
  apiUrl,
  projectId,
  include = { tree: true, props: true, breakpoints: true, pages: false },
}: {
  apiUrl: string;
  projectId: string;
  include?: Includes<boolean>;
}): Promise<Project> => {
  if (apiUrl === undefined) {
    throw new Error("Webstudio API URL is required.");
  }
  const urls = [];
  const pages: Record<string, unknown> | null = {};

  const baseUrl = new URL(apiUrl);
  const treeUrl = new URL(`/rest/tree/${projectId}`, baseUrl);
  const propsUrl = new URL(`/rest/props/${projectId}`, baseUrl);
  const breakpointsUrl = new URL(`/rest/breakpoints/${projectId}`, baseUrl);
  const pagesUrl = new URL(`/rest/pages/${projectId}`, baseUrl);

  const [tree, props, breakpoints, listOfPages] = await Promise.all([
    include.tree && (await fetch(treeUrl)).json(),
    include.props && (await fetch(propsUrl)).json(),
    include.breakpoints && (await fetch(breakpointsUrl)).json(),
    include.pages && (await fetch(pagesUrl)).json(),
  ]);

  if (include.pages && listOfPages.pages && listOfPages.pages.length > 0) {
    for (const page of listOfPages.pages) {
      urls.push({
        url: new URL(`/rest/tree/${projectId}/${page.id}`, baseUrl),
        path: page.path,
        type: "tree",
      });
      urls.push({
        url: new URL(`/rest/props/${projectId}/${page.id}`, baseUrl),
        path: page.path,
        type: "props",
      });
    }
    if (urls.length === 0) {
      return {
        tree,
        props,
        breakpoints,
        pages,
      };
    }

    const pagesData = await Promise.all([
      ...urls.map(async (url) => {
        const res = await fetch(url.url);
        if (res.ok) {
          return { path: url.path, type: url.type, data: await res.json() };
        }
      }),
    ]);
    if (Object.keys(pagesData).length > 0) {
      for (const page of pagesData) {
        if (page && page.path && page.type && page.data) {
          pages[page.path] = {
            ...(pages[page.path] as Record<string, unknown>),
            [page.type]: page.data,
            breakpoints,
          };
        }
      }
    }
  }
  return {
    tree,
    props,
    breakpoints,
    pages: Object.keys(pages).length > 0 ? pages : null,
  };
};
