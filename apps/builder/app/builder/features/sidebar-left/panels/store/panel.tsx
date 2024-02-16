import { PluginIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Store } from "./store";
import { ItemDialog } from "./item-dialog";
import { ItemPanel } from "./item-panel";
import { useStore } from "@nanostores/react";
import { $activeStoreItemId } from "~/shared/nano-states";
import { items } from "./items";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const activeStoreItemId = useStore($activeStoreItemId);
  const item = activeStoreItemId
    ? items.find((item) => item.id === activeStoreItemId)
    : undefined;
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      $activeStoreItemId.set(undefined);
    }
  };

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Store"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      {item?.ui.component === "dialog" && (
        <ItemDialog item={item} onOpenChange={handleOpenChange} />
      )}
      {item?.ui.component === "panel" ? (
        <ItemPanel item={item} onOpenChange={handleOpenChange} />
      ) : (
        <Store />
      )}
    </Flex>
  );
};

export const icon = <PluginIcon />;
