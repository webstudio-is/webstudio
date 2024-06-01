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
import { computeExpression } from "~/shared/nano-states";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { builderUrl } from "~/shared/router-utils";
import {
  extractWebstudioFragment,
  findTargetAndInsertFragment,
  updateWebstudioData,
} from "~/shared/instance-utils";
import { insertPageCopyMutable } from "~/shared/page-utils";
import { switchPage } from "~/shared/pages";
import { Card } from "./card";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";

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
  fragment.instances = fragment.instances.filter(
    (instance) => instance.component !== "Body"
  );
  findTargetAndInsertFragment(fragment);
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
    switchPage(newPageId);
  }
};

type TemplateData = {
  title?: string;
  thumbnailAsset?: Asset;
  pageId: string;
  rootInstanceId: string;
};

const getTemplatesDataByCategory = (data?: WebstudioData) => {
  const templatesByCategory = new Map<string, Array<TemplateData>>();

  if (data === undefined) {
    return templatesByCategory;
  }

  const pages = [data.pages.homePage, ...data.pages.pages];

  for (const page of pages) {
    // @todo remove after all stores are migrated
    const excludePageFromSearch =
      computeExpression(
        page.meta.excludePageFromSearch || "false",
        new Map()
      ) ?? true;
    const include =
      page.marketplace?.include ?? false === excludePageFromSearch ?? false;
    // We allow user to hide the page in the marketplace.
    if (false === include) {
      continue;
    }

    const categoryMeta = page.meta.custom?.find(
      ({ property }) => property === "ws:category"
    );
    // @todo remove after all stores are migrated
    const categoryFallback = String(
      computeExpression(categoryMeta?.content ?? `""`, new Map())
    );
    const category = page.marketplace?.category ?? categoryFallback ?? "Pages";

    let templates = templatesByCategory.get(category);
    if (templates === undefined) {
      templates = [];
      templatesByCategory.set(category, templates);
    }

    const socialImageAsset = page.meta.socialImageAssetId
      ? data.assets.get(page.meta.socialImageAssetId)
      : undefined;
    const thumbnailImageAsset = page.marketplace?.thumbnailAssetId
      ? data.assets.get(page.marketplace.thumbnailAssetId)
      : undefined;

    templates.push({
      title: page.name,
      thumbnailAsset: thumbnailImageAsset ?? socialImageAsset,
      pageId: page.id,
      rootInstanceId: page.rootInstanceId,
    });
  }
  return templatesByCategory;
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
        css={{ px: theme.spacing[9], py: theme.spacing[5] }}
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
                              if (productCategory === "pageTemplates") {
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
