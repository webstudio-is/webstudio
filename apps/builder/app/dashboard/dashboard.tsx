import { Flex, globalCss, theme } from "@webstudio-is/design-system";
import { Header } from "./header";
import { Projects } from "./projects";
import type { User } from "~/shared/db/user.server";
import type { DashboardProject } from "@webstudio-is/dashboard";

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
};

export const Dashboard = ({
  user,
  projects,
  projectTemplates,
}: DashboardProps) => {
  globalStyles();
  return (
    <>
      <Header user={user} />
      <main>
        <Flex justify="center" as="section" css={{ minWidth: "min-content" }}>
          <Projects projects={projects} projectTemplates={projectTemplates} />
        </Flex>
      </main>
    </>
  );
};
