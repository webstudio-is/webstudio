import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { ProjectSettings } from "./project-settings";

export default {
  component: ProjectSettings,
};

$isProjectSettingsOpen.set(true);

export const ProjectSettingsExample = () => {
  return <ProjectSettings />;
};
