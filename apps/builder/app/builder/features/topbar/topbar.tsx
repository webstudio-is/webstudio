import { useStore } from "@nanostores/react";
import {
  theme,
  css,
  Flex,
  Text,
  Toolbar,
  ToolbarSeparator,
  ToolbarToggleGroup,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import type { Publish } from "~/shared/pubsub";
import { selectedPageStore } from "~/shared/nano-states";
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
  publish: Publish;
};

export const Topbar = ({ gridArea, project, publish }: TopbarProps) => {
  const page = useStore(selectedPageStore);
  if (page === undefined) {
    return null;
  }

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
          variant="labelsTitleCase"
          color="contrast"
          css={{ minWidth: theme.spacing[15], maxWidth: "80%" }}
          truncate
        >
          {page.name}
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
        <ShareButton projectId={project.id} />
        <PublishButton project={project} />
      </ToolbarToggleGroup>
    </Toolbar>
  );
};
