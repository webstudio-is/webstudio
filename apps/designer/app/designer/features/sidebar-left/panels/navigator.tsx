import { type Publish } from "@webstudio-is/react-sdk";
import { ListNestedIcon } from "@webstudio-is/icons";
import { Navigator } from "~/designer/features/navigator";

type TabContentProps = {
  publish: Publish;
};

export const TabContent = ({ publish }: TabContentProps) => {
  return <Navigator publish={publish} />;
};

export const icon = <ListNestedIcon />;
