import { utils } from "@webstudio-is/project";
import type { Instance, UserProp } from "@webstudio-is/react-sdk";
import { useEffect, useRef } from "react";
import { type InstanceCopyData, serialize, deserialize } from "./serialize";

type Props = {
  selectedInstanceData?: InstanceCopyData | undefined;
  allowAnyTarget?: boolean;
  onPaste?: (instance: Instance, props?: UserProp[]) => void;
  onCut?: (instance: Instance) => void;
};

export const useInstanceCopyPaste = (props: Props): void => {
  const latestProps = useRef<Props>(props);
  latestProps.current = props;

  useEffect(() => {
    const isInstanceClipboardEvent = (event: ClipboardEvent) => {
      const selection = document.getSelection();
      if (selection !== null && selection.type === "Range") {
        return false;
      }

      // Note on event.target:
      //
      //   The spec (https://w3c.github.io/clipboard-apis/#to-fire-a-clipboard-event)
      //   says that if the context is not editable, the target should be the focused node.
      //
      //   But in practice it seems that the target is based
      //   on where the cursor is, rather than which element has focus.
      //   For example, if a <button> has focus, the target is the <body> element
      //   (at least in Chrome).

      // If cursor is in input,
      // don't copy instance (we may want to add more exceptions here in the future)
      if (
        latestProps.current.allowAnyTarget !== true &&
        (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement)
      ) {
        return false;
      }

      return true;
    };

    const handleCopy = (event: ClipboardEvent) => {
      const { selectedInstanceData } = latestProps.current;

      if (
        event.clipboardData === null ||
        selectedInstanceData === undefined ||
        isInstanceClipboardEvent(event) === false
      ) {
        return;
      }

      // must prevent default, otherwise setData() will not work
      event.preventDefault();

      event.clipboardData.setData(
        "application/json",
        serialize(selectedInstanceData)
      );
    };

    const handleCut = (event: ClipboardEvent) => {
      const { selectedInstanceData, onCut } = latestProps.current;

      if (
        event.clipboardData === null ||
        selectedInstanceData === undefined ||
        isInstanceClipboardEvent(event) === false
      ) {
        return;
      }

      // must prevent default, otherwise setData() will not work
      event.preventDefault();

      event.clipboardData.setData(
        "application/json",
        serialize(selectedInstanceData)
      );

      onCut?.(selectedInstanceData.instance);
    };

    const handlePaste = (event: ClipboardEvent) => {
      const { onPaste } = latestProps.current;

      if (
        onPaste === undefined ||
        event.clipboardData === null ||
        // we might want a separate predicate for paste,
        // but for now the logic is the same
        isInstanceClipboardEvent(event) === false
      ) {
        return;
      }

      // this shouldn't matter, but just in case
      event.preventDefault();

      const data = deserialize(event.clipboardData.getData("application/json"));

      if (data === undefined) {
        return;
      }

      const instance = utils.tree.cloneInstance(data.instance);

      const props =
        data.props && data.props.length > 0
          ? utils.props.cloneUserProps(data.props)
          : undefined;

      onPaste(instance, props);
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
    };
  }, []);
};
