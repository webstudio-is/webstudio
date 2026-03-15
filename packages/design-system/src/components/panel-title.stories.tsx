import {
  PanelTitle as PanelTitleComponent,
  TitleSuffixSpacer,
} from "./panel-title";
import { Button } from "./button";
import { XIcon, CopyIcon } from "@webstudio-is/icons";
import { StoryGrid } from "./storybook";
import { Flex } from "./flex";
import { Text } from "./text";

export default {
  title: "Panel title",
};

export const PanelTitle = () => (
  <StoryGrid>
    <PanelTitleComponent>Without buttons</PanelTitleComponent>

    <PanelTitleComponent suffix={<Button prefix={<XIcon />} color="ghost" />}>
      One icon button
    </PanelTitleComponent>

    <PanelTitleComponent
      suffix={
        <>
          <Button prefix={<XIcon />} color="ghost" />
          <Button prefix={<CopyIcon />} color="ghost" />
        </>
      }
    >
      Many icon buttons
    </PanelTitleComponent>

    <PanelTitleComponent
      suffix={
        <>
          <Button prefix={<XIcon />} color="ghost" />
          <Button prefix={<CopyIcon />} color="ghost" />
          <TitleSuffixSpacer />
          <Button>Button</Button>
        </>
      }
    >
      Icon and regular buttons
    </PanelTitleComponent>
  </StoryGrid>
);
PanelTitle.storyName = "Panel Title";

export const LongTitle = () => (
  <StoryGrid>
    <div style={{ width: 240 }}>
      <PanelTitleComponent suffix={<Button prefix={<XIcon />} color="ghost" />}>
        A very long panel title that should be truncated when it overflows
      </PanelTitleComponent>
    </div>
  </StoryGrid>
);

export const CustomChildren = () => (
  <StoryGrid>
    <PanelTitleComponent suffix={<Button prefix={<XIcon />} color="ghost" />}>
      <Flex align="center" gap="1">
        <CopyIcon />
        <Text variant="titles">With icon</Text>
      </Flex>
    </PanelTitleComponent>
  </StoryGrid>
);
