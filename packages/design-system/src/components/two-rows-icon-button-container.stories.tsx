import { TwoRowsIconButtonContainer } from "./two-rows-icon-button-container";
import { SmallIconButton } from "./small-icon-button";
import { TrashIcon } from "@webstudio-is/icons";

export const TwoRowsSmallIconButtonContainer = () => (
  <TwoRowsIconButtonContainer>
    <SmallIconButton variant="destructive" icon={<TrashIcon />} />
  </TwoRowsIconButtonContainer>
);

TwoRowsSmallIconButtonContainer.storyName =
  "Two Rows Small Icon Button Container";

export default {
  title: "Two Rows Small Icon Button Container",
};
