import { pagesStore } from "~/shared/nano-states/pages";
import { PageSettings } from "./settings";

import { $isSiteSettigsOpen } from "~/shared/nano-states/seo";
import { Grid, theme } from "@webstudio-is/design-system";

export default {
  component: PageSettings,
};

$isSiteSettigsOpen.set(true);

pagesStore.set({
  homePage: {
    id: "pageId",
    title: "Page title",
    path: "/page-path",
    name: "page-name",
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
