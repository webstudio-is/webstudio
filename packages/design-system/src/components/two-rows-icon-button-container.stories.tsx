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
  title: "Two rows small icon button container",
};

export const EmptyContainer = () => <TwoRowsIconButtonContainer />;

export const MultipleChildren = () => (
  <TwoRowsIconButtonContainer>
    <SmallIconButton variant="destructive" icon={<TrashIcon />} />
    <SmallIconButton icon={<TrashIcon />} />
  </TwoRowsIconButtonContainer>
);
