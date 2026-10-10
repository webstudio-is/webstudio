export const maxFormActions = 10;
export const emptyFormActionMessage = "Add at least one action";

export type FormAction = {
  /** Resource data source ID, stable across renames. */
  dataSourceId: string;
  /** Disabled Actions retain their configured position but do not execute. */
  enabled: boolean;
};

/** Actions execute in parallel and report results in their configured order. */
export type FormSubmission = FormAction[];

export const isFormSubmission = (value: unknown): value is FormSubmission =>
  Array.isArray(value) &&
  value.every(
    (action) =>
      typeof action === "object" &&
      action !== null &&
      typeof action.dataSourceId === "string" &&
      typeof action.enabled === "boolean"
  );

export const validateFormSubmission = (actions: FormSubmission) => {
  if (getEnabledFormActions(actions).length === 0) {
    return emptyFormActionMessage;
  }
  if (actions.length > maxFormActions) {
    return `Select no more than ${maxFormActions} Resource actions`;
  }
  if (
    new Set(actions.map((action) => action.dataSourceId)).size !==
    actions.length
  ) {
    return "Select each Resource only once";
  }
};

export const getEnabledFormActions = (actions: FormSubmission) =>
  actions
    .filter((action) => action.enabled)
    .map((action) => action.dataSourceId);
