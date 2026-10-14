import { atom } from "nanostores";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { $activeInspectorPanel } from "~/builder/shared/nano-states";
import { showInstance } from "~/builder/features/command-panel/shared/instance-list";
import { $selectedInstance, selectInstance } from "~/shared/nano-states";

export const $variableToFocus = atom<
  { id: string; scopeInstanceId: string } | undefined
>();
export const $variableToOpen = atom<{ id: string } | undefined>();

export const showVariable = (id: string) => {
  // Open the existing variable in the current scope without changing the
  // selected canvas instance or navigating to where the variable was defined.
  $variableToFocus.set({
    id,
    scopeInstanceId: $selectedInstance.get()?.id ?? ROOT_INSTANCE_ID,
  });
  $variableToOpen.set({ id });
};

export const showVariableAtSource = (id: string, scopeInstanceId: string) => {
  if (scopeInstanceId === ROOT_INSTANCE_ID) {
    // Root-scoped variables are visible from any page. Select the root in the
    // current page instead of navigating to the home page.
    selectInstance([ROOT_INSTANCE_ID]);
    $activeInspectorPanel.set("settings");
  } else {
    showInstance(scopeInstanceId, "settings");
  }
  $variableToFocus.set({ id, scopeInstanceId });
};
