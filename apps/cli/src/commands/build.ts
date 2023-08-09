import type { Command, ProjectTarget } from "../args";
import { prebuild } from "../prebuild";
import { scaffoldProjectTemplate } from "../fs-utils";
import { templates } from "../__generated__/templates";

export const build: Command = async (args) => {
  const projectTarget = args.values.type as ProjectTarget;
  await scaffoldProjectTemplate(
    projectTarget,
    templates["defaults"],
    templates[projectTarget]
  );
  await prebuild();
};
