import { StorySection } from "@webstudio-is/design-system";
import { $remoteDialog } from "../../shared/nano-states";
import { RemoteDialog as RemoteDialogComponent } from "./remote-dialog";

export default {
  title: "Builder/Help/Remote Dialog",
  component: RemoteDialogComponent,
};

$remoteDialog.set({
  title: "Video tutorials",
  url: "https://docs.webstudio.is",
});

export const RemoteDialog = () => (
  <StorySection title="Remote Dialog">
    <RemoteDialogComponent />
  </StorySection>
);
