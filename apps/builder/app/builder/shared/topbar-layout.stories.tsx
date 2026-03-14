import {
  Button,
  Flex,
  rawTheme,
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
import { TopbarLayout } from "./topbar-layout";

export default {
  title: "Topbar Layout",
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

export const Default = () => (
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
);

export const WithSyncError = () => (
  <TopbarLayout
    menu={<MenuPlaceholder />}
    left={<PagePlaceholder />}
    center={<BreakpointsPlaceholder />}
    right={
      <>
        <SyncErrorIndicator />
        <Button color="gradient">Share</Button>
        <Button color="positive">Publish</Button>
      </>
    }
  />
);

export const WithViewMode = () => (
  <TopbarLayout
    menu={<MenuPlaceholder />}
    left={<PagePlaceholder />}
    center={<BreakpointsPlaceholder />}
    right={
      <>
        <ViewModeIndicator />
        <Button color="gradient">Share</Button>
        <Button color="positive">Publish</Button>
      </>
    }
  />
);

export const WithClone = () => (
  <TopbarLayout
    menu={<MenuPlaceholder />}
    left={<PagePlaceholder />}
    center={<BreakpointsPlaceholder />}
    right={
      <>
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
);

export const AllIndicators = () => (
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
);

export const Empty = () => <TopbarLayout menu={<MenuPlaceholder />} />;
