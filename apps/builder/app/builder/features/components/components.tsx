import { useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { CrossIcon } from "@webstudio-is/icons";
import {
  type WsComponentMeta,
  blockComponent,
  collectionComponent,
  componentCategories,
} from "@webstudio-is/react-sdk";
import {
  theme,
  Flex,
  ComponentCard,
  ScrollArea,
  List,
  ListItem,
  SearchField,
  Separator,
  useSearchFieldKeys,
  findNextListItemIndex,
  Text,
  Box,
  Grid,
  PanelTitle,
  Tooltip,
  Button,
} from "@webstudio-is/design-system";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { dragItemAttribute, useDraggable } from "./use-draggable";
import { MetaIcon } from "~/builder/shared/meta-icon";
import { $registeredComponentMetas } from "~/shared/nano-states";
import {
  getMetaMaps,
  type MetaByCategory,
  type ComponentNamesByMeta,
} from "./get-meta-maps";
import {
  findClosestInsertable,
  getComponentTemplateData,
  getInstanceLabel,
  insertTemplateData,
} from "~/shared/instance-utils";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { matchSorter } from "match-sorter";
import { parseComponentName } from "@webstudio-is/sdk";
import type { Publish } from "~/shared/pubsub";
import { $selectedPage } from "~/shared/awareness";

const matchComponents = (
  metas: Array<WsComponentMeta>,
  componentNamesByMeta: ComponentNamesByMeta,
  search: string
) => {
  const getKey = (meta: WsComponentMeta) => {
    if (meta.label) {
      return meta.label.toLowerCase();
    }
    const component = componentNamesByMeta.get(meta);
    if (component) {
      const [_namespace, name] = parseComponentName(component);
      return name.toLowerCase();
    }
    return "";
  };

  return matchSorter(metas, search, {
    keys: [getKey],
  });
};

type Groups = Array<{
  category: Exclude<WsComponentMeta["category"], undefined> | "found";
  metas: Array<WsComponentMeta>;
}>;

const filterAndGroupComponents = ({
  documentType = "html",
  metaByCategory,
  componentNamesByMeta,
  search,
}: {
  documentType?: "html" | "xml";
  metaByCategory: MetaByCategory;
  componentNamesByMeta: ComponentNamesByMeta;
  search: string;
}): Groups => {
  const categories = componentCategories.filter((category) => {
    if (category === "hidden") {
      return false;
    }

    // Only xml category is allowed for xml document type
    if (documentType === "xml") {
      return category === "xml" || category === "data";
    }
    // Hide xml category for non-xml document types
    if (category === "xml") {
      return false;
    }

    if (
      isFeatureEnabled("internalComponents") === false &&
      category === "internal"
    ) {
      return false;
    }

    return true;
  });

  let groups: Groups = categories.map((category) => {
    const metas = (metaByCategory.get(category) ?? []).filter((meta) => {
      const component = componentNamesByMeta.get(meta);

      if (component === undefined) {
        return false;
      }

      if (documentType === "xml" && meta.category === "data") {
        return component === collectionComponent;
      }

      if (component === "RemixForm" && isFeatureEnabled("filters") === false) {
        return false;
      }

      if (component === "ContentEmbed" && isFeatureEnabled("cms") === false) {
        return false;
      }

      if (
        component === blockComponent &&
        isFeatureEnabled("contentEditableMode") === false
      ) {
        return false;
      }

      return true;
    });

    return { category, metas };
  });

  if (search.length !== 0) {
    let metas = groups.map((group) => group.metas).flat();
    metas = matchComponents(metas, componentNamesByMeta, search);
    groups = [{ category: "found", metas }];
  }

  groups = groups.filter((group) => group.metas.length > 0);

  return groups;
};

const findComponentIndex = (
  groups: Groups,
  componentNamesByMeta: ComponentNamesByMeta,
  selectedComponent?: string
) => {
  if (selectedComponent === undefined) {
    return { index: -1, metas: groups[0].metas };
  }

  for (const { metas } of groups) {
    const index = metas.findIndex((meta) => {
      return componentNamesByMeta.get(meta) === selectedComponent;
    });
    if (index === -1) {
      continue;
    }
    return { index, metas };
  }

  return { index: -1, metas: [] };
};

export const ComponentsPanel = ({
  publish,
  onClose,
}: {
  publish: Publish;
  onClose: () => void;
}) => {
  const metaByComponentName = useStore($registeredComponentMetas);
  const selectedPage = useStore($selectedPage);
  const [selectedComponent, setSelectedComponent] = useState<string>();

  const handleInsert = (component: string) => {
    onClose();
    const fragment = getComponentTemplateData(component);
    if (fragment) {
      const insertable = findClosestInsertable(fragment);
      if (insertable) {
        insertTemplateData(fragment, insertable);
      }
    }
  };

  const resetSelectedComponent = () => {
    setSelectedComponent(undefined);
  };

  const getSelectedComponent = () => {
    // When user didn't select a component but they have search input,
    // we want to always have the first component selected, so that user can just hit enter.
    if (selectedComponent === undefined && searchFieldProps.value) {
      return componentNamesByMeta.get(groups[0].metas[0]);
    }
    return selectedComponent;
  };

  const searchFieldProps = useSearchFieldKeys({
    onChange: resetSelectedComponent,
    onCancel: resetSelectedComponent,
    onMove({ direction }) {
      if (direction === "current") {
        const component = getSelectedComponent();
        if (component !== undefined) {
          handleInsert(component);
        }
        return;
      }

      const { index, metas } = findComponentIndex(
        groups,
        componentNamesByMeta,
        selectedComponent
      );

      const nextIndex = findNextListItemIndex(index, metas.length, direction);
      const nextComponent = componentNamesByMeta.get(metas[nextIndex]);

      if (nextComponent) {
        setSelectedComponent(nextComponent);
      }
    },
  });

  const { metaByCategory, componentNamesByMeta } = useMemo(
    () => getMetaMaps(metaByComponentName),
    [metaByComponentName]
  );

  const { dragCard, draggableContainerRef } = useDraggable({
    publish,
    metaByComponentName,
  });

  const groups = filterAndGroupComponents({
    documentType: selectedPage?.meta.documentType,
    metaByCategory,
    componentNamesByMeta,
    search: searchFieldProps.value,
  });

  return (
    <>
      <PanelTitle
        suffix={
          <Tooltip content="Close panel" side="bottom">
            <Button
              color="ghost"
              prefix={<CrossIcon />}
              aria-label="Close panel"
              onClick={onClose}
            />
          </Tooltip>
        }
      >
        Components
      </PanelTitle>
      <Separator />

      <Box css={{ padding: theme.panel.padding }}>
        <SearchField
          {...searchFieldProps}
          autoFocus
          placeholder="Find components"
        />
      </Box>
      <Separator />

      <ScrollArea ref={draggableContainerRef}>
        {groups.map((group) => (
          <CollapsibleSection
            label={group.category}
            key={group.category}
            fullWidth
          >
            <List asChild>
              <Grid
                gap="1"
                columns="3"
                css={{
                  paddingInline: theme.panel.paddingInline,
                  overflow: "auto",
                }}
              >
                {group.metas.map((meta: WsComponentMeta, index) => {
                  const component = componentNamesByMeta.get(meta);

                  if (component === undefined) {
                    return;
                  }

                  return (
                    <ListItem
                      asChild
                      state={
                        component === getSelectedComponent()
                          ? "selected"
                          : undefined
                      }
                      index={index}
                      key={component}
                      onSelect={() => {
                        handleInsert(component);
                      }}
                      onFocus={() => {
                        setSelectedComponent(component);
                      }}
                    >
                      <ComponentCard
                        {...{ [dragItemAttribute]: component }}
                        label={getInstanceLabel({ component }, meta)}
                        description={meta.description}
                        icon={<MetaIcon size="auto" icon={meta.icon} />}
                      />
                    </ListItem>
                  );
                })}
                {dragCard}
                {group.metas.length === 0 && (
                  <Flex grow justify="center" css={{ py: theme.spacing[10] }}>
                    <Text>No matching component</Text>
                  </Flex>
                )}
              </Grid>
            </List>
          </CollapsibleSection>
        ))}
      </ScrollArea>
    </>
  );
};
