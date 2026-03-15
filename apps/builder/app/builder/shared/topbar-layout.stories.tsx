import {
  Button,
  Flex,
  rawTheme,
  StorySection,
  theme,
  ToolbarButton,
  Text,
  buttonStyle,
  Link,
} from "@webstudio-is/design-system";
import {
  CloudIcon,
  OfflineIcon,
  ShieldIcon,
  WebstudioIcon,
} from "@webstudio-is/icons";
import { $queueStatus } from "~/shared/sync/project-queue";
import { $authPermit } from "~/shared/nano-states";
import { SyncStatus } from "~/builder/features/sync-status";
import { ViewMode } from "~/builder/features/view-mode";
import { TopbarLayout } from "./topbar-layout";

export default {
  title: "Topbar layout",
  component: TopbarLayout,
};

const MenuPlaceholder = () => (
  <ToolbarButton aria-label="Menu">
    <WebstudioIcon size={22} />
  </ToolbarButton>
);

const PagePlaceholder = () => (
  <ToolbarButton css={{ paddingInline: theme.panel.paddingInline }}>
    <Text truncate css={{ maxWidth: theme.spacing[24] }}>
      Home
    </Text>
  </ToolbarButton>
);

const BreakpointsPlaceholder = () => (
  <Flex align="center" gap="1">
    <ToolbarButton>Base</ToolbarButton>
  </Flex>
);

const SyncErrorIndicator = () => (
  <Flex
    align="center"
    justify="center"
    css={{ height: theme.spacing["15"] }}
    shrink={false}
  >
    <OfflineIcon color={rawTheme.colors.foregroundDestructive} />
  </Flex>
);

const ViewModeIndicator = () => (
  <Flex
    align="center"
    justify="center"
    css={{ height: theme.spacing["15"] }}
    shrink={false}
  >
    <CloudIcon color={rawTheme.colors.backgroundAlertMain} />
  </Flex>
);

const SafeModeIndicator = () => (
  <ToolbarButton variant="subtle">
    <ShieldIcon stroke={rawTheme.colors.foregroundDestructive} />
  </ToolbarButton>
);

export const TopbarLayouts = () => {
  $queueStatus.set({ status: "failed" });
  $authPermit.set("view");
  return (
    <StorySection title="Topbar Layouts">
      <Flex direction="column" gap="5">
        <Text variant="labels">Default</Text>
        <TopbarLayout
          menu={<MenuPlaceholder />}
          left={<PagePlaceholder />}
          center={<BreakpointsPlaceholder />}
          right={
            <>
              <Button color="gradient">Share</Button>
              <Button color="positive">Publish</Button>
            </>
          }
        />
        <Text variant="labels">With indicators</Text>
        <TopbarLayout
          menu={<MenuPlaceholder />}
          left={<PagePlaceholder />}
          center={<BreakpointsPlaceholder />}
          right={
            <>
              <SafeModeIndicator />
              <ViewModeIndicator />
              <SyncErrorIndicator />
              <Button color="gradient">Share</Button>
              <Button color="positive">Publish</Button>
              <Link
                data-state="auto"
                className={buttonStyle({ color: "positive" })}
                color="contrast"
                href="#"
                underline="none"
              >
                Clone
              </Link>
            </>
          }
        />
        <Text variant="labels">Menu only</Text>
        <TopbarLayout menu={<MenuPlaceholder />} />
        <Text variant="labels">Sync failed</Text>
        <TopbarLayout
          menu={<MenuPlaceholder />}
          left={<PagePlaceholder />}
          center={<BreakpointsPlaceholder />}
          right={
            <>
              <SyncStatus />
              <Button color="gradient">Share</Button>
              <Button color="positive">Publish</Button>
            </>
          }
        />
        <Text variant="labels">View mode</Text>
        <TopbarLayout
          menu={<MenuPlaceholder />}
          left={<PagePlaceholder />}
          center={<BreakpointsPlaceholder />}
          right={
            <>
              <ViewMode />
              <Button color="gradient">Share</Button>
              <Button color="positive">Publish</Button>
            </>
          }
        />
      </Flex>
    </StorySection>
  );
};
