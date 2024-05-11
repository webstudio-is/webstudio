import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import {
  type WsComponentMeta,
  componentCategories,
} from "@webstudio-is/react-sdk";
import {
  theme,
  Flex,
  ComponentCard,
  ScrollArea,
  List,
  ListItem,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import type { TabContentProps } from "../../types";
import { Header, CloseButton, Root } from "../../shared/panel";
import {
  dragItemAttribute,
  elementToComponentName,
  useDraggable,
} from "./use-draggable";
import { MetaIcon } from "~/builder/shared/meta-icon";
import { $registeredComponentMetas, $selectedPage } from "~/shared/nano-states";
import { getMetaMaps } from "./get-meta-maps";
import { getInstanceLabel } from "~/shared/instance-utils";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const metaByComponentName = useStore($registeredComponentMetas);
  const selectedPage = useStore($selectedPage);

  const documentType = selectedPage?.meta.documentType ?? "html";

  const { metaByCategory, componentNamesByMeta } = useMemo(
    () => getMetaMaps(metaByComponentName),
    [metaByComponentName]
  );
  const { dragCard, handleInsert, draggableContainerRef } = useDraggable({
    publish,
    metaByComponentName,
  });

  return (
    <Root ref={draggableContainerRef}>
      <Header
        title="Components"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <ScrollArea>
        {componentCategories
          .filter((category) => {
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
          })
          .map((category) => (
            <CollapsibleSection label={category} key={category} fullWidth>
              <List asChild>
                <Flex
                  gap="2"
                  wrap="wrap"
                  css={{ px: theme.spacing[9], overflow: "auto" }}
                >
                  {(metaByCategory.get(category) ?? [])
                    .filter((meta: WsComponentMeta) => {
                      if (documentType === "xml" && meta.category === "data") {
                        return (
                          componentNamesByMeta.get(meta) === "ws:collection"
                        );
                      }
                      return true;
                    })
                    .map((meta: WsComponentMeta, index) => {
                      const component = componentNamesByMeta.get(meta);
                      if (component === undefined) {
                        return;
                      }
                      if (
                        isFeatureEnabled("filters") === false &&
                        component === "RemixForm"
                      ) {
                        return;
                      }
                      if (
                        isFeatureEnabled("cms") === false &&
                        component === "ContentEmbed"
                      ) {
                        return;
                      }
                      return (
                        <ListItem
                          asChild
                          index={index}
                          key={component}
                          onSelect={(event) => {
                            const component = elementToComponentName(
                              event.target as HTMLElement,
                              metaByComponentName
                            );
                            if (component) {
                              onSetActiveTab("none");
                              handleInsert(component);
                            }
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
                </Flex>
              </List>
            </CollapsibleSection>
          ))}
      </ScrollArea>
    </Root>
  );
};

export const Icon = PlusIcon;

export const label = "Components";
