import {
  PanelTitle as PanelTitleComponent,
  TitleSuffixSpacer,
} from "./panel-title";
import { Button } from "./button";
import { XIcon, CopyIcon } from "@webstudio-is/icons";
import { StoryGrid } from "./storybook";

export default {
  title: "Panel Title",
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
