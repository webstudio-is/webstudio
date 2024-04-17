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
      for (
        let errorIndex = toastErrorsIndex;
        errorIndex < toastErrors.length;
        errorIndex++
      ) {
        toast.error(toastErrors[errorIndex]);
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
