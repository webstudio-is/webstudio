import { FORMAT_TEXT_COMMAND } from "lexical";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { createCommandsEmitter } from "~/shared/commands-emitter";
import { getElementByInstanceSelector } from "~/shared/dom-utils";
import {
  findClosestEditableInstanceSelector,
  findAllEditableInstanceSelector,
} from "~/shared/instance-utils";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  $textToolbar,
} from "~/shared/nano-states";
import {
  CLEAR_FORMAT_COMMAND,
  TOGGLE_SPAN_COMMAND,
  getActiveEditor,
  hasSelectionFormat,
} from "../features/text-editor/toolbar-connector";
import { selectInstance } from "~/shared/awareness";
import { isDescendantOrSelf, type InstanceSelector } from "~/shared/tree-utils";
import { deleteSelectedInstance } from "~/builder/shared/commands";

export const { emitCommand, subscribeCommands } = createCommandsEmitter({
  source: "canvas",
  externalCommands: ["clickCanvas"],
  commands: [
    {
      name: "deleteInstanceCanvas",
      defaultHotkeys: ["backspace", "delete"],
      disableHotkeyOutsideApp: true,
      // We are not disabling "Backspace" or "Delete" on the canvas. This is the main reason we have separate functions: deleteInstanceCanvas and deleteInstanceBuilder.
      disableOnInputLikeControls: false,
      handler: deleteSelectedInstance,
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

        let editableInstanceSelector = findClosestEditableInstanceSelector(
          selectedInstanceSelector,
          $instances.get(),
          $registeredComponentMetas.get()
        );

        if (editableInstanceSelector === undefined) {
          const selectors: InstanceSelector[] = [];

          findAllEditableInstanceSelector(
            selectedInstanceSelector,
            $instances.get(),
            $registeredComponentMetas.get(),
            selectors
          );

          if (selectors.length === 0) {
            $textEditingInstanceSelector.set(undefined);
            return;
          }

          editableInstanceSelector = selectors[0];
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
        const selectedInstanceSelector = $selectedInstanceSelector.get();
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

        if (selectedInstanceSelector) {
          // unselect both instance and style source
          selectInstance(undefined);
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
