import { useStore } from "@nanostores/react";
import {
  theme,
  css,
  Flex,
  Text,
  Toolbar,
  ToolbarToggleGroup,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { selectedPageStore } from "~/shared/nano-states";
import { PreviewButton } from "./preview";
import { ShareButton } from "./share";
import { PublishButton } from "./publish";
import { SyncStatus } from "./sync-status";
import { Menu } from "./menu";
import {
  BreakpointsSelectorContainer,
  BreakpointsPopover,
} from "../breakpoints";
import { ViewMode } from "./view-mode";

const topbarContainerStyle = css({
  display: "flex",
  background: theme.colors.backgroundTopbar,
  height: theme.spacing[15],
  boxShadow: `inset 0 -1px 0 0 ${theme.colors.panelOutline}`,
  paddingRight: theme.spacing[9],
  color: theme.colors.foregroundContrastMain,
});

type TopbarProps = {
  gridArea: string;
  project: Project;
  hasProPlan: boolean;
};

export const Topbar = ({ gridArea, project, hasProPlan }: TopbarProps) => {
  const page = useStore(selectedPageStore);

  return (
    <nav className={topbarContainerStyle({ css: { gridArea } })}>
      <Flex grow={false} shrink={false}>
        <Menu />
      </Flex>
      <Flex
        css={{ px: theme.spacing[9], maxWidth: theme.spacing[24] }}
        align="center"
      >
        <Text variant="labelsTitleCase" color="contrast" truncate>
          {page?.name ?? ""}
        </Text>
      </Flex>
      <Flex css={{ minWidth: theme.spacing[23] }}>
        <BreakpointsPopover />
      </Flex>
      <Flex grow align="center" justify="center">
        <BreakpointsSelectorContainer />
      </Flex>
      <Toolbar>
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
          <ShareButton projectId={project.id} hasProPlan={hasProPlan} />
          <PublishButton projectId={project.id} />
        </ToolbarToggleGroup>
      </Toolbar>
    </nav>
  );
};
