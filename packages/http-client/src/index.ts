import fetch from "isomorphic-fetch";
import type { Project } from "./index.d";

export const loadProject = async ({
  apiUrl,
  projectId,
}: {
  apiUrl: string;
  projectId: string;
}): Promise<Project | string> => {
  try {
    if (apiUrl === undefined) {
      throw new Error("Webstudio API URL is required.");
    }
    const urls = [];
    const gatheredPages: Project = {};

    const baseUrl = new URL(apiUrl);
    const pagesUrl = new URL(`/rest/pages/${projectId}`, baseUrl);
    const listOfPages = await (await fetch(pagesUrl)).json();
    if (listOfPages === undefined || listOfPages.errors) {
      throw new Error(`Project ${projectId} needs to be published first`);
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return "Unknown error";
  }
};
