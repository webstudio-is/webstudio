import { $remoteDialog } from "../../shared/nano-states";
import { RemoteDialog } from "./remote-dialog";

export default {
  title: "Builder/Help/Remote Dialog",
  component: RemoteDialog,
};

$remoteDialog.set({
  title: "Video tutorials",
  url: "https://docs.webstudio.is",
});

export const RemoteDialog = () => <RemoteDialog />;
