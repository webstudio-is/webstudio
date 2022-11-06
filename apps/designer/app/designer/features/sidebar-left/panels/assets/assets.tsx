import { ImageIcon } from "@webstudio-is/icons";
import { AssetManager } from "./asset-manager";
import { TabName } from "../../types";
import { Header, CloseButton } from "../../lib/header";

export const TabContent = ({
  onSetActiveTab,
}: {
  onSetActiveTab: (tabName: TabName) => void;
}) => {
  return (
    <>
      <Header
        title="Assets"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <AssetManager />
    </>
  );
};

export const icon = <ImageIcon />;
