import { useStore } from "@nanostores/react";
import {
  theme,
  ToolbarButton,
  Text,
  type CSS,
  Tooltip,
  Kbd,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { $pages } from "~/shared/sync/data-stores";
import { $editingPageId } from "~/shared/nano-states";

import { ShareButton } from "~/builder/features/share";
import { PublishButton } from "~/builder/features/publish";
import { SyncStatus } from "~/builder/features/sync-status";
import { Menu } from "~/builder/features/menu";
import { BreakpointsContainer } from "~/builder/features/breakpoints";
import { ViewMode } from "~/builder/features/view-mode";
import { AddressBarPopover } from "~/builder/features/address-bar";
import { toggleActiveSidebarPanel } from "~/builder/shared/nano-states";
import type { ReactNode } from "react";
import { CloneButton } from "~/builder/features/clone";
import { $selectedPage } from "~/shared/nano-states";
import { BuilderModeDropDown } from "~/builder/features/builder-mode";
import { SafeModeButton } from "~/builder/features/safe-mode";
import { NotificationPopover } from "~/shared/notifications/notification-popover";
import { $notifications } from "~/shared/notifications/subscription";
import { TopbarLayout } from "./topbar-layout";

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

type TopbarProps = {
  project: Project;
  loading: ReactNode;
  css: CSS;
};

export const Topbar = ({ project, css, loading }: TopbarProps) => {
  const pages = useStore($pages);
  const notifications = useStore($notifications);
  return (
    <TopbarLayout
      css={css}
      menu={<Menu />}
      left={
        pages ? (
          <>
            <PagesButton />
            <AddressBarPopover />
          </>
        ) : undefined
      }
      center={<BreakpointsContainer />}
      right={
        <>
          {notifications.length > 0 && (
            <NotificationPopover
              renderTrigger={(props) => <ToolbarButton {...props} />}
            />
          )}
          <SafeModeButton />
          <ViewMode />
          <SyncStatus />
          <BuilderModeDropDown />
          <ShareButton projectId={project.id} />
          <PublishButton projectId={project.id} />
          <CloneButton />
        </>
      }
      loading={loading}
    />
  );
};
