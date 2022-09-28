import fetch from "isomorphic-fetch";
import type { Includes, Project } from "./index.d";

const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

export const loadProject = async ({
  projectId,
  host = process.env.DESIGNER_HOST || "localhost:3000",
  include = { tree: true, props: true, breakpoints: true },
}: {
  projectId: string;
  host?: string;
  include?: Includes<boolean>;
}): Promise<Project> => {
  const baseUrl = new URL("/", `${protocol}://${host}`);
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
