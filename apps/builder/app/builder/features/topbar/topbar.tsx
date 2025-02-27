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
  Tooltip,
  Kbd,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { $editingPageId, $pages } from "~/shared/nano-states";

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
import { $selectedPage } from "~/shared/awareness";
import { BuilderModeDropDown } from "./builder-mode";

const PagesButton = () => {
  const page = useStore($selectedPage);
  if (page === undefined) {
    return;
  }

  return (
    <Tooltip
      content={
        <Text>
          {"Pages or page settings "}
          <Kbd value={["alt", "click"]} color="moreSubtle" />
        </Text>
      }
    >
      <ToolbarButton
        css={{ paddingInline: theme.panel.paddingInline }}
        aria-label="Toggle Pages"
        onClick={(event) => {
          $editingPageId.set(event.altKey ? page.id : undefined);
          toggleActiveSidebarPanel("pages");
        }}
        tabIndex={0}
      >
        <Text truncate css={{ maxWidth: theme.spacing[24] }}>
          {page.name}
        </Text>
      </ToolbarButton>
    </Tooltip>
  );
};

const topbarContainerStyle = css({
  position: "relative",
  display: "flex",
  background: theme.colors.backgroundTopbar,
  height: theme.spacing[15],
  paddingRight: theme.panel.paddingInline,
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
            <AddressBarPopover />
          </Flex>
          <Flex css={{ minWidth: theme.spacing[23], ...hideOnMobile }}>
            <BreakpointsPopover />
          </Flex>
          <Flex grow></Flex>
          <Flex align="center" justify="center" css={hideOnMobile}>
            <BreakpointsSelectorContainer />
          </Flex>
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

          <BuilderModeDropDown />
          <ShareButton projectId={project.id} hasProPlan={hasProPlan} />
          <PublishButton projectId={project.id} />
          <CloneButton />
        </ToolbarToggleGroup>
      </Toolbar>
      {loading}
    </nav>
  );
};
