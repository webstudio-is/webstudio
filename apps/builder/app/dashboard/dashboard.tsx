import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Flex,
  List,
  ListItem,
  Text,
  TooltipProvider,
  Toaster,
  css,
  globalCss,
  theme,
  PanelBanner,
  Link,
  buttonStyle,
  Separator,
  Grid,
  IconButton,
} from "@webstudio-is/design-system";
import { BodyIcon } from "@webstudio-is/icons";
import {
  NavLink,
  useLocation,
  useNavigate,
  useRevalidator,
} from "@remix-run/react";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { CloneProjectDialog } from "~/shared/clone-project";
import { setSharedStores, $user } from "~/shared/nano-states";
import { $workspaces } from "~/dashboard/workspace";
import { dashboardPath } from "~/shared/router-utils";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { ProfileMenu } from "./profile-menu";
import { Projects } from "./projects/projects";
import { Welcome } from "./welcome/welcome";
import { Header } from "./shared/layout";
import { help, socialLinks } from "~/shared/help";
import { SearchResults } from "./search/search-results";
import type { DashboardData } from "./shared/types";
import { Search } from "./search/search-field";
import { WorkspaceSelector } from "./workspace/workspace-dropdown";
import { isDowngradedForMember } from "./workspace/utils";
import { NotificationPopover } from "~/shared/notifications/notification-popover";
import {
  seedNotifications,
  startSubscription,
  stopSubscription,
  $shouldRevalidateProjects,
} from "~/shared/notifications/subscription";
import { requestNotificationPermission } from "~/shared/notifications/browser-notification";

const globalStyles = globalCss({
  body: {
    margin: 0,
  },
});

const CloneProject = ({
  projectToClone,
}: {
  projectToClone: DashboardData["projectToClone"];
}) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(projectToClone !== undefined);
  const { revalidate } = useRevalidator();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const cloneProjectAuthToken = searchParams.get("projectToCloneAuthToken");
    if (cloneProjectAuthToken === null) {
      return;
    }

    // Use the native history API to remove query parameters without reloading the page data
    const currentState = window.history.state;
    window.history.replaceState(currentState, "", location.pathname);
  }, [location.search, location.pathname]);

  if (projectToClone !== undefined) {
    return (
      <CloneProjectDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        project={{
          id: projectToClone.id,
          title: projectToClone.title,
        }}
        authToken={projectToClone.authToken}
        onCreate={() => {
          revalidate();
        }}
      />
    );
  }
};

const sidebarLinkStyle = css({
  all: "unset",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[5],
  height: theme.spacing[13],
  paddingInline: theme.panel.paddingInline,
  outline: "none",
  "&:focus-visible, &:hover": {
    background: theme.colors.backgroundHover,
  },
  "&[aria-current=page]": {
    background: theme.colors.backgroundItemCurrent,
    color: theme.colors.foregroundMain,
  },
});

const NavigationItems = ({
  items,
}: {
  items: Array<{
    to: string;
    prefix: ReactNode;
    children: string;
    target?: string;
  }>;
}) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const workspaceId = searchParams.get("workspaceId");

  return (
    <List asChild>
      <Box>
        {items.map((item, index) => {
          const to =
            workspaceId && item.target === undefined
              ? `${item.to}?workspaceId=${workspaceId}`
              : item.to;

          return (
            <ListItem asChild index={index} key={index}>
              <NavLink
                to={to}
                end
                target={item.target}
                className={sidebarLinkStyle()}
              >
                {item.prefix}
                <Text variant="labels" color="main">
                  {item.children}
                </Text>
              </NavLink>
            </ListItem>
          );
        })}
      </Box>
    </List>
  );
};

const $data = atom<DashboardData | undefined>();

export const DashboardSetup = ({ data }: { data: DashboardData }) => {
  const revalidator = useRevalidator();
  const revalidateVersion = useStore($shouldRevalidateProjects);
  useEffect(() => {
    $data.set(data);
    setSharedStores(data);
    $workspaces.set(data.workspaces);
    $user.set(data.user);
  }, [data]);
  // Seed notifications from loader data so the indicator renders instantly.
  // Runs on every revalidation to keep loader → store in sync.
  useEffect(() => {
    seedNotifications(data.notifications);
  }, [data.notifications]);
  // Revalidate when the polled project count changes (e.g. a transfer was accepted).
  useEffect(() => {
    if (revalidateVersion > 0) {
      revalidator.revalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateVersion]);
  // Start polling + permission once on mount; stop on unmount.
  useEffect(() => {
    requestNotificationPermission();
    startSubscription();
    return stopSubscription;
  }, []);
  globalStyles();
  return null;
};

const getView = (
  pathname: string,
  hasProjects: boolean,
  isWorkspaceSuspended: boolean
) => {
  if (pathname === dashboardPath("search")) {
    return "search";
  }

  if (hasProjects === false && isWorkspaceSuspended === false) {
    return "welcome";
  }

  return "projects";
};

export const __testing__ = { getView };

export const Dashboard = () => {
  const data = useStore($data);
  const location = useLocation();
  const navigate = useNavigate();

  if (data === undefined) {
    return null;
  }

  const {
    user,
    publisherHost,
    projectToClone,
    projects,
    workspaces,
    currentWorkspaceId,
  } = data;
  const currentWorkspace = workspaces?.find((w) => w.id === currentWorkspaceId);

  // Workspace ID in the URL but not found — it was deleted or the user was removed.
  // Redirect to the default dashboard to avoid a broken state.
  if (currentWorkspaceId !== undefined && currentWorkspace === undefined) {
    navigate(dashboardPath("projects"), { replace: true });
    return null;
  }

  const isWorkspaceSuspended = isDowngradedForMember(currentWorkspace);
  const hasProjects = projects.length > 0;
  const view = getView(location.pathname, hasProjects, isWorkspaceSuspended);

  const showWorkspaceSelector =
    workspaces !== undefined &&
    workspaces.length > 0 &&
    currentWorkspaceId !== undefined;

  const navItems = [
    {
      to: dashboardPath("projects"),
      prefix: <BodyIcon />,
      children: "Projects",
    },
  ];

  return (
    <TooltipProvider>
      <Flex css={{ height: "100vh" }}>
        <Grid
          as="aside"
          css={{
            width: theme.sizes.sidebarWidth,
            borderRight: `1px solid ${theme.colors.borderMain}`,
            position: "sticky",
            top: 0,
            gridTemplateRows: `auto auto auto 1fr`,
          }}
        >
          <Header variant="aside">
            <ProfileMenu user={user} />
            <NotificationPopover
              renderTrigger={(props) => <IconButton color="ghost" {...props} />}
            />
          </Header>
          <Flex
            direction="column"
            gap="3"
            css={{
              paddingInline: theme.spacing[5],
              paddingBottom: theme.spacing[7],
            }}
          >
            <Search />
          </Flex>
          <nav>
            {showWorkspaceSelector ? (
              <>
                <Flex
                  css={{
                    paddingInline: theme.spacing[5],
                  }}
                >
                  <WorkspaceSelector
                    workspaces={workspaces}
                    currentWorkspaceId={currentWorkspaceId}
                    userId={user.id}
                    onDeleted={() => {
                      navigate(dashboardPath("projects"));
                    }}
                  />
                </Flex>
                <NavigationItems items={navItems} />
                <Separator />
              </>
            ) : (
              <CollapsibleSection label="Workspace" fullWidth>
                <NavigationItems items={navItems} />
              </CollapsibleSection>
            )}
          </nav>
          <div>
            <PanelBanner variant="neutral">
              <Text variant="titles">Inception is live</Text>
              <Text color="subtle">
                An AI-powered design tool to explore ideas and instantly
                generate HTML/CSS for Webstudio Builder or any other platform.
              </Text>
              <Link
                className={buttonStyle({
                  color: "gradient",
                })}
                underline="none"
                href="https://wstd.us/inception"
                target="_blank"
                color="contrast"
              >
                Get started with Inception
              </Link>
            </PanelBanner>
          </div>
          <CollapsibleSection label="Help & support" fullWidth>
            <NavigationItems
              items={help.map((item) => ({
                to: item.url,
                target: "_blank",
                prefix: item.icon,
                children: item.label,
              }))}
            />
            <Flex
              align="center"
              gap="2"
              css={{
                paddingInline: theme.panel.paddingInline,
                paddingBlock: theme.spacing[5],
              }}
            >
              <Text variant="labels" color="subtle">
                Follow us:
              </Text>
              {socialLinks.map(({ label, url, icon }) => (
                <Link
                  key={url}
                  href={url}
                  target="_blank"
                  color="subtle"
                  aria-label={label}
                >
                  {icon}
                </Link>
              ))}
            </Flex>
          </CollapsibleSection>
        </Grid>
        {view === "projects" && (
          <Projects
            projects={projects}
            publisherHost={publisherHost}
            projectsTags={user.projectsTags}
            currentWorkspaceId={currentWorkspaceId}
            workspace={currentWorkspace}
            isWorkspaceSuspended={isWorkspaceSuspended}
          />
        )}
        {view === "welcome" && (
          <Welcome currentWorkspaceId={currentWorkspaceId} />
        )}
        {view === "search" && <SearchResults {...data} />}
      </Flex>
      <CloneProject projectToClone={projectToClone} />
      <Toaster />
    </TooltipProvider>
  );
};
