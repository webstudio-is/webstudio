import fetch from "isomorphic-fetch";
import type { BaseInstance, UserProp } from "@webstudio-is/react-sdk";
import type { Breakpoint } from "@webstudio-is/css-data";

export type Page = {
  id: string;
  root: [string, string];
};
export type Project = {
  pages: {
    [path: string]: {
      page: Page;
      tree: BaseInstance;
      props: Array<UserProp> | [];
      breakpoints: Array<Breakpoint> | null;
      css: string;
    };
  };
};

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
    const baseUrl = new URL(apiUrl);
    const projectUrl = new URL(`/rest/project/${projectId}`, baseUrl);
    const projectResponse = await fetch(projectUrl);
    const project = await projectResponse.json();
    if (!projectResponse.ok) {
      throw new Error(project);
    }
    return project;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    throw error;
  }
};
