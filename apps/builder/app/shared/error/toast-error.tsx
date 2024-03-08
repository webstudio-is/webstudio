import { toast } from "@webstudio-is/design-system";
import { useEffect } from "react";
import { $toastErrors } from "../nano-states";

let toastErrorsIndex = 0;

/**
 * To show errors exposed from the canvas | builder
 */
export const useToastErrors = () => {
  useEffect(() => {
    return $toastErrors.subscribe((toastErrors) => {
      for (let i = toastErrorsIndex; i < toastErrors.length; i++) {
        toast.error(toastErrors[i]);
      }

      toastErrorsIndex = toastErrors.length;
    });
  }, []);
};

export const toastError = (error: string) => {
  $toastErrors.set([
    ...$toastErrors.get(),
    "Copying has been disabled by the project owner",
  ]);
};
