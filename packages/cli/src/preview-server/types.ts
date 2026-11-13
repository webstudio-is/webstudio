import type { ChildProcess } from "node:child_process";
import type { ProjectPreviewMode } from "@webstudio-is/project-build/preview";

export type PreviewMode = ProjectPreviewMode;

export type PreviewServerOptions = {
  host: string;
  port: number;
  mode?: PreviewMode;
  cwd?: string;
  imageDomains?: string[];
};

export type PreviewServerResult = {
  url: string;
  process: ChildProcess;
};
