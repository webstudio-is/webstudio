import { Flex, globalCss, theme } from "@webstudio-is/design-system";
import type {
  DashboardProject,
  User as DbUser,
} from "@webstudio-is/prisma-client";
import { Header } from "./header";
// eslint-disable-next-line import/no-internal-modules
import interFont from "@fontsource/inter/variable.css";
// eslint-disable-next-line import/no-internal-modules
import manropeVariableFont from "@fontsource/manrope/variable.css";
import { Projects } from "./projects";

export const links = () => [
  { rel: "stylesheet", href: interFont },
  { rel: "stylesheet", href: manropeVariableFont },
];

type User = Omit<DbUser, "createdAt"> & {
  createdAt: string;
};

const globalStyles = globalCss({
  body: {
    margin: 0,
    background: theme.colors.brandBackgroundDashboard,
  },
});

type DashboardProps = {
  user: User;
  projects: Array<DashboardProject>;
};

export const Dashboard = ({ user, projects }: DashboardProps) => {
  globalStyles();
  return (
    <>
      <Header user={user} />
      <main>
        <Flex justify="center" as="section" css={{ minWidth: "min-content" }}>
          <Projects projects={projects} />
        </Flex>
      </main>
    </>
  );
};
