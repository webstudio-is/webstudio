import type { Fetcher } from "@remix-run/react";
import { toast } from "@webstudio-is/design-system";
import { useCallback, useState } from "react";
import type { ZodError } from "zod";
import { useOnFetchEnd } from "~/shared/fetcher";

export type FetcherData<Payload> =
  | ({ status: "ok" } & Payload)
  | { status: "error"; errors: string | ZodError["formErrors"] };

export const normalizeErrors = (
  errors: string | ZodError["formErrors"]
): ZodError["formErrors"] =>
  typeof errors === "string"
    ? { formErrors: [errors], fieldErrors: {} }
    : errors;

export const useFetcherErrors = <FieldName extends string>({
  fetcher,
  fieldNames,
}: {
  fetcher: Fetcher<FetcherData<unknown>>;
  fieldNames?: readonly FieldName[];
}): {
  fieldErrors: ZodError["formErrors"]["fieldErrors"];
  resetFieldError: (fieldName: FieldName) => void;
} => {
  const [fieldErrors, setFieldErrors] = useState<
    ZodError["formErrors"]["fieldErrors"]
  >({});

  useOnFetchEnd(fetcher, (data) => {
    if (data.status === "error") {
      const errors = normalizeErrors(data.errors);
      toastUnknownFieldErrors(errors, fieldNames);
      setFieldErrors(errors.fieldErrors);
    }
  });

  const resetFieldError = useCallback((fieldName: FieldName) => {
    setFieldErrors(({ [fieldName]: _, ...rest }) => rest);
  }, []);

  return { fieldErrors, resetFieldError };
};

// Show a toast for each of formErrors
// as well as fieldErrors which we cannot display near a corresponding field
export const toastUnknownFieldErrors = (
  errors: ZodError["formErrors"],
  knownFields?: readonly string[]
) => {
  for (const message of errors.formErrors) {
    toast.error(message);
  }

  if (knownFields !== undefined) {
    for (const fieldName in errors.fieldErrors) {
      if (knownFields.includes(fieldName) === false) {
        for (const message of errors.fieldErrors[fieldName] ?? []) {
          toast.error(`${fieldName}: ${message}`);
        }
      }
    }
  }
};

export const makeFieldError = <Payload>(
  fieldName: string,
  error: string
): FetcherData<Payload> => {
  return {
    status: "error",
    errors: {
      formErrors: [],
      fieldErrors: { [fieldName]: [error] },
    },
  };
};
