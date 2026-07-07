import { TwoRowsIconButtonContainer } from "./two-rows-icon-button-container";
import { SmallIconButton } from "./small-icon-button";
import { TrashIcon } from "@webstudio-is/icons";
import { StorySection } from "./storybook";

export default {
  title: "Two Rows Small Icon Button Container",
};

export const TwoRowsSmallIconButtonContainer = () => (
  <>
    <StorySection title="Single child">
      <TwoRowsIconButtonContainer>
        <SmallIconButton variant="destructive" icon={<TrashIcon />} />
      </TwoRowsIconButtonContainer>
    </StorySection>

    <StorySection title="Empty container">
      <TwoRowsIconButtonContainer />
    </StorySection>

    <StorySection title="Multiple children">
      <TwoRowsIconButtonContainer>
        <SmallIconButton variant="destructive" icon={<TrashIcon />} />
        <SmallIconButton icon={<TrashIcon />} />
      </TwoRowsIconButtonContainer>
    </StorySection>
  </>
);
