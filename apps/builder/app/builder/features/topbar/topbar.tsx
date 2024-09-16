import { useStore } from "@nanostores/react";
import {
  theme,
  css,
  Flex,
  Toolbar,
  ToolbarToggleGroup,
  ToolbarButton,
  Text,
  type CSS,
  Box,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { $pages, $selectedPage } from "~/shared/nano-states";
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
import { AddressBarPopover } from "../address-bar";
import { toggleActiveSidebarPanel } from "~/builder/shared/nano-states";
import type { ReactNode } from "react";
import { CloneButton } from "./clone";

const PagesButton = () => {
  const page = useStore($selectedPage);
  if (page === undefined) {
    return;
  }

  return (
    <ToolbarButton
      css={{
        px: theme.spacing[9],
        maxWidth: theme.spacing[24],
      }}
      aria-label="Toggle Pages"
      onClick={() => {
        toggleActiveSidebarPanel("pages");
      }}
      tabIndex={0}
    >
      <Text truncate>{page.name}</Text>
    </ToolbarButton>
  );
};

const topbarContainerStyle = css({
  position: "relative",
  display: "flex",
  background: theme.colors.backgroundTopbar,
  height: theme.spacing[15],
  boxShadow: `inset 0 -1px 0 0 ${theme.colors.panelOutline}`,
  paddingRight: theme.spacing[9],
  color: theme.colors.foregroundContrastMain,
});

// We are hiding some elements on mobile because we want to let user
// test in preview mode with device simulators
const hideOnMobile: CSS = {
  "@media (max-width: 640px)": {
    display: "none",
  },
};

type TopbarProps = {
  project: Project;
  hasProPlan: boolean;
  loading: ReactNode;
  css: CSS;
};

export const Topbar = ({ project, hasProPlan, css, loading }: TopbarProps) => {
  const pages = useStore($pages);
  return (
    <nav className={topbarContainerStyle({ css })}>
      <Flex grow={false} shrink={false}>
        <Menu />
      </Flex>

      {/* prevent rendering when data is not loaded */}
      {pages && (
        <>
          <Flex align="center">
            <PagesButton />
            <Box css={hideOnMobile}>
              <AddressBarPopover />
            </Box>
          </Flex>
          <Flex grow></Flex>
          <Flex align="center" justify="center" css={hideOnMobile}>
            <BreakpointsSelectorContainer />
          </Flex>
          <BreakpointsPopover />
        </>
      )}
      <Flex grow></Flex>
      <Toolbar>
        <ToolbarToggleGroup
          type="single"
          css={{
            isolation: "isolate",
            justifyContent: "flex-end",
            gap: theme.spacing[5],
            width: theme.spacing[30],
          }}
        >
          <ViewMode />
          <SyncStatus />
          <PreviewButton />
          <Box css={hideOnMobile}>
            <ShareButton projectId={project.id} hasProPlan={hasProPlan} />
          </Box>
          <Box css={hideOnMobile}>
            <PublishButton projectId={project.id} />
          </Box>

          <CloneButton />
        </ToolbarToggleGroup>
      </Toolbar>
      {loading}
    </nav>
  );
};
