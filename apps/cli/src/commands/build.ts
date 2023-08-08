import type { Command, ProjectType } from "../args";
import { prebuild } from "../prebuild";
import { scaffoldProjectTemplate } from "../fs-utils";
import { templates } from "../__generated__/templates";

export const build: Command = async (args) => {
  const projectType = args.values.type as ProjectType;
  await scaffoldProjectTemplate(
    projectType,
    templates["defaults"],
    templates[projectType]
  );
  await prebuild();
};
