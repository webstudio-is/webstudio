import { toast } from "@webstudio-is/design-system";
import { $publishDialog } from "../../shared/nano-states";

export const showPublishWarning = ({
  message,
  setWarning,
}: {
  message: JSX.Element;
  setWarning: (warning: JSX.Element) => void;
}) => {
  if ($publishDialog.get() === "none") {
    toast.warn(message);
  }
  setWarning(message);
};
