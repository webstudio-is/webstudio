import { PluginIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Store } from "./store";
import { ItemDialog } from "./item-dialog";
import { ItemPanel } from "./item-panel";
import { useActiveItem } from "./utils";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeItem, setActiveItem] = useActiveItem();
  const component = activeItem?.ui?.component ?? "panel";

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      setActiveItem(undefined);
    }
  };

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Store"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      {component === "dialog" && activeItem && (
        <ItemDialog item={activeItem} onOpenChange={handleOpenChange} />
      )}
      {component === "panel" && activeItem ? (
        <ItemPanel item={activeItem} onOpenChange={handleOpenChange} />
      ) : (
        <Store />
      )}
    </Flex>
  );
};

export const icon = <PluginIcon />;
