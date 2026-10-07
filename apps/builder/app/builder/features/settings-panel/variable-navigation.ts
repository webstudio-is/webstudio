import { atom } from "nanostores";
import { $dataSources } from "~/shared/sync/data-stores";
import { showInstance } from "~/builder/features/command-panel/shared/instance-list";

export const $highlightedVariable = atom<{ id: string } | undefined>();

export const showVariable = (id: string) => {
  const variable = $dataSources.get().get(id);
  if (!variable?.scopeInstanceId) {
    return;
  }
  showInstance(variable.scopeInstanceId, "settings");
  // A fresh value also scrolls again when the same Action is clicked twice.
  $highlightedVariable.set({ id });
};
