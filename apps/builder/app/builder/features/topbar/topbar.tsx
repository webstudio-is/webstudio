import type { Publish } from "~/shared/pubsub";
import {
  css,
  Flex,
  Text,
  Toolbar,
  ToolbarSeparator,
  ToolbarToggleGroup,
} from "@webstudio-is/design-system";
import type { Page } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import { theme } from "@webstudio-is/design-system";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { PreviewButton } from "./preview";
import { ShareButton } from "./share";
import { PublishButton } from "./publish";
import { SyncStatus } from "./sync-status";
import { Menu } from "./menu";
import { Breakpoints } from "../breakpoints";
import { ViewMode } from "./view-mode";

const topbarContainerStyle = css({
  background: theme.colors.backgroundTopbar,
  height: theme.spacing[15],
  boxShadow: `inset 0 -1px 0 0 ${theme.colors.panelOutline}`,
  paddingRight: theme.spacing[9],
});

type TopbarProps = {
  gridArea: string;
  project: Project;
  page: Page;
  publish: Publish;
};

export const Topbar = ({ gridArea, project, page, publish }: TopbarProps) => {
  return (
    <Toolbar className={topbarContainerStyle({ css: { gridArea } })}>
      <Flex grow={false} shrink={false}>
        <Menu publish={publish} />
        <ToolbarSeparator
          css={{
            // Workaround to prevent separator disappearing during menu animation
            zIndex: 0,
          }}
        />
      </Flex>
      <Flex css={{ width: theme.spacing[30], px: theme.spacing[9] }}>
        <Text
          variant="labelTitleCase"
          color="contrast"
          css={{ maxWidth: theme.spacing[20] }}
          truncate
        >
          {page.title}
        </Text>
      </Flex>
      <Flex grow align="center" justify="center">
        <Breakpoints />
      </Flex>
      <ToolbarToggleGroup
        type="single"
        css={{
          justifyContent: "flex-end",
          gap: theme.spacing[5],
          width: theme.spacing[30],
        }}
      >
        <ViewMode />
        <SyncStatus />
        <PreviewButton />
        {isFeatureEnabled("share2") && <ShareButton projectId={project.id} />}
        <PublishButton project={project} />
      </ToolbarToggleGroup>
    </Toolbar>
  );
};
