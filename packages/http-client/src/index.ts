import fetch from "isomorphic-fetch";
import type { Data } from "@webstudio-is/react-sdk";

export const loadProject = async ({
  apiUrl,
  projectId,
}: {
  apiUrl: string;
  projectId: string;
}): Promise<Array<Data>> => {
  if (apiUrl === undefined) {
    throw new Error("Webstudio API URL is required.");
  }
  const baseUrl = new URL(apiUrl);
  const projectUrl = new URL(`/rest/project/${projectId}`, baseUrl);
  const projectResponse = await fetch(projectUrl);

  if (projectResponse.ok) {
    return await projectResponse.json();
  }

  // In the case where the status code is not 2xx,
  // we don't know what to do with the response other than just show an error message.
  const message = await projectResponse.text();
  throw new Error(message.slice(0, 1000));
};
