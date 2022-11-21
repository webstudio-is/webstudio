import fetch from "isomorphic-fetch";
import type { Includes, Project, Page } from "./index.d";

export const loadProject = async ({
  apiUrl,
  projectId,
  include = { tree: true, props: true, breakpoints: true },
}: {
  apiUrl: string;
  projectId: string;
  include?: Includes<boolean>;
}): Promise<Project> => {
  if (apiUrl === undefined) {
    throw new Error("Webstudio API URL is required.");
  }
  const urls = [];
  const gatheredPages: Project = {};
  const baseUrl = new URL(apiUrl);
  // Get all pages
  const pagesUrl = new URL(`/rest/pages/${projectId}`, baseUrl);
  const listOfPages = await (await fetch(pagesUrl)).json();
  if (listOfPages === undefined) {
    throw new Error("Project not found");
  }
  const { pages, homePage } = listOfPages;
  if (homePage) {
    const { id } = homePage;
    const treeUrl = new URL(`/rest/tree/${projectId}/${id}`, baseUrl);
    const propsUrl = new URL(`/rest/props/${projectId}/${id}`, baseUrl);
    const breakpointsUrl = new URL(`/rest/breakpoints/${projectId}`, baseUrl);
    const cssUrl = new URL(`/rest/css/${projectId}/${id}`, baseUrl);
    urls.push({
      page: { ...homePage },
      url: treeUrl,
      path: "/",
      type: "tree",
    });
    urls.push({
      page: { ...homePage },
      url: propsUrl,
      path: "/",
      type: "props",
    });
    urls.push({
      page: { ...homePage },
      url: breakpointsUrl,
      path: "/",
      type: "breakpoints",
    });
    urls.push({
      page: { ...homePage },
      url: cssUrl,
      path: "/",
      type: "css",
    });
  }

  if (pages && pages.length > 0) {
    for (const page of pages) {
      const { id, path } = page;
      const treeUrl = new URL(`/rest/tree/${projectId}/${id}`, baseUrl);
      const propsUrl = new URL(`/rest/props/${projectId}/${id}`, baseUrl);
      const cssUrl = new URL(`/rest/css/${projectId}/${id}`, baseUrl);

      urls.push({
        page,
        url: treeUrl,
        path,
        type: "tree",
      });

      urls.push({
        page,
        url: propsUrl,
        path,
        type: "props",
      });

      urls.push({
        page,
        url: cssUrl,
        path,
        type: "css",
      });
    }
  }

  if (urls.length === 0) {
    throw new Error("No pages to fetch");
  }
  const data = await Promise.all(
    urls.map(async (url) => {
      const res = await fetch(url.url);
      if (res.ok) {
        return {
          page: url.page,
          path: url.path,
          type: url.type,
          data: url.type === "css" ? await res.text() : await res.json(),
        };
      }
    })
  );
  const breakpoints = data.find(
    (d) => d?.type === "breakpoints" && d.path === "/"
  );

  if (Object.keys(data).length > 0) {
    for (const page of data) {
      if (page && page.path && page.type && page.data) {
        const { path, type } = page;
        gatheredPages[path] = {
          ...gatheredPages[path],
          page: page.page,
          [type]: page.data,
          breakpoints: breakpoints?.data || {},
        };
      }
    }
  }
  return {
    ...gatheredPages,
  };
};
