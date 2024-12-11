import { useEffect, useState, type ComponentProps } from "react";
import {
  Flex,
  TooltipProvider,
  globalCss,
  theme,
} from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { Header } from "./header";
import { Projects } from "./projects";
import type { User } from "~/shared/db/user.server";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import { Resources } from "./resources";
import { useLocation, useRevalidator } from "@remix-run/react";
import { CloneProjectDialog } from "~/shared/clone-project";
import { Toaster } from "@webstudio-is/design-system";

const globalStyles = globalCss({
  body: {
    margin: 0,
    background: theme.colors.brandBackgroundDashboard,
  },
});

const Main = (props: ComponentProps<typeof Flex>) => {
  return (
    <Flex
      {...props}
      as="main"
      direction="column"
      gap="5"
      css={{ padding: theme.spacing[13] }}
    />
  );
};

const Section = (props: ComponentProps<typeof Flex>) => {
  return (
    <Flex
      {...props}
      justify="center"
      as="section"
      css={{ minWidth: theme.spacing[33] }}
    />
  );
};

export type DashboardProps = {
  user: User;
  projects: Array<DashboardProject>;
  projectTemplates: Array<DashboardProject>;
  userPlanFeatures: UserPlanFeatures;
  publisherHost: string;
  projectToClone?: {
    authToken: string;
    id: string;
    title: string;
  };
};

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

export const Dashboard = ({
  user,
  projects,
  projectTemplates,
  userPlanFeatures,
  publisherHost,
  projectToClone,
}: DashboardProps) => {
  globalStyles();

  return (
    <TooltipProvider>
      <Header user={user} userPlanFeatures={userPlanFeatures} />
      <Main>
        <Section>
          <Resources />
        </Section>
        <Section>
          <Projects
            projects={projects}
            projectTemplates={projectTemplates}
            hasProPlan={userPlanFeatures.hasProPlan}
            publisherHost={publisherHost}
          />
        </Section>
      </Main>
      <CloneProject projectToClone={projectToClone} />
      <Toaster />
    </TooltipProvider>
  );
};
