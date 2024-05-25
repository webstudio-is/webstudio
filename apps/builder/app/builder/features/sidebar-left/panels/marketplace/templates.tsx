import {
  Button,
  Flex,
  List,
  ListItem,
  ScrollArea,
  Separator,
  theme,
  Link,
} from "@webstudio-is/design-system";
import { ChevronLeftIcon, ExternalLinkIcon } from "@webstudio-is/icons";
import { insert } from "./utils";
import { computeExpression } from "~/shared/nano-states";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import type { Asset, WebstudioData } from "@webstudio-is/sdk";
import { useMemo } from "react";
import { builderUrl } from "~/shared/router-utils";
import { Card } from "./card";

type TemplateData = {
  title?: string;
  thumbnailAsset?: Asset;
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
      rootInstanceId: page.rootInstanceId,
    });
  }
  return templatesByCategory;
};

export const Templates = ({
  name,
  projectId,
  data,
  onOpenChange,
}: {
  name: string;
  projectId: string;
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
        <Link
          underline="none"
          href={builderUrl({
            projectId: projectId,
            origin: location.origin,
          })}
          target="_blank"
          aria-label="Open project in new tab"
        >
          <ExternalLinkIcon />
        </Link>
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
                              insert({
                                instanceId: templateData.rootInstanceId,
                                data,
                              });
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
