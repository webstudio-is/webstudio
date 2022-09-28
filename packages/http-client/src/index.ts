import fetch from "isomorphic-fetch";
import type { Includes, Project } from "./index.d";

export const loadProject = async ({
  webstudioAPIUrl = null,
  projectId,
  include = { tree: true, props: true, breakpoints: true },
}: {
  webstudioAPIUrl: string | null;
  projectId: string;
  include?: Includes<boolean>;
}): Promise<Project> => {
  if (!webstudioAPIUrl) {
    throw new Error("Webstudio API URL is required.");
  }
  const baseUrl = new URL("/", `${webstudioAPIUrl}`);
  const treeUrl = new URL(`/rest/tree/${projectId}`, baseUrl);
  const propsUrl = new URL(`/rest/props/${projectId}`, baseUrl);
  const breakpointsUrl = new URL(`/rest/breakpoints/${projectId}`, baseUrl);

  const [tree, props, breakpoints] = await Promise.all([
    include.tree && (await fetch(treeUrl)).json(),
    include.props && (await fetch(propsUrl)).json(),
    include.breakpoints && (await fetch(breakpointsUrl)).json(),
  ]);
  return {
    tree,
    props,
    breakpoints,
  };
};
