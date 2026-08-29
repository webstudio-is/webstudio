import {
  Button,
  Flex,
  cssVar,
  StorySection,
  theme,
  ToolbarButton,
  Text,
  LinkButton,
} from "@webstudio-is/design-system";
import {
  CloudIcon,
  OfflineIcon,
  ShieldIcon,
  WebstudioIcon,
} from "@webstudio-is/icons";
import { $syncStatus } from "@webstudio-is/sync-client";
import { $authPermit } from "~/shared/nano-states";
import { SyncStatus } from "~/builder/features/sync-status";
import { ViewMode } from "~/builder/features/view-mode";
import { TopbarLayout } from "./topbar";

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
    <OfflineIcon color={cssVar("--foreground-negative")} />
  </Flex>
);

const ViewModeIndicator = () => (
  <Flex
    align="center"
    justify="center"
    css={{ height: theme.spacing["15"] }}
    shrink={false}
  >
    <CloudIcon color={cssVar("--foreground-warning")} />
  </Flex>
);

const SafeModeIndicator = () => (
  <ToolbarButton variant="subtle">
    <ShieldIcon stroke={cssVar("--foreground-negative")} />
  </ToolbarButton>
);

export const TopbarLayouts = () => {
  $syncStatus.set({ status: "failed" });
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
              <Button>Share</Button>
              <Button color="primary">Publish</Button>
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
              <Button>Share</Button>
              <Button color="primary">Publish</Button>
              <LinkButton href="#">Clone</LinkButton>
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
              <Button>Share</Button>
              <Button color="primary">Publish</Button>
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
              <Button>Share</Button>
              <Button color="primary">Publish</Button>
            </>
          }
        />
      </Flex>
    </StorySection>
  );
};
