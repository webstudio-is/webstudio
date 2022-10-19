import { ImageIcon } from "@webstudio-is/icons";
import { ImageManager } from "~/designer/shared/image-manager";
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
      <ImageManager />
    </>
  );
};

export const icon = <ImageIcon />;
