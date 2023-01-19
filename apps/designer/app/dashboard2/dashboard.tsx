import { globalCss } from "@webstudio-is/design-system";
import { User as DbUser } from "@webstudio-is/prisma-client";
import { Header } from "./header";
/* eslint-disable import/no-internal-modules */
import interFont from "@fontsource/inter/index.css";
import manropeVariableFont from "@fontsource/manrope/variable.css";
import { Projects } from "./projects";
/* eslint-enable import/no-internal-modules */

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
    // @todo need a token
    background: "#ababab",
  },
});

type DashboardProps = {
  user: User;
};

export const Dashboard = ({ user }: DashboardProps) => {
  globalStyles();
  return (
    <>
      <Header user={user} />
      <Projects />
    </>
  );
};
