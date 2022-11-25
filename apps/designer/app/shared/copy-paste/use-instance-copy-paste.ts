import { utils } from "@webstudio-is/project";
import type { Instance, UserProp } from "@webstudio-is/react-sdk";
import { useEffect, useMemo } from "react";
import { type InstanceCopyData, serialize, deserialize } from "./serialize";

const isInstanceClipboardEvent = (
  event: ClipboardEvent,
  options: { allowAnyTarget?: boolean }
) => {
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
    options.allowAnyTarget !== true &&
    (event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement)
  ) {
    return false;
  }

  return true;
};

type Props = {
  selectedInstanceData?: InstanceCopyData | undefined;
  allowAnyTarget?: boolean;
  onPaste: (instance: Instance, props?: UserProp[]) => void;
  onCut: (instance: Instance) => void;
};

const createEventsHandler = () => {
  let currentProps: Props | undefined;

  const handleCopy = (event: ClipboardEvent) => {
    if (currentProps === undefined) {
      return;
    }
    const { selectedInstanceData, allowAnyTarget } = currentProps;

    if (
      event.clipboardData === null ||
      selectedInstanceData === undefined ||
      isInstanceClipboardEvent(event, { allowAnyTarget }) === false
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
    if (currentProps === undefined) {
      return;
    }
    const { selectedInstanceData, allowAnyTarget, onCut } = currentProps;

    if (
      event.clipboardData === null ||
      selectedInstanceData === undefined ||
      isInstanceClipboardEvent(event, {
        allowAnyTarget: allowAnyTarget,
      }) === false
    ) {
      return;
    }

    // must prevent default, otherwise setData() will not work
    event.preventDefault();

    event.clipboardData.setData(
      "application/json",
      serialize(selectedInstanceData)
    );

    onCut(selectedInstanceData.instance);
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (currentProps === undefined) {
      return;
    }
    const { onPaste, allowAnyTarget } = currentProps;

    if (
      event.clipboardData === null ||
      // we might want a separate predicate for paste,
      // but for now the logic is the same
      isInstanceClipboardEvent(event, { allowAnyTarget }) === false
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

  return {
    start() {
      document.addEventListener("copy", handleCopy);
      document.addEventListener("cut", handleCut);
      document.addEventListener("paste", handlePaste);
    },
    stop() {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
    },
    setProps(props: Props) {
      currentProps = props;
    },
  };
};

// Everything is extrcated from hook,
// to make it easier to remove React from canvas if we need to
export const useInstanceCopyPaste = (props: Props): void => {
  const eventsHandler = useMemo(createEventsHandler, []);

  useEffect(() => {
    eventsHandler.setProps(props);
  }, [eventsHandler, props]);

  useEffect(() => {
    eventsHandler.start();
    return eventsHandler.stop;
  }, [eventsHandler]);
};
