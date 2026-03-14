import { rawTheme, Flex, theme } from "@webstudio-is/design-system";
import { $authPermit } from "~/shared/nano-states";
import { ViewMode } from "./view-mode";

export default {
  title: "Builder/View Mode",
  component: ViewMode,
};

export const Active = () => {
  $authPermit.set("view");
  return (
    <Flex
      css={{
        height: theme.spacing[15],
        background: rawTheme.colors.backgroundTopbar,
        padding: theme.spacing[5],
      }}
    >
      <ViewMode />
    </Flex>
  );
};
