import { PluginIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Store } from "./store";
import { Dialog } from "./dialog";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Store"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <Store />
      <Dialog />
    </Flex>
  );
};

export const icon = <PluginIcon />;
