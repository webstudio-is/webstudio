import { toast } from "@webstudio-is/design-system";
import { $syncStatus } from "@webstudio-is/sync-client";

export const requireBuilderReload = ({
  error,
  target = window.top ?? window,
  toastId,
}: {
  error: string;
  target?: Pick<Window, "confirm" | "location">;
  toastId?: string;
}) => {
  if ($syncStatus.get().status === "fatal") {
    return;
  }
  const shouldReload = target.confirm(error);
  if (shouldReload) {
    target.location.reload();
  }

  $syncStatus.set({ status: "fatal", error });
  if (shouldReload === false) {
    toast.error("Synchronization has been paused. Please reload to continue.", {
      id: toastId,
      duration: Number.POSITIVE_INFINITY,
    });
  }
};
