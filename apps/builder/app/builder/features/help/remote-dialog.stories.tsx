import { $remoteDialog } from "../../shared/nano-states";
import { RemoteDialog as RemoteDialogComponent } from "./remote-dialog";

export default {
  title: "Builder/Help/Remote dialog",
  component: RemoteDialogComponent,
};

$remoteDialog.set({
  title: "Video tutorials",
  url: "https://docs.webstudio.is",
});

export const RemoteDialog = () => <RemoteDialogComponent />;
