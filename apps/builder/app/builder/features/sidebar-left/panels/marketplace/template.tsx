import {
  Button,
  Flex,
  List,
  ListItem,
  ScrollArea,
  Separator,
  Text,
  theme,
  focusRingStyle,
} from "@webstudio-is/design-system";
import type { MarketplaceProduct } from "./types";
import { ChevronLeftIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { $activeProductData, insert } from "./utils";
import { computeExpression } from "~/shared/nano-states";
import { $pageRootScope, type VariableValues } from "../pages/page-utils";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import type { Page, WebstudioData } from "@webstudio-is/sdk";
import { useMemo } from "react";

const focusOutline = focusRingStyle();

const Template = ({ page, ...listItemProps }: { page: Page }) => {
  // @todo use variables from the template project
  const { variableValues } = useStore($pageRootScope);
  let socialImageUrl;

  if (page.meta.socialImageUrl) {
    socialImageUrl = String(
      computeExpression(page.meta.socialImageUrl, variableValues)
    );
  }

  // @todo render asset
  //const socialImageAsset = page.meta.socialImageAssetId
  //  ? activeProductData.assets.get(page.meta.socialImageAssetId)
  //  : undefined;

  const title = String(computeExpression(page.title, variableValues));
  return (
    <Flex
      {...listItemProps}
      direction="column"
      css={{
        px: theme.spacing[9],
        py: theme.spacing[5],
        position: "relative",
        outline: "none",
        "&:hover": focusOutline,
        "&:focus-visible": focusOutline,
      }}
      gap="1"
    >
      {
        // @todo set width/height/aspectRatio
      }
      <img src={socialImageUrl} />
      <Text truncate>{title}</Text>
    </Flex>
  );
};

const getTemplatesByCategory = (
  data: WebstudioData,
  variableValues: VariableValues
) => {
  const templatesByCategory = new Map<string, Array<Page>>();

  for (const page of data.pages.pages) {
    let category = page.meta.custom?.find(
      ({ property }) => property === "ws:category"
    )?.content;
    if (category !== undefined) {
      category = computeExpression(category, variableValues);
    }
    if (category !== undefined) {
      let templates = templatesByCategory.get(category);
      if (templates === undefined) {
        templates = [];
        templatesByCategory.set(category, templates);
      }
      templates.push(page);
    }
  }
  return templatesByCategory;
};

export const Templates = ({
  product,
  onOpenChange,
}: {
  product: MarketplaceProduct;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const activeProductData = useStore($activeProductData);
  // @todo use variables from the template project
  const { variableValues } = useStore($pageRootScope);

  const templatesByCategory = useMemo(() => {
    if (activeProductData === undefined) {
      return;
    }
    return getTemplatesByCategory(activeProductData, variableValues);
  }, [activeProductData, variableValues]);

  if (templatesByCategory === undefined || activeProductData === undefined) {
    return;
  }

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Flex align="center" css={{ px: theme.spacing[9], py: theme.spacing[5] }}>
        <Button
          prefix={<ChevronLeftIcon />}
          onClick={() => {
            onOpenChange(false);
          }}
          color="neutral"
        >
          {product.label}
        </Button>
      </Flex>
      <Separator />
      <ScrollArea>
        {Array.from(templatesByCategory.keys()).map((category) => {
          return (
            <CollapsibleSection label={category} key={category} fullWidth>
              <List asChild>
                <Flex direction="column">
                  {(templatesByCategory.get(category) || []).map(
                    (page, index) => {
                      return (
                        <ListItem
                          asChild
                          key={page.id}
                          index={index}
                          onSelect={() => {
                            insert({
                              instanceId: page.rootInstanceId,
                              data: activeProductData,
                            });
                          }}
                        >
                          <Template page={page} />
                        </ListItem>
                      );
                    }
                  )}
                </Flex>
              </List>
            </CollapsibleSection>
          );
        })}
      </ScrollArea>
    </Flex>
  );
};
