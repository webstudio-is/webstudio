import { Flex, globalCss, theme } from "@webstudio-is/design-system";
import { Header } from "./header";
import { Projects } from "./projects";
import type { User } from "~/shared/db/user.server";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";

const globalStyles = globalCss({
  body: {
    margin: 0,
    background: theme.colors.brandBackgroundDashboard,
  },
});

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
      <main>
        <Flex justify="center" as="section" css={{ minWidth: "min-content" }}>
          <Projects
            projects={projects}
            projectTemplates={projectTemplates}
            hasProPlan={userPlanFeatures.hasProPlan}
          />
        </Flex>
      </main>
    </TooltipProvider>
  );
};
