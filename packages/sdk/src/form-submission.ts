export const maxFormDestinations = 5;
export const emptyFormDestinationMessage =
  "Select at least one Resource destination";

export type FormSubmission = {
  /** Resource data source IDs, stable across renames. */
  destinations: string[];
  /** An empty field disables the optional visitor acknowledgement. */
  confirmationEmailField?: string;
};

export const isFormSubmission = (value: unknown): value is FormSubmission => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const submission = value as Partial<FormSubmission> & {
    mode?: unknown;
  };
  return (
    submission.mode !== "native" &&
    (submission.mode === undefined || submission.mode === "resources") &&
    Array.isArray(submission.destinations) &&
    submission.destinations.every((id) => typeof id === "string") &&
    (submission.confirmationEmailField === undefined ||
      typeof submission.confirmationEmailField === "string")
  );
};

export const validateFormSubmission = (submission: FormSubmission) => {
  if (
    submission.confirmationEmailField !== undefined &&
    submission.confirmationEmailField !== "" &&
    (submission.confirmationEmailField.trim() !==
      submission.confirmationEmailField ||
      submission.confirmationEmailField.length > 256)
  ) {
    return "Select a valid email field for visitor confirmation";
  }
  if (submission.destinations.length === 0) {
    return emptyFormDestinationMessage;
  }
  if (submission.destinations.length > maxFormDestinations) {
    return `Select no more than ${maxFormDestinations} Resource destinations`;
  }
  if (
    new Set(submission.destinations).size !== submission.destinations.length
  ) {
    return "Select each Resource only once";
  }
};
