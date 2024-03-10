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
  socialImageAsset?: Asset;
  socialImageUrl?: string;
  title?: string;
  rootInstanceId: string;
};

// Special meta properties for the marketplace
const marketplaceMeta = {
  category: "ws:category",
  title: "ws:title",
};

const getTemplatesDataByCategory = (data?: WebstudioData) => {
  const templatesByCategory = new Map<string, Array<TemplateData>>();

  if (data === undefined) {
    return templatesByCategory;
  }

  // In the future we could support bindings in the store as well.
  const variableValues = new Map();
  const pages = [data.pages.homePage, ...data.pages.pages];

  for (const page of pages) {
    let category = page.meta.custom?.find(
      ({ property }) => property === marketplaceMeta.category
    )?.content;

    if (category !== undefined) {
      category = computeExpression(category, variableValues);
    }

    if (category === undefined) {
      category = "Pages";
    }

    let templates = templatesByCategory.get(category);
    if (templates === undefined) {
      templates = [];
      templatesByCategory.set(category, templates);
    }

    const socialImageUrl = page.meta.socialImageUrl
      ? String(computeExpression(page.meta.socialImageUrl, variableValues))
      : undefined;
    const socialImageAsset = page.meta.socialImageAssetId
      ? data.assets.get(page.meta.socialImageAssetId)
      : undefined;

    let title = page.meta.custom?.find(
      ({ property }) => property === marketplaceMeta.title
    )?.content;
    if (title !== undefined) {
      title = computeExpression(title, variableValues);
    }
    if (title === undefined || title === "") {
      title = computeExpression(page.title, variableValues);
    }

    templates.push({
      title,
      socialImageUrl,
      socialImageAsset,
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
                              image={
                                templateData.socialImageAsset ??
                                templateData.socialImageUrl
                              }
                              title={templateData.title}
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
