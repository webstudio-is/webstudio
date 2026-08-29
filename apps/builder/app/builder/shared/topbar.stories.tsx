import {
  Button,
  Flex,
  cssVar,
  StorySection,
  theme,
  Text,
  LinkButton,
  IconButton,
} from "@webstudio-is/design-system";
import {
  CloudIcon,
  OfflineIcon,
  ShieldIcon,
  MenuIcon,
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
  <IconButton type="button" size="large" aria-label="Menu">
    <MenuIcon size={22} />
  </IconButton>
);

const PagePlaceholder = () => (
  <Button color="ghost" css={{ paddingInline: theme.panel.paddingInline }}>
    <Text truncate css={{ maxWidth: theme.spacing[24] }}>
      Home
    </Text>
  </Button>
);

const BreakpointsPlaceholder = () => (
  <Flex align="center" gap="1">
    <Button color="ghost">Base</Button>
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
  <IconButton type="button" aria-label="Safe mode active">
    <ShieldIcon stroke={cssVar("--foreground-negative")} />
  </IconButton>
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
