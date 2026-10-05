export const maxFormDestinations = 5;
export const emptyFormDestinationMessage =
  "Select at least one Resource destination";

export type FormSubmission = {
  /** Resource data source IDs, stable across renames. */
  destinations: string[];
  /** Selected Resources kept in the editor but omitted from submission. */
  disabledDestinations?: string[];
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
    (submission.disabledDestinations === undefined ||
      (Array.isArray(submission.disabledDestinations) &&
        submission.disabledDestinations.every((id) => typeof id === "string")))
  );
};

export const validateFormSubmission = (submission: FormSubmission) => {
  if (
    submission.disabledDestinations !== undefined &&
    (new Set(submission.disabledDestinations).size !==
      submission.disabledDestinations.length ||
      submission.disabledDestinations.some(
        (id) => submission.destinations.includes(id) === false
      ))
  ) {
    return "Disabled Resource destinations are invalid";
  }
  if (getEnabledFormDestinations(submission).length === 0) {
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

export const getEnabledFormDestinations = (submission: FormSubmission) =>
  submission.destinations.filter(
    (id) => submission.disabledDestinations?.includes(id) !== true
  );
