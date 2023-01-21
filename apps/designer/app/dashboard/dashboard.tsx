import { useActionData } from "@remix-run/react";

import { Flex } from "@webstudio-is/design-system";
// eslint-disable-next-line import/no-internal-modules
import interFont from "@fontsource/inter/variable.css";
import dashboardStyles from "./dashboard.css";
import { User as DbUser } from "@webstudio-is/prisma-client";
import { DashboardHeader } from "./components/header";
import { SelectProjectCard } from "./components/card";

export const links = () => {
  return [
    {
      rel: "stylesheet",
      href: interFont,
    },
    {
      rel: "stylesheet",
      href: dashboardStyles,
    },
  ];
};

type User = Omit<DbUser, "createdAt"> & {
  createdAt: string;
};

type DashboardProps = {
  projects?: Array<{ id: string; title: string }>;
  user: User;
};

export const Dashboard = ({ projects = [], user }: DashboardProps) => {
  const actionData = useActionData();
  return (
    <>
      <DashboardHeader user={user} />
      <Flex
        css={{ height: "100vh" }}
        direction="column"
        align="center"
        justify="center"
      >
        <SelectProjectCard projects={projects} errors={actionData?.errors} />
      </Flex>
    </>
  );
};
