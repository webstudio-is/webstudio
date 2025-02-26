import { useMemo } from "react";
import {
  Button,
  Flex,
  List,
  ListItem,
  ScrollArea,
  Separator,
  theme,
  Link,
  Tooltip,
} from "@webstudio-is/design-system";
import { ChevronLeftIcon, ExternalLinkIcon } from "@webstudio-is/icons";
import {
  ROOT_FOLDER_ID,
  type Asset,
  type Page,
  type WebstudioData,
} from "@webstudio-is/sdk";
import type { MarketplaceProduct } from "@webstudio-is/project-build";
import { mapGroupBy } from "~/shared/shim";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { builderUrl } from "~/shared/router-utils";
import {
  extractWebstudioFragment,
  findClosestInsertable,
  insertWebstudioFragmentAt,
  updateWebstudioData,
} from "~/shared/instance-utils";
import { insertPageCopyMutable } from "~/shared/page-utils";
import { Card } from "./card";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import { selectPage } from "~/shared/awareness";

/**
 * Insert page as a template.
 * - Currently only supports inserting everything from the body
 * - Could be extended to support children of some other instance e.g. Marketplace Item
 */
const insertSection = ({
  data,
  instanceId,
}: {
  data: WebstudioData;
  instanceId: string;
}) => {
  const fragment = extractWebstudioFragment(data, instanceId);
  const body = fragment.instances.find(
    (instance) => instance.component === "Body"
  );
  // remove body and use its children as root insrances
  if (body) {
    fragment.instances = fragment.instances.filter(
      (instance) => instance.component !== "Body"
    );
    fragment.children = body.children;
  }
  const insertable = findClosestInsertable(fragment);
  if (insertable) {
    // numeric position means the instance already
    // insertd after or even into ancestor
    if (insertable.position === "end") {
      insertable.position = "after";
    }
    insertWebstudioFragmentAt(fragment, insertable);
  }
};

const insertPage = ({
  data: sourceData,
  pageId,
}: {
  data: WebstudioData;
  pageId: Page["id"];
}) => {
  let newPageId: undefined | Page["id"];
  updateWebstudioData((targetData) => {
    newPageId = insertPageCopyMutable({
      source: { data: sourceData, pageId },
      target: { data: targetData, folderId: ROOT_FOLDER_ID },
    });
  });
  if (newPageId) {
    selectPage(newPageId);
  }
};

type TemplateData = {
  title?: string;
  thumbnailAsset?: Asset;
  pageId: string;
  rootInstanceId: string;
};

const getTemplatesDataByCategory = (
  data?: WebstudioData
): Map<string, Array<TemplateData>> => {
  if (data === undefined) {
    return new Map();
  }
  const pages = [data.pages.homePage, ...data.pages.pages]
    .filter((page) => page.marketplace?.include)
    .map((page) => {
      // category can be empty string
      const category = page.marketplace?.category || "Pages";
      const thumbnailAsset =
        data.assets.get(page.marketplace?.thumbnailAssetId ?? "") ??
        data.assets.get(page.meta.socialImageAssetId ?? "");
      return {
        category,
        title: page.name,
        thumbnailAsset,
        pageId: page.id,
        rootInstanceId: page.rootInstanceId,
      };
    });
  return mapGroupBy(pages, (page) => page.category);
};

export const Templates = ({
  name,
  projectId,
  productCategory,
  authorizationToken,
  data,
  onOpenChange,
}: {
  name: string;
  projectId: string;
  productCategory: MarketplaceProduct["category"];
  authorizationToken: MarketplaceOverviewItem["authorizationToken"];
  data: WebstudioData;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const templatesDataByCategory = useMemo(
    () => getTemplatesDataByCategory(data),
    [data]
  );

  if (templatesDataByCategory === undefined || data === undefined) {
    return;
  }

  const hasAuthToken = authorizationToken != null;

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Flex
        align="center"
        shrink="false"
        justify="between"
        css={{ padding: theme.panel.padding }}
        gap="3"
      >
        <Button
          prefix={<ChevronLeftIcon />}
          onClick={() => {
            onOpenChange(false);
          }}
          color="neutral"
        >
          {name}
        </Button>
        <Tooltip
          content={
            hasAuthToken
              ? undefined
              : 'The project does not have a shared link with "View" permission.'
          }
        >
          <Link
            underline="none"
            href={
              hasAuthToken
                ? builderUrl({
                    projectId: projectId,
                    origin: location.origin,
                    authToken: authorizationToken,
                  })
                : undefined
            }
            target="_blank"
            aria-label="Open project in new tab"
            aria-disabled={hasAuthToken ? undefined : "true"}
          >
            <ExternalLinkIcon />
          </Link>
        </Tooltip>
      </Flex>
      <Separator />
      <ScrollArea>
        {Array.from(templatesDataByCategory.keys())
          .sort()
          .map((category) => {
            return (
              <CollapsibleSection label={category} key={category} fullWidth>
                <List asChild>
                  <Flex direction="column">
                    {templatesDataByCategory
                      .get(category)
                      ?.map((templateData, index) => {
                        return (
                          <ListItem
                            asChild
                            key={templateData.rootInstanceId}
                            index={index}
                            onSelect={() => {
                              if (productCategory === "sectionTemplates") {
                                insertSection({
                                  data,
                                  instanceId: templateData.rootInstanceId,
                                });
                              }
                              if (
                                productCategory === "pageTemplates" ||
                                productCategory === "integrationTemplates"
                              ) {
                                insertPage({
                                  data,
                                  pageId: templateData.pageId,
                                });
                              }
                            }}
                          >
                            <Card
                              title={templateData.title}
                              image={templateData.thumbnailAsset}
                            />
                          </ListItem>
                        );
                      })}
                  </Flex>
                </List>
              </CollapsibleSection>
            );
          })}
      </ScrollArea>
    </Flex>
  );
};
