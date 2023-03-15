import { Title, TitleSuffixSpacer } from "./title";
import { Button } from "./button";
import { CrossIcon, CopyIcon } from "@webstudio-is/icons";
import { StoryGrid } from "./storybook";

export default {
  title: "Library/Title/Of Panel",
};

export const Demo = () => (
  <StoryGrid>
    <Title>Without buttons</Title>

    <Title suffix={<Button prefix={<CrossIcon />} color="ghost" />}>
      One icon button
    </Title>

    <Title
      suffix={
        <>
          <Button prefix={<CrossIcon />} color="ghost" />
          <Button prefix={<CopyIcon />} color="ghost" />
        </>
      }
    >
      Many icon buttons
    </Title>

    <Title
      suffix={
        <>
          <Button prefix={<CrossIcon />} color="ghost" />
          <Button prefix={<CopyIcon />} color="ghost" />
          <TitleSuffixSpacer />
          <Button>Button</Button>
        </>
      }
    >
      Icon and regular buttons
    </Title>
  </StoryGrid>
);

Demo.storyName = "Of Panel";
