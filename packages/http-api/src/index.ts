import isoMorphicFetch from "isomorphic-fetch";
import type { Includes, Project } from "./index.d";

const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

const fetch = async (url: string, options?: any) => {
  const response = await isoMorphicFetch(url, options);
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  } else {
    return response.text();
  }
};

const loadProjectFromRest = async (
  host: string,
  projectId: string,
  include: Includes<boolean> = { tree: true, props: true, breakpoints: true }
): Promise<Project> => {
  const domain = `${protocol}://${host}`;
  const [tree, props, breakpoints] = await Promise.all([
    include.tree && fetch(`${domain}/rest/tree/${projectId}`),
    include.props && fetch(`${domain}/rest/props/${projectId}`),
    include.breakpoints && fetch(`${domain}/rest/breakpoints/${projectId}`),
  ]);
  return {
    tree,
    props,
    breakpoints,
  };
};

export { loadProjectFromRest };
