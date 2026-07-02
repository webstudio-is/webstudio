import { projectBuildDocs, type ProjectBuildDocName } from "./docs.generated";

export const readProjectBuildDoc = (name: ProjectBuildDocName) =>
  projectBuildDocs[name];
