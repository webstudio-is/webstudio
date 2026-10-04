export const maxFormDestinations = 5;

export type FormSubmission = {
  /** Resource data source IDs, stable across renames. */
  destinations: string[];
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
    submission.destinations.every((id) => typeof id === "string")
  );
};

export const validateFormSubmission = (submission: FormSubmission) => {
  if (submission.destinations.length === 0) {
    return "Select at least one Resource destination";
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
