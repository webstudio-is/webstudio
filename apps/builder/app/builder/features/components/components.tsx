import { useState } from "react";
import { matchSorter } from "match-sorter";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { XIcon } from "@webstudio-is/icons";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  type WsComponentMeta,
  componentCategories,
  collectionComponent,
} from "@webstudio-is/sdk";
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
import {
  $registeredComponentMetas,
  $registeredTemplates,
} from "~/shared/nano-states";
import {
  findClosestInsertable,
  getComponentTemplateData,
  getInstanceLabel,
  insertWebstudioFragmentAt,
} from "~/shared/instance-utils";
import type { Publish } from "~/shared/pubsub";
import { $selectedPage } from "~/shared/awareness";
import { mapGroupBy } from "~/shared/shim";

type Meta = {
  name: string;
  category: string;
  order: undefined | number;
  label: string;
  description: undefined | string;
  icon: string;
};

const $metas = computed(
  [$registeredComponentMetas, $registeredTemplates],
  (componentMetas, templates) => {
    const availableComponents = new Set<string>();
    const metas: Meta[] = [];
    for (const [name, componentMeta] of componentMetas) {
      if (
        isFeatureEnabled("animation") === false &&
        name.endsWith(":AnimateChildren")
      ) {
        continue;
      }

      if (
        isFeatureEnabled("animation") === false &&
        name.endsWith(":AnimateText")
      ) {
        continue;
      }
      // only set available components from component meta
      availableComponents.add(name);
      if (
        isFeatureEnabled("headSlotComponent") === false &&
        name === "HeadSlot"
      ) {
        continue;
      }

      metas.push({
        name,
        category: componentMeta.category ?? "hidden",
        order: componentMeta.order,
        label: getInstanceLabel({ component: name }, componentMeta),
        description: componentMeta.description,
        icon: componentMeta.icon,
      });
    }
    for (const [name, templateMeta] of templates) {
      const componentMeta = componentMetas.get(name);
      metas.push({
        name,
        category: templateMeta.category ?? "hidden",
        order: templateMeta.order,
        label:
          templateMeta.label ??
          componentMeta?.label ??
          getInstanceLabel({ component: name }, templateMeta),
        description: templateMeta.description,
        icon: templateMeta.icon ?? componentMeta?.icon ?? "",
      });
    }
    const metasByCategory = mapGroupBy(metas, (meta) => meta.category);
    for (const meta of metasByCategory.values()) {
      meta.sort((metaA, metaB) => {
        return (
          (metaA.order ?? Number.MAX_SAFE_INTEGER) -
          (metaB.order ?? Number.MAX_SAFE_INTEGER)
        );
      });
    }
    return { metasByCategory, availableComponents };
  }
);

type Groups = Array<{
  category: Exclude<WsComponentMeta["category"], undefined> | "found";
  metas: Array<Meta>;
}>;

const filterAndGroupComponents = ({
  documentType = "html",
  metasByCategory,
  search,
}: {
  documentType?: "html" | "xml";
  metasByCategory: Map<string, Array<Meta>>;
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
    const metas = (metasByCategory.get(category) ?? []).filter((meta) => {
      if (documentType === "xml" && meta.category === "data") {
        return meta.name === collectionComponent;
      }
      return true;
    });

    return { category, metas };
  });

  if (search.length > 0) {
    const metas = groups.map((group) => group.metas).flat();
    const matched = matchSorter(metas, search, {
      keys: ["label"],
    });
    groups = [{ category: "found", metas: matched }];
  }

  groups = groups.filter((group) => group.metas.length > 0);

  return groups;
};

const findComponentIndex = (groups: Groups, selectedComponent?: string) => {
  if (selectedComponent === undefined) {
    return { index: -1, metas: groups[0].metas };
  }

  for (const { metas } of groups) {
    const index = metas.findIndex((meta) => meta.name === selectedComponent);
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
  const selectedPage = useStore($selectedPage);
  const [selectedComponent, setSelectedComponent] = useState<string>();

  const handleInsert = (component: string) => {
    const fragment = getComponentTemplateData(component);
    if (fragment) {
      const insertable = findClosestInsertable(fragment);
      if (insertable) {
        insertWebstudioFragmentAt(fragment, insertable);
      }
    }
    onClose();
  };

  const resetSelectedComponent = () => {
    setSelectedComponent(undefined);
  };

  const getSelectedComponent = () => {
    // When user didn't select a component but they have search input,
    // we want to always have the first component selected, so that user can just hit enter.
    if (selectedComponent === undefined && searchFieldProps.value) {
      return groups[0].metas[0].name;
    }
    return selectedComponent;
  };

  const searchFieldProps = useSearchFieldKeys({
    onChange: resetSelectedComponent,
    onAbort: resetSelectedComponent,
    onMove({ direction }) {
      if (direction === "current") {
        const component = getSelectedComponent();
        if (component !== undefined) {
          handleInsert(component);
        }
        return;
      }

      const { index, metas } = findComponentIndex(groups, selectedComponent);

      const nextIndex = findNextListItemIndex(index, metas.length, direction);
      const nextComponent = metas[nextIndex]?.name;
      if (nextComponent) {
        setSelectedComponent(nextComponent);
      }
    },
  });

  const { metasByCategory, availableComponents } = useStore($metas);

  const { dragCard, draggableContainerRef } = useDraggable({
    publish,
    availableComponents,
  });

  const groups = filterAndGroupComponents({
    documentType: selectedPage?.meta.documentType,
    metasByCategory,
    search: searchFieldProps.value,
  });

  return (
    <>
      <PanelTitle
        suffix={
          <Tooltip content="Close panel" side="bottom">
            <Button
              color="ghost"
              prefix={<XIcon />}
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
                {group.metas.map((meta, index) => (
                  <ListItem
                    asChild
                    state={
                      meta.name === getSelectedComponent()
                        ? "selected"
                        : undefined
                    }
                    index={index}
                    key={meta.name}
                    onSelect={() => handleInsert(meta.name)}
                    onFocus={() => setSelectedComponent(meta.name)}
                  >
                    <ComponentCard
                      {...{ [dragItemAttribute]: meta.name }}
                      label={meta.label}
                      description={meta.description}
                      icon={<MetaIcon size="auto" icon={meta.icon} />}
                    />
                  </ListItem>
                ))}
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
