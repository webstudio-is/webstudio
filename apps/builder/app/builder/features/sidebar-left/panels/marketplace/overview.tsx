import { useMemo } from "react";
import {
  Flex,
  List,
  ListItem,
  ScrollArea,
  SmallIconButton,
  Text,
  focusRingStyle,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { categories } from "./utils";
import {
  ChevronRightIcon,
  EllipsesIcon,
  SpinnerIcon,
} from "@webstudio-is/icons";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import type { Project } from "@webstudio-is/project";
import { usePress } from "@react-aria/interactions";

const getItemsByCategory = (items: Array<MarketplaceOverviewItem> = []) => {
  const itemsByCategory = new Map<
    MarketplaceOverviewItem["category"],
    Array<MarketplaceOverviewItem>
  >();

  for (const OverviewItem of items) {
    if (
      categories.some(
        (category) => category.category === OverviewItem.category
      ) === false
    ) {
      throw new Error(`Unknown category: ${OverviewItem.category}`);
    }
    let categoryItems = itemsByCategory.get(OverviewItem.category);
    if (categoryItems === undefined) {
      categoryItems = [];
      itemsByCategory.set(OverviewItem.category, categoryItems);
    }
    categoryItems.push(OverviewItem);
  }
  return itemsByCategory;
};

const focusOutline = focusRingStyle();

const imageLoader = createImageLoader({
  imageBaseUrl: env.IMAGE_BASE_URL,
});

const OverviewItem = ({
  item,
  isLoading,
  isOpen,
  onOpenStateChange,
  ...props
}: {
  item: MarketplaceOverviewItem;
  isLoading: boolean;
  isOpen: boolean;
  onOpenStateChange: (isOpen: boolean) => void;
}) => {
  const { pressProps } = usePress({
    onPress() {
      onOpenStateChange(isOpen ? false : true);
    },
  });

  return (
    <Flex
      {...props}
      css={{
        position: "relative",
        height: theme.spacing[13],
        px: theme.spacing[9],
        outline: "none",
        "&:focus-visible": focusOutline,
        "&:hover": focusOutline,
      }}
      align="center"
      justify="between"
    >
      <Flex align="center" gap="2">
        <Image
          src={item.thumbnailAssetName}
          loader={imageLoader}
          width={rawTheme.spacing[11]}
          height={rawTheme.spacing[11]}
          aria-disabled
        />
        <Text variant="labelsSentenceCase" truncate>
          {item.name}
        </Text>
      </Flex>
      <Flex shrink={false} align="center">
        {isLoading ? (
          <SpinnerIcon />
        ) : (
          <SmallIconButton
            icon={isOpen ? <ChevronRightIcon /> : <EllipsesIcon />}
            {...pressProps}
          />
        )}
      </Flex>
    </Flex>
  );
};

export const Overview = ({
  activeProjectId,
  items,
  onSelect,
  openAbout,
  onOpenAbout,
}: {
  activeProjectId?: Project["id"];
  items?: Array<MarketplaceOverviewItem>;
  onSelect: (item: MarketplaceOverviewItem) => void;
  openAbout?: Project["id"];
  onOpenAbout: (projectId?: string) => void;
}) => {
  const itemsByCategory = useMemo(() => getItemsByCategory(items), [items]);

  return (
    <ScrollArea>
      {categories.map(({ category, label }) => {
        const items = itemsByCategory.get(category);
        if (items === undefined || items.length === 0) {
          return;
        }
        return (
          <CollapsibleSection label={label} key={category} fullWidth>
            <List asChild>
              <Flex direction="column">
                {items.map((item, index) => {
                  return (
                    <ListItem
                      asChild
                      key={item.projectId}
                      index={index}
                      onSelect={() => {
                        onSelect(item);
                      }}
                    >
                      <OverviewItem
                        item={item}
                        isLoading={item.projectId === activeProjectId}
                        isOpen={openAbout === item.projectId}
                        onOpenStateChange={(isOpen) => {
                          onOpenAbout(isOpen ? item.projectId : undefined);
                        }}
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
  );
};
