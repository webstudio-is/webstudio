export type PanelApi = {
  save: (formData: FormData) => void | false | { dataSourceId: string };
};
