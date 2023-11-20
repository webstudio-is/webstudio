export type File = {
  name: string;
  content: string;
  encoding: "utf-8" | "base64";
  merge: boolean;
};

export type Folder = {
  name: string;
  files: File[];
  subFolders: Folder[];
};

export type ProjectTarget = "defaults";

export const SupportedProjects: Record<ProjectTarget, boolean> = {
  defaults: true,
};
