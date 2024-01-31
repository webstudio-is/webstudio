import { Flex, globalCss, theme } from "@webstudio-is/design-system";
import { Header } from "./header";
import { Projects } from "./projects";
import type { User } from "~/shared/db/user.server";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import { Resources } from "./resources";
import type { ComponentProps } from "react";

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

type DashboardProps = {
  user: User;
  projects: Array<DashboardProject>;
  projectTemplates: Array<DashboardProject>;
  userPlanFeatures: UserPlanFeatures;
};

export const Dashboard = ({
  user,
  projects,
  projectTemplates,
  userPlanFeatures,
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
          />
        </Section>
      </Main>
    </TooltipProvider>
  );
};
