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
  Tooltip,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import type { Project } from "@webstudio-is/project";
import { usePress } from "@react-aria/interactions";
import { marketplaceCategories } from "@webstudio-is/project-build";
import { mapGroupBy } from "~/shared/shim";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import { Card } from "./card";

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
  const itemsByCategory = useMemo(
    () => mapGroupBy(items ?? [], (item) => item.category),
    [items]
  );
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
            return (
              <Tooltip
                key={category}
                variant="wrapped"
                content={marketplaceCategories.get(category)?.description}
              >
                <div>
                  <PanelTabsTrigger value={category}>
                    {marketplaceCategories.get(category)?.label}
                  </PanelTabsTrigger>
                </div>
              </Tooltip>
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
