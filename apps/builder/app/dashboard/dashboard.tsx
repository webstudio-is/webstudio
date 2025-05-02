import { useEffect, useState, type ReactNode } from "react";
import {
  Flex,
  List,
  ListItem,
  Text,
  TooltipProvider,
  Toaster,
  css,
  globalCss,
  theme,
} from "@webstudio-is/design-system";
import { BodyIcon, ExtensionIcon } from "@webstudio-is/icons";
import { NavLink, useLocation, useRevalidator } from "@remix-run/react";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { CloneProjectDialog } from "~/shared/clone-project";
import { dashboardPath } from "~/shared/router-utils";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { ProfileMenu } from "./profile-menu";
import { Projects } from "./projects/projects";
import { Templates } from "./templates/templates";
import { Header } from "./shared/layout";
import { help } from "~/shared/help";
import { SearchResults } from "./search/search-results";
import type { DashboardData } from "./shared/types";
import { Search } from "./search/search-field";

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
  return (
    <List style={{ padding: 0, margin: 0 }}>
      {items.map((item, index) => {
        return (
          <ListItem asChild index={index} key={index}>
            <NavLink
              to={item.to}
              end
              target={item.target}
              className={sidebarLinkStyle()}
            >
              {item.prefix}
              <Text variant="labelsSentenceCase" color="main">
                {item.children}
              </Text>
            </NavLink>
          </ListItem>
        );
      })}
    </List>
  );
};

const $data = atom<DashboardData | undefined>();

export const DashboardSetup = ({ data }: { data: DashboardData }) => {
  $data.set(data);
  globalStyles();
  return undefined;
};

const getView = (pathname: string, hasProjects: boolean) => {
  if (pathname === dashboardPath("search")) {
    return "search";
  }

  if (hasProjects === false) {
    return "welcome";
  }

  if (pathname === dashboardPath("templates")) {
    return "templates";
  }
  return "projects";
};

export const Dashboard = () => {
  const data = useStore($data);
  const location = useLocation();

  if (data === undefined) {
    return;
  }

  const {
    user,
    userPlanFeatures,
    publisherHost,
    projectToClone,
    projects,
    templates,
  } = data;
  const hasProjects = projects.length > 0;
  const view = getView(location.pathname, hasProjects);

  return (
    <TooltipProvider>
      <Flex css={{ height: "100vh" }}>
        <Flex
          as="aside"
          align="stretch"
          direction="column"
          css={{
            width: theme.sizes.sidebarWidth,
            borderRight: `1px solid ${theme.colors.borderMain}`,
            position: "sticky",
            top: 0,
          }}
        >
          <Header variant="aside">
            <ProfileMenu user={user} userPlanFeatures={userPlanFeatures} />
          </Header>
          <Flex
            direction="column"
            gap="3"
            css={{
              paddingInline: theme.spacing[7],
              paddingBottom: theme.spacing[7],
            }}
          >
            <Search />
          </Flex>
          <nav>
            <CollapsibleSection label="Workspace" fullWidth>
              <NavigationItems
                items={
                  view === "welcome" || hasProjects === false
                    ? [
                        {
                          to: dashboardPath(),
                          prefix: <ExtensionIcon />,
                          children: "Welcome",
                        },
                      ]
                    : [
                        {
                          to: dashboardPath("projects"),
                          prefix: <BodyIcon />,
                          children: "Projects",
                        },
                        {
                          to: dashboardPath("templates"),
                          prefix: <ExtensionIcon />,
                          children: "Starter templates",
                        },
                      ]
                }
              />
            </CollapsibleSection>
            <CollapsibleSection label="Help & support" fullWidth>
              <NavigationItems
                items={help.map((item) => ({
                  to: item.url,
                  target: "_blank",
                  prefix: item.icon,
                  children: item.label,
                }))}
              />
            </CollapsibleSection>
          </nav>
        </Flex>
        {view === "projects" && (
          <Projects
            projects={projects}
            hasProPlan={userPlanFeatures.hasProPlan}
            publisherHost={publisherHost}
          />
        )}
        {view === "templates" && <Templates projects={templates} />}
        {view === "welcome" && <Templates projects={templates} welcome />}
        {view === "search" && <SearchResults {...data} />}
      </Flex>
      <CloneProject projectToClone={projectToClone} />
      <Toaster />
    </TooltipProvider>
  );
};
