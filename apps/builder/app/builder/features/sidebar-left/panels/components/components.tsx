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
import { $registeredComponentMetas } from "~/shared/nano-states";
import { getMetaMaps } from "./get-meta-maps";
import { getInstanceLabel } from "~/shared/instance-utils";

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const metaByComponentName = useStore($registeredComponentMetas);
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
                  {(metaByCategory.get(category) ?? []).map(
                    (meta: WsComponentMeta, index) => {
                      const component = componentNamesByMeta.get(meta);
                      if (component === undefined) {
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
                    }
                  )}
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
