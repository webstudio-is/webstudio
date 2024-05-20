import { FORMAT_TEXT_COMMAND } from "lexical";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { createCommandsEmitter } from "~/shared/commands-emitter";
import { getElementByInstanceSelector } from "~/shared/dom-utils";
import { findClosestEditableInstanceSelector } from "~/shared/instance-utils";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";
import {
  CLEAR_FORMAT_COMMAND,
  TOGGLE_SPAN_COMMAND,
  getActiveEditor,
  hasSelectionFormat,
} from "../features/text-editor/toolbar-connector";

export const { emitCommand, subscribeCommands } = createCommandsEmitter({
  source: "canvas",
  externalCommands: ["clickCanvas"],
  commands: [
    {
      name: "editInstanceText",
      defaultHotkeys: ["enter"],
      // builder invokes command with custom hotkey setup
      disableHotkeyOutsideApp: true,
      handler: () => {
        const selectedInstanceSelector = $selectedInstanceSelector.get();
        if (selectedInstanceSelector === undefined) {
          return;
        }
        const editableInstanceSelector = findClosestEditableInstanceSelector(
          selectedInstanceSelector,
          $instances.get(),
          $registeredComponentMetas.get()
        );
        if (editableInstanceSelector === undefined) {
          return;
        }
        const element = getElementByInstanceSelector(editableInstanceSelector);
        if (element === undefined) {
          return;
        }
        // When an event is triggered from the Builder,
        // the canvas element may be unfocused, so it's important to focus the element on the canvas.
        element.focus();
        $selectedInstanceSelector.set(editableInstanceSelector);
        $textEditingInstanceSelector.set(editableInstanceSelector);
      },
    },

    {
      name: "escapeSelection",
      defaultHotkeys: ["escape"],
      // reset selection for canvas, but not for the builder
      disableHotkeyOutsideApp: true,
      handler: () => {
        const selectedInstanceSelector = $selectedInstanceSelector.get();
        const textEditingInstanceSelector = $textEditingInstanceSelector.get();
        if (selectedInstanceSelector === undefined) {
          return;
        }
        // exit text editing mode first without unselecting instance
        if (textEditingInstanceSelector) {
          $textEditingInstanceSelector.set(undefined);
          return;
        }
        // unselect both instance and style source
        $selectedInstanceSelector.set(undefined);
      },
    },

    {
      name: "formatBold",
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
      handler: () => {
        const editor = getActiveEditor();
        editor?.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        requestAnimationFrame(() => editor?.focus());
      },
    },
    {
      name: "formatSuperscript",
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
      handler: () => {
        const editor = getActiveEditor();
        editor?.dispatchCommand(TOGGLE_SPAN_COMMAND, undefined);
        requestAnimationFrame(() => editor?.focus());
      },
    },
    {
      name: "formatClear",
      handler: () => {
        const editor = getActiveEditor();
        editor?.dispatchCommand(CLEAR_FORMAT_COMMAND, undefined);
        requestAnimationFrame(() => editor?.focus());
      },
    },
  ],
});
