export const maxFormActions = 10;
export const resourceFormActionUrl = "?__webstudio__=resources";
export const navigationFormActionUrl = "?__webstudio__=navigate";

export type FormAction = {
  /** Resource data source ID, stable across renames. */
  dataSourceId: string;
};

/** Actions execute in parallel and report results in their configured order. */
export type FormSubmission = FormAction[];

export const isFormSubmission = (value: unknown): value is FormSubmission =>
  Array.isArray(value) &&
  value.every(
    (action) =>
      typeof action === "object" &&
      action !== null &&
      typeof action.dataSourceId === "string"
  );

export const validateFormSubmission = (actions: FormSubmission) => {
  if (actions.length === 0) {
    return "Select at least one Resource action";
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

export const getFormActions = (actions: FormSubmission) =>
  actions.map((action) => action.dataSourceId);
