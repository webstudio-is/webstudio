import { $pages } from "~/shared/nano-states/pages";
import { PageSettings } from "./settings";

import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { Grid, theme } from "@webstudio-is/design-system";
import { $assets, $project } from "~/shared/nano-states";

export default {
  component: PageSettings,
};

$isProjectSettingsOpen.set(true);

$assets.set(
  new Map([
    [
      "imageId",
      {
        id: "imageId",
        type: "image",
        name: "very-very-very-long-long-image-name.jpg",
        format: "jpg",
        size: 100,
        meta: {
          width: 2 * 191,
          height: 2 * 100,
        },
        projectId: "projectId",
        createdAt: `${new Date()}`,
        description: "image-description",
      },
    ],
  ])
);

$pages.set({
  meta: {
    siteName: "Project name",
    faviconAssetId: "imageId",
    code: "code",
  },
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

$project.set({
  id: "projectId",
  title: "Project title",
  createdAt: `${new Date()}`,
  isDeleted: false,
  userId: "userId",
  domain: "new-2x9tcd",
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
      <PageSettings
        onClose={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
        pageId="pageId"
      />
    </Grid>
  );
};
