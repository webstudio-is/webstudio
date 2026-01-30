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
import { $pages } from "~/shared/sync/data-stores";
import { $editingPageId } from "~/shared/nano-states";

import { ShareButton } from "./share";
import { PublishButton } from "./publish";
import { SyncStatus } from "./sync-status";
import { Menu } from "./menu";
import { BreakpointsContainer } from "../breakpoints";
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
  justifyContent: "space-between",
  background: theme.colors.backgroundTopbar,
  height: theme.spacing[15],
  paddingRight: theme.panel.paddingInline,
  color: theme.colors.foregroundContrastMain,
});

type TopbarProps = {
  project: Project;
  loading: ReactNode;
  css: CSS;
};

export const Topbar = ({ project, css, loading }: TopbarProps) => {
  const pages = useStore($pages);
  return (
    <nav className={topbarContainerStyle({ css })}>
      <Flex css={{ flexBasis: "20%" }}>
        <Flex grow={false} shrink={false}>
          <Menu />
        </Flex>

        {/* prevent rendering when data is not loaded */}
        {pages && (
          <Flex align="center">
            <PagesButton />
            <AddressBarPopover />
          </Flex>
        )}
      </Flex>
      <Flex css={{ flexBasis: "60%" }} justify="center">
        <BreakpointsContainer />
      </Flex>
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
          <ShareButton projectId={project.id} />
          <PublishButton projectId={project.id} />
          <CloneButton />
        </ToolbarToggleGroup>
      </Toolbar>
      {loading}
    </nav>
  );
};
