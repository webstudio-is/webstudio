import { FORMAT_TEXT_COMMAND } from "lexical";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { createCommandsEmitter } from "~/shared/commands-emitter";
import { getElementByInstanceSelector } from "~/shared/dom-utils";
import { findAllEditableInstanceSelector } from "@webstudio-is/project-build/runtime";
import {
  $allSelectedInstanceSelectors,
  $isContentMode,
  $registeredComponentMetas,
  $propsIndex,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  $textToolbar,
  clearInstanceSelection,
  selectInstance,
} from "~/shared/nano-states";
import { $instances, $props } from "~/shared/sync/data-stores";
import {
  CLEAR_FORMAT_COMMAND,
  TOGGLE_SPAN_COMMAND,
  getActiveEditor,
  hasSelectionFormat,
} from "../features/text-editor/toolbar-connector";
import {
  isDescendantOrSelf,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";
import { deleteSelectedInstance } from "~/shared/instance-utils/mutation";
import { findClosestRichText } from "@webstudio-is/project-build/runtime";
import { getDeletablePageActionTarget } from "~/shared/page-action-target";
import { isTextEditableInContentMode } from "./content-mode";

const deleteSelectedPageOrInstance = () => {
  if (getDeletablePageActionTarget() !== undefined) {
    emitCommand("deleteInstanceBuilder");
    return;
  }

  deleteSelectedInstance();
};

export const { emitCommand, subscribeCommands } = createCommandsEmitter({
  source: "canvas",
  externalCommands: [
    "clickCanvas",
    "deleteInstanceBuilder",
    "moveInstanceUp",
    "moveInstanceDown",
    "moveInstanceOut",
    "moveInstanceIntoPreviousSibling",
    "selectPreviousSibling",
    "selectNextSibling",
    "selectSiblingInstances",
  ],
  commands: [
    {
      name: "deleteInstanceCanvas",
      hidden: true,
      defaultHotkeys: ["backspace", "delete"],
      preventDefault: false,
      disableHotkeyOutsideApp: true,
      // We are not disabling "Backspace" or "Delete" on the canvas. This is the main reason we have separate functions: deleteInstanceCanvas and deleteInstanceBuilder.
      disableOnInputLikeControls: false,
      handler: deleteSelectedPageOrInstance,
    },

    {
      name: "editInstanceText",
      hidden: true,
      defaultHotkeys: ["enter"],
      disableOnInputLikeControls: true,
      // builder invokes command with custom hotkey setup
      disableHotkeyOutsideApp: true,
      handler: () => {
        const selectedInstanceSelector = $selectedInstanceSelector.get();
        if (selectedInstanceSelector === undefined) {
          return;
        }

        if (
          isDescendantOrSelf(
            $textEditingInstanceSelector.get()?.selector ?? [],
            selectedInstanceSelector
          )
        ) {
          // already in text editing mode
          return;
        }

        let editableInstanceSelector = findClosestRichText({
          instanceSelector: selectedInstanceSelector,
          instances: $instances.get(),
          props: $props.get(),
          metas: $registeredComponentMetas.get(),
          htmlTagsByInstanceId: $propsIndex.get().htmlTagsByInstanceId,
        });

        if (editableInstanceSelector === undefined) {
          const selectors: InstanceSelector[] = [];

          findAllEditableInstanceSelector({
            instanceSelector: selectedInstanceSelector,
            instances: $instances.get(),
            props: $props.get(),
            metas: $registeredComponentMetas.get(),
            htmlTagsByInstanceId: $propsIndex.get().htmlTagsByInstanceId,
            results: selectors,
          });

          if (selectors.length === 0) {
            $textEditingInstanceSelector.set(undefined);
            return;
          }

          editableInstanceSelector = selectors[0];
        }

        if (
          isTextEditableInContentMode({
            isContentMode: $isContentMode.get(),
            instanceSelector: editableInstanceSelector,
            instances: $instances.get(),
          }) === false
        ) {
          return;
        }

        const element = getElementByInstanceSelector(editableInstanceSelector);
        if (element === undefined) {
          return;
        }
        // When an event is triggered from the Builder,
        // the canvas element may be unfocused, so it's important to focus the element on the canvas.
        element.focus();

        selectInstance(editableInstanceSelector);

        $textEditingInstanceSelector.set({
          selector: editableInstanceSelector,
          reason: "enter",
        });
      },
    },

    {
      name: "escapeSelection",
      hidden: true,
      defaultHotkeys: ["escape"],
      disableOnInputLikeControls: true,
      // reset selection for canvas, but not for the builder
      disableHotkeyOutsideApp: true,
      handler: () => {
        const textEditingInstanceSelector = $textEditingInstanceSelector.get();
        const textToolbar = $textToolbar.get();

        // close text toolbar first without exiting text editing mode
        if (textToolbar) {
          $textToolbar.set(undefined);
          return;
        }

        // exit text editing mode first without unselecting instance
        if (textEditingInstanceSelector) {
          $textEditingInstanceSelector.set(undefined);
          return;
        }

        if ($allSelectedInstanceSelectors.get().length > 0) {
          // unselect both instance and style source
          clearInstanceSelection();
          return;
        }
      },
    },

    {
      name: "formatBold",
      hidden: true,
      handler: () => {
        const editor = getActiveEditor();
        editor?.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        // refocus editor on the next frame
        // otherwise it sometimes is left on toolbar button
        requestAnimationFrame(() => editor?.focus());
      },
    },
    {
      name: "formatItalic",
      hidden: true,
      handler: () => {
        const editor = getActiveEditor();
        editor?.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        requestAnimationFrame(() => editor?.focus());
      },
    },
    {
      name: "formatSuperscript",
      hidden: true,
      handler: () => {
        const editor = getActiveEditor();
        editor?.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript");
        // remove subscript if superscript is added
        if (hasSelectionFormat("subscript")) {
          editor?.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript");
        }
        requestAnimationFrame(() => editor?.focus());
      },
    },
    {
      name: "formatSubscript",
      hidden: true,
      handler: () => {
        const editor = getActiveEditor();
        editor?.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript");
        // remove superscript if subscript is added
        if (hasSelectionFormat("superscript")) {
          editor?.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript");
        }
        requestAnimationFrame(() => editor?.focus());
      },
    },
    {
      name: "formatLink",
      hidden: true,
      handler: () => {
        const editor = getActiveEditor();
        if (hasSelectionFormat("link")) {
          editor?.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        } else {
          editor?.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
        }
        requestAnimationFrame(() => editor?.focus());
      },
    },
    {
      name: "formatSpan",
      hidden: true,
      handler: () => {
        const editor = getActiveEditor();
        editor?.dispatchCommand(TOGGLE_SPAN_COMMAND, undefined);
        requestAnimationFrame(() => editor?.focus());
      },
    },
    {
      name: "formatClear",
      hidden: true,
      handler: () => {
        const editor = getActiveEditor();
        editor?.dispatchCommand(CLEAR_FORMAT_COMMAND, undefined);
        requestAnimationFrame(() => editor?.focus());
      },
    },
  ],
});
