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
  css,
} from "@webstudio-is/design-system";
import type { MarketplaceProduct } from "./types";
import { ChevronLeftIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { $activeProductData, insert } from "./utils";
import { computeExpression } from "~/shared/nano-states";
import { $pageRootScope, type VariableValues } from "../pages/page-utils";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import type { Asset, Page, WebstudioData } from "@webstudio-is/sdk";
import { useMemo } from "react";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";

const focusOutline = focusRingStyle();

const imageLoader = createImageLoader({
  imageBaseUrl: env.IMAGE_BASE_URL,
});

const imageContainerStyle = css({
  position: "relative",
  overflow: "hidden",

  aspectRatio: "1.91",
});

const imageStyle = css({
  position: "absolute",
  top: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 100ms",
  "&:hover": {
    transform: "scale(1.1)",
  },
});

const Thumbnail = ({
  asset,
  imageUrl,
}: {
  asset?: Asset;
  imageUrl?: string;
}) => {
  return (
    <div className={imageContainerStyle()}>
      {imageUrl && <img src={imageUrl} className={imageStyle()} />}
      {asset && (
        <Image src={asset.name} loader={imageLoader} className={imageStyle()} />
      )}
    </div>
  );
};

type TemplateData = {
  socialImageAsset?: Asset;
  socialImageUrl?: string;
  title?: string;
  rootInstanceId: string;
};

const Template = ({
  socialImageAsset,
  socialImageUrl,
  title,
  ...listItemProps
}: TemplateData) => {
  return (
    <Flex
      {...listItemProps}
      direction="column"
      css={{
        px: theme.spacing[9],
        py: theme.spacing[5],
        position: "relative",
        overflow: "hidden",
        outline: "none",
        "&:hover": focusOutline,
        "&:focus-visible": focusOutline,
      }}
      gap="1"
    >
      <Thumbnail asset={socialImageAsset} imageUrl={socialImageUrl} />
      {title && <Text truncate>{title}</Text>}
    </Flex>
  );
};

const getTemplatesDataByCategory = (
  data: WebstudioData,
  variableValues: VariableValues
) => {
  const templatesByCategory = new Map<string, Array<TemplateData>>();

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

      const socialImageUrl = page.meta.socialImageUrl
        ? String(computeExpression(page.meta.socialImageUrl, variableValues))
        : undefined;
      const socialImageAsset = page.meta.socialImageAssetId
        ? data.assets.get(page.meta.socialImageAssetId)
        : undefined;

      let title = page.meta.custom?.find(
        ({ property }) => property === "ws:title"
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

  const templatesDataByCategory = useMemo(() => {
    if (activeProductData === undefined) {
      return;
    }
    return getTemplatesDataByCategory(activeProductData, variableValues);
  }, [activeProductData, variableValues]);

  if (
    templatesDataByCategory === undefined ||
    activeProductData === undefined
  ) {
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
        {Array.from(templatesDataByCategory.keys()).map((category) => {
          return (
            <CollapsibleSection label={category} key={category} fullWidth>
              <List asChild>
                <Flex direction="column">
                  {(templatesDataByCategory.get(category) || []).map(
                    (templateProps, index) => {
                      return (
                        <ListItem
                          asChild
                          key={templateProps.rootInstanceId}
                          index={index}
                          onSelect={() => {
                            insert({
                              instanceId: templateProps.rootInstanceId,
                              data: activeProductData,
                            });
                          }}
                        >
                          <Template {...templateProps} />
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
