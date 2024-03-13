import { useMemo, useState } from "react";
import {
  Flex,
  IconButton,
  List,
  ListItem,
  PanelTabs,
  PanelTabsContent,
  PanelTabsList,
  PanelTabsTrigger,
  ScrollArea,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import type { Project } from "@webstudio-is/project";
import { usePress } from "@react-aria/interactions";
import { marketplaceCategories } from "@webstudio-is/project-build";
import { Card } from "./card";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

const getItemsByCategory = (items: Array<MarketplaceOverviewItem> = []) => {
  const itemsByCategory = new Map<
    MarketplaceOverviewItem["category"],
    Array<MarketplaceOverviewItem>
  >();

  for (const item of items) {
    if (marketplaceCategories.has(item.category) === false) {
      throw new Error(`Unknown category: ${item.category}`);
    }
    let categoryItems = itemsByCategory.get(item.category);
    if (categoryItems === undefined) {
      categoryItems = [];
      itemsByCategory.set(item.category, categoryItems);
    }
    categoryItems.push(item);
  }

  return itemsByCategory;
};

const GalleryOverviewItem = ({
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
    <Card
      {...props}
      title={item.name}
      image={
        item.thumbnailAssetName ? { name: item.thumbnailAssetName } : undefined
      }
      state={isOpen ? "selected" : isLoading ? "loading" : undefined}
      suffix={
        <Flex shrink={false} align="center">
          <IconButton {...pressProps} state={isOpen ? "open" : undefined}>
            <EllipsesIcon />
          </IconButton>
        </Flex>
      }
    />
  );
};

export const Overview = ({
  activeProjectId,
  hidden,
  items,
  onSelect,
  openAbout,
  onOpenAbout,
}: {
  hidden?: boolean;
  activeProjectId?: Project["id"];
  items?: Array<MarketplaceOverviewItem>;
  onSelect: (item: MarketplaceOverviewItem) => void;
  openAbout?: Project["id"];
  onOpenAbout: (projectId?: string) => void;
}) => {
  const itemsByCategory = useMemo(() => getItemsByCategory(items), [items]);
  const [selectedCategory, setSelectedCategory] =
    useState<MarketplaceOverviewItem["category"]>("sectionTemplates");

  const categoryItems = itemsByCategory.get(selectedCategory);

  return (
    <PanelTabs
      value={selectedCategory}
      onValueChange={(category) => {
        setSelectedCategory(category as MarketplaceOverviewItem["category"]);
      }}
      asChild
      hidden={hidden}
    >
      <Flex direction="column">
        <PanelTabsList>
          {Array.from(marketplaceCategories.keys()).map((category) => {
            if (
              category === "pageTemplates" &&
              isFeatureEnabled("pageTemplates") === false
            ) {
              return;
            }
            return (
              <PanelTabsTrigger key={category} value={category}>
                {marketplaceCategories.get(category)}
              </PanelTabsTrigger>
            );
          })}
        </PanelTabsList>
        <PanelTabsContent value={selectedCategory} tabIndex={-1}>
          <ScrollArea>
            <List asChild>
              <Flex direction="column">
                {categoryItems?.map((item, index) => {
                  return (
                    <ListItem
                      asChild
                      key={item.projectId}
                      index={index}
                      onSelect={() => {
                        onSelect(item);
                        onOpenAbout(undefined);
                      }}
                    >
                      <GalleryOverviewItem
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
          </ScrollArea>
        </PanelTabsContent>
      </Flex>
    </PanelTabs>
  );
};
