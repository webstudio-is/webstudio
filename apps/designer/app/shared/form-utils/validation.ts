import { toast } from "@webstudio-is/design-system";
import type { ZodError } from "zod";

export type FetcherData<Payload> =
  | ({ ok: true } & Payload)
  | { errors: string | ZodError["formErrors"] };

export const normalizeErrors = (
  errors: string | ZodError["formErrors"]
): ZodError["formErrors"] =>
  typeof errors === "string"
    ? { formErrors: [errors], fieldErrors: {} }
    : errors;

// Show a toast for each of formErrors
// as well as fieldErrors which we cannot display near a corresponding field
export const toastNonFieldErrors = (
  errors: ZodError["formErrors"],
  knownFields?: string[]
) => {
  for (const message of errors.formErrors) {
    toast.error(message);
  }

  if (knownFields !== undefined) {
    for (const fieldName in errors.fieldErrors) {
      if (knownFields.includes(fieldName) === false) {
        for (const message of errors.fieldErrors[fieldName] as string[]) {
          toast.error(`${fieldName}: ${message}`);
        }
      }
    }
  }
};
