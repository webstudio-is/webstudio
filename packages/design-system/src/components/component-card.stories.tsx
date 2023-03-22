import { BoxIcon } from "@webstudio-is/icons";
import { StoryGrid } from "./storybook";
import { ComponentCard } from "./component-card";

export default {
  title: "Library/Component Card",
};

export const Demo = () => {
  return (
    <>
      <StoryGrid horizontal>
        <ComponentCard icon={<BoxIcon />} label="Too many words" />
        <ComponentCard icon={<BoxIcon />} label="Single" />
        <ComponentCard icon={<BoxIcon />} label="Truncatedlongword" />
      </StoryGrid>
    </>
  );
};
Demo.storyName = "Component Card";
