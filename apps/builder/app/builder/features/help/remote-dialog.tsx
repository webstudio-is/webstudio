import { useStore } from "@nanostores/react";
import { $remoteDialog } from "../../shared/nano-states";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogMaximize,
  DialogTitle,
  DialogTitleActions,
  IconButton,
} from "@webstudio-is/design-system";
import { ExternalLinkIcon } from "@webstudio-is/icons";

export const RemoteDialog = () => {
  const options = useStore($remoteDialog);
  if (options === undefined) {
    return;
  }

  return (
    <Dialog
      open
      onOpenChange={() => {
        $remoteDialog.set(undefined);
      }}
      modal={false}
      draggable
      resize="both"
    >
      <DialogContent width={640} height={640}>
        <iframe
          src={options.url}
          style={{
            border: 0,
            height: "100%",
          }}
        ></iframe>
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle
          suffix={
            <DialogTitleActions>
              <IconButton
                onClick={() => {
                  window.open(options.url, "_blank");
                }}
              >
                <ExternalLinkIcon />
              </IconButton>
              <DialogMaximize />
              <DialogClose />
            </DialogTitleActions>
          }
        >
          {options.title}
        </DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
