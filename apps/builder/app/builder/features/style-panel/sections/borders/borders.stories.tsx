import { styled, theme } from "@webstudio-is/design-system";
import { Section } from "./borders";

const Panel = styled("div", {
  width: theme.spacing[30],
  boxSizing: "border-box",
});

export const Borders = () => {
  return (
    <Panel>
      <Section />
    </Panel>
  );
};

export default {
  title: "Style Panel/Borders",
  component: Section,
};
