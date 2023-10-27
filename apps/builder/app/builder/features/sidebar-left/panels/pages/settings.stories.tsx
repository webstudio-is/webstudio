import { pagesStore } from "~/shared/nano-states/pages";
import { PageSettings } from "./settings";

import { $isSiteSettigsOpen } from "~/shared/nano-states/seo";
import { Grid, theme } from "@webstudio-is/design-system";
import { projectStore } from "~/shared/nano-states";

export default {
  component: PageSettings,
};

$isSiteSettigsOpen.set(true);

pagesStore.set({
  homePage: {
    id: "homePageId",
    title: "Home page title",
    path: "/home-page-path",
    name: "home-page-name",
    meta: {},
    rootInstanceId: "root-instance-id",
  },
  pages: [
    {
      id: "pageId",
      title: "Page title",
      path: "/page-path",
      name: "page-name",
      meta: {},
      rootInstanceId: "root-instance-id",
    },
  ],
});

projectStore.set({
  id: "projectId",
  title: "Project title",
  createdAt: `${new Date()}`,
  isDeleted: false,
  userId: "userId",
  domain: "new-2x9tcd.wstd.io",
});

export const PageSettingsEdit = () => {
  return (
    <Grid
      css={{
        width: theme.spacing[35],
        margin: "auto",
        border: `1px solid ${theme.colors.borderMain}`,
        boxShadow: theme.shadows.menuDropShadow,
        background: theme.colors.backgroundPanel,
        borderRadius: theme.borderRadius[4],
      }}
    >
      <PageSettings onClose={() => {}} onDelete={() => {}} pageId="pageId" />
    </Grid>
  );
};
