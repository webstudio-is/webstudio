import type { Publish } from "~/shared/pubsub";
import { css, Flex, type CSS } from "@webstudio-is/design-system";
import { PreviewButton } from "./preview";
import { ShareButton } from "./share";
import { PublishButton } from "./publish";
import { SyncStatus } from "./sync-status";
import { Menu } from "./menu";
import { Breakpoints } from "../breakpoints";
import type { Project } from "@webstudio-is/project";
import { theme } from "@webstudio-is/design-system";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

const topbarContainerStyle = css({
  background: theme.colors.backgroundTopbar,
  height: theme.spacing[17],
  boxShadow: `inset 0 -1px 0 0 ${theme.colors.panelOutline}`,
  paddingRight: theme.spacing[9],
});

type TopbarProps = {
  css: CSS;
  project: Project;
  publish: Publish;
};

export const Topbar = ({ css, project, publish }: TopbarProps) => {
  return (
    <Flex
      className={topbarContainerStyle({ css })}
      as="header"
      align="center"
      justify="between"
    >
      <Menu publish={publish} />
      <Breakpoints />
      <Flex align="center" gap="2">
        <SyncStatus />
        <PreviewButton />
        {isFeatureEnabled("share2") && <ShareButton projectId={project.id} />}
        <PublishButton project={project} />
      </Flex>
    </Flex>
  );
};
