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
import type { DashboardProject } from "@webstudio-is/dashboard";
import { BodyIcon, ExtensionIcon } from "@webstudio-is/icons";
import type { User } from "~/shared/db/user.server";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import { NavLink, useLocation, useRevalidator } from "@remix-run/react";
import { CloneProjectDialog } from "~/shared/clone-project";
import { dashboardPath, templatesPath } from "~/shared/router-utils";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { ProfileMenu } from "./profile-menu";
import { Projects } from "./projects/projects";
import { Templates } from "./templates/templates";
import { Header } from "./shared/layout";
import { help } from "~/shared/help";

const globalStyles = globalCss({
  body: {
    margin: 0,
  },
});

const CloneProject = ({
  projectToClone,
}: {
  projectToClone: DashboardProps["projectToClone"];
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

  return projectToClone !== undefined ? (
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
  ) : undefined;
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
          <ListItem asChild index={index}>
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

type DashboardProps = {
  user: User;
  projects?: Array<DashboardProject>;
  templates?: Array<DashboardProject>;
  welcome: boolean;
  userPlanFeatures: UserPlanFeatures;
  publisherHost: string;
  projectToClone?: {
    authToken: string;
    id: string;
    title: string;
  };
};

export const Dashboard = ({
  user,
  projects,
  templates,
  welcome,
  userPlanFeatures,
  publisherHost,
  projectToClone,
}: DashboardProps) => {
  globalStyles();

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
          <nav>
            <CollapsibleSection label="Workspace" fullWidth>
              <NavigationItems
                items={
                  welcome
                    ? [
                        {
                          to: templatesPath(),
                          prefix: <ExtensionIcon />,
                          children: "Welcome",
                        },
                      ]
                    : [
                        {
                          to: dashboardPath(),
                          prefix: <BodyIcon />,
                          children: "Projects",
                        },
                        {
                          to: templatesPath(),
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
        {projects && (
          <Projects
            projects={projects}
            hasProPlan={userPlanFeatures.hasProPlan}
            publisherHost={publisherHost}
          />
        )}
        {templates && <Templates templates={templates} welcome={welcome} />}
      </Flex>
      <CloneProject projectToClone={projectToClone} />
      <Toaster />
    </TooltipProvider>
  );
};
