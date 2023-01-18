import { useActionData } from "@remix-run/react";
import { Flex, globalCss, theme } from "@webstudio-is/design-system";
import { User as DbUser } from "@webstudio-is/prisma-client";
import { EmptyState } from "./empty-state";
import { Header } from "./header";
import { Panel } from "./panel";

type User = Omit<DbUser, "createdAt"> & {
  createdAt: string;
};

const globalStyles = globalCss({
  body: {
    margin: 0,
    // @todo: use theme
    background: theme.colors.maintenanceLight,
  },
});

type DashboardProps = {
  projects?: Array<{ id: string; title: string }>;
  user: User;
};

export const Dashboard = ({ projects = [], user }: DashboardProps) => {
  globalStyles();
  //const actionData = useActionData();
  return (
    <>
      <Header user={user} />
      <Panel>
        <EmptyState />
      </Panel>
    </>
  );
};
