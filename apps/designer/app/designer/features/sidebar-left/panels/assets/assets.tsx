import { ImageIcon } from "@webstudio-is/icons";
import { ImageManager } from "~/designer/shared/image-manager";
import { TabName } from "../../types";
import { Header } from "../../lib/header";

export const TabContent = ({
  onSetActiveTab,
}: {
  onSetActiveTab: (tabName: TabName) => void;
}) => {
  return (
    <>
      <Header
        title="Assets"
        onClose={() => {
          onSetActiveTab("none");
        }}
      />
      <ImageManager />
    </>
  );
};

export const icon = <ImageIcon />;
