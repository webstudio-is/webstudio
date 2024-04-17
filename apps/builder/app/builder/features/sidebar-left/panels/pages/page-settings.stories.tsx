import { $pages } from "~/shared/nano-states/pages";
import { PageSettings } from "./page-settings";

import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { Grid, theme } from "@webstudio-is/design-system";
import { $assets, $project } from "~/shared/nano-states";
import { createDefaultPages } from "@webstudio-is/project-build";
import { isRoot } from "@webstudio-is/sdk";

export default {
  component: PageSettings,
  parameters: {
    lostpixel: {
      // this is to fix cutting off the after scroll area in the screenshot
      waitBeforeScreenshot: 3000,
    },
  },
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

const pages = createDefaultPages({
  rootInstanceId: "root-instance-id",
  systemDataSourceId: "systemDataSourceId",
});
pages.meta = {
  siteName: "Project name",
  faviconAssetId: "imageId",
  code: "code",
};
pages.pages.push({
  id: "pageId",
  title: "Page title",
  path: "/page-path",
  name: "page-name",
  meta: {},
  rootInstanceId: "root-instance-id",
  systemDataSourceId: "systemDataSourceId",
});
const rootFolder = pages.folders.find(isRoot);
rootFolder?.children.push("pageId");

$pages.set(pages);

$project.set({
  id: "projectId",
  title: "Project title",
  createdAt: `${new Date()}`,
  isDeleted: false,
  userId: "userId",
  domain: "new-2x9tcd",
  previewImageAsset: {
    id: "0",
    name: "0",
  },
  marketplaceApprovalStatus: "UNLISTED",
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
