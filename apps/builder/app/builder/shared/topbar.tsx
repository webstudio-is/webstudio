import { useStore } from "@nanostores/react";
import {
  Box,
  Flex,
  theme,
  ToolbarButton,
  Toolbar,
  ToolbarToggleGroup,
  Text,
  css,
  type CSS,
  Tooltip,
  Kbd,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { isPage, isPageTemplate } from "@webstudio-is/sdk";
import { $pages } from "~/shared/sync/data-stores";
import { $editingPageId, $editingTemplateId } from "~/shared/nano-states";

import { ShareButton } from "~/builder/features/share";
import { PublishButton } from "~/builder/features/publish";
import { SyncStatusDot, SyncStatus } from "~/builder/features/sync-status";
import { Menu } from "~/builder/features/menu";
import { BreakpointsContainer } from "~/builder/features/breakpoints";
import { ViewMode } from "~/builder/features/view-mode";
import { AddressBarPopover } from "~/builder/features/address-bar";
import { toggleActiveSidebarPanel } from "~/builder/shared/nano-states";
import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useDebounce } from "use-debounce";
import { CloneButton } from "~/builder/features/clone";
import { $selectedPage } from "~/shared/nano-states";
import { BuilderModeDropDown } from "~/builder/features/builder-mode";
import { SafeModeButton } from "~/builder/features/safe-mode";
import { NotificationPopover } from "~/shared/notifications/notification-popover";
import { $notifications } from "~/shared/notifications/subscription";

const topbarContainerStyle = css({
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  background: theme.colors.backgroundTopbar,
  height: theme.spacing[15],
  paddingRight: theme.panel.paddingInline,
  color: theme.colors.foregroundContrastMain,
});

type TopbarLayoutProps = Omit<ComponentProps<"nav">, "className"> & {
  menu: ReactNode;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  loading?: ReactNode;
  css?: CSS;
};

export const TopbarLayout = ({
  menu,
  left,
  center,
  right,
  loading,
  css,
  ...navProps
}: TopbarLayoutProps) => (
  <nav {...navProps} className={topbarContainerStyle({ css })}>
    <Flex css={{ flexBasis: "20%" }}>
      <Flex grow={false} shrink={false}>
        {menu}
      </Flex>
      {left && <Flex align="center">{left}</Flex>}
    </Flex>
    <Flex justify="center">{center}</Flex>
    <Toolbar>
      <ToolbarToggleGroup
        type="single"
        css={{
          isolation: "isolate",
          justifyContent: "flex-end",
          gap: theme.spacing[5],
          flexShrink: 0,
        }}
      >
        {right}
      </ToolbarToggleGroup>
    </Toolbar>
    {loading}
  </nav>
);

const floatingLayerSelector = "[data-radix-popper-content-wrapper]";

const TopbarRevealTrigger = ({ onReveal }: { onReveal: () => void }) => (
  <Box
    onPointerEnter={onReveal}
    css={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 5,
      zIndex: 1,
    }}
  />
);

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
          $editingPageId.set(
            event.altKey && isPage(page) ? page.id : undefined
          );
          $editingTemplateId.set(
            event.altKey && isPageTemplate(page) ? page.id : undefined
          );
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
  isUiHidden: boolean;
};

export const Topbar = ({ project, css, loading, isUiHidden }: TopbarProps) => {
  const pages = useStore($pages);
  const notifications = useStore($notifications);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [wantsHidden, setWantsHidden] = useState(false);
  const [debouncedWantsHidden] = useDebounce(wantsHidden, 200);

  useEffect(() => {
    if (isUiHidden === false) {
      setWantsHidden(false);
      setIsPointerInside(false);
      setIsRevealed(false);
    }
  }, [isUiHidden]);

  useEffect(() => {
    if (debouncedWantsHidden && isPointerInside === false) {
      if (document.querySelector(floatingLayerSelector)) {
        setWantsHidden(false);
        return;
      }
      setIsRevealed(false);
      setWantsHidden(false);
    }
  }, [debouncedWantsHidden, isPointerInside]);

  const topbarCss: CSS = isUiHidden
    ? {
        position: "absolute",
        zIndex: 1,
        top: 0,
        left: 0,
        right: 0,
        transform: isRevealed ? "translateY(0)" : "translateY(-100%)",
        visibility: isRevealed ? "visible" : "hidden",
        pointerEvents: isRevealed ? "auto" : "none",
        transition: "transform 200ms ease-out, visibility 0ms linear 200ms",
        ...(isRevealed ? { transition: "transform 200ms ease-out" } : {}),
      }
    : css;
  const pointerHandlers = isUiHidden
    ? {
        onPointerEnter: () => {
          setIsPointerInside(true);
          setWantsHidden(false);
        },
        onPointerLeave: () => {
          setIsPointerInside(false);
          setWantsHidden(true);
        },
      }
    : undefined;

  return (
    <>
      {isUiHidden && isRevealed === false && (
        <TopbarRevealTrigger
          onReveal={() => {
            setWantsHidden(false);
            setIsRevealed(true);
          }}
        />
      )}
      <TopbarLayout
        css={topbarCss}
        {...pointerHandlers}
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
            <SyncStatusDot />
            <SyncStatus />
            <BuilderModeDropDown />
            <ShareButton projectId={project.id} />
            <PublishButton projectId={project.id} />
            <CloneButton />
          </>
        }
        loading={loading}
      />
    </>
  );
};
