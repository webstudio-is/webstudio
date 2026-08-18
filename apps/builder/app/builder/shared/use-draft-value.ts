import equal from "fast-deep-equal";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

type ValueUpdater<Type> = Type | ((value: Type) => Type);

export const useDraftValue = <Type>(
  savedValue: Type,
  onSave: (value: Type) => void,
  {
    autoSave = true,
    resetOnSave = false,
    shouldSave = () => true,
  }: {
    autoSave?: boolean;
    resetOnSave?: boolean;
    shouldSave?: (value: Type) => boolean;
  } = {}
) => {
  const isEditingRef = useRef(false);
  const localValueRef = useRef(savedValue);
  const savedValueRef = useRef(savedValue);
  savedValueRef.current = savedValue;

  const [_, setRefresh] = useState(0);

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const shouldSaveRef = useRef(shouldSave);
  shouldSaveRef.current = shouldSave;

  const refresh = () => {
    setRefresh((refresh) => refresh + 1);
  };

  const saveDraft = ({ refreshOnReset = true } = {}) => {
    isEditingRef.current = false;
    if (
      equal(localValueRef.current, savedValueRef.current) === false &&
      shouldSaveRef.current(localValueRef.current)
    ) {
      // To synchronize with setState immediately followed by save
      onSaveRef.current(localValueRef.current);
      if (resetOnSave) {
        localValueRef.current = savedValueRef.current;
        if (refreshOnReset) {
          refresh();
        }
      }
    }
  };

  const save = () => {
    saveDraft();
  };

  const saveDebounced = useDebouncedCallback(save, 500);

  const setLocalValue = (valueOrUpdater: ValueUpdater<Type>) => {
    isEditingRef.current = true;
    localValueRef.current =
      typeof valueOrUpdater === "function"
        ? (valueOrUpdater as (value: Type) => Type)(localValueRef.current)
        : valueOrUpdater;
    refresh();
    if (autoSave) {
      saveDebounced();
    }
  };

  // onBlur will not trigger if control is unmounted when props panel is closed or similar.
  // So we're saving at the unmount
  // store save in ref to access latest saved value from render
  // instead of stale one
  const saveRef = useRef(save);
  saveRef.current = () => saveDraft({ refreshOnReset: false });
  useEffect(() => {
    // access ref in the moment of unmount
    return () => {
      saveRef.current();
      saveDebounced.cancel();
    };
  }, [saveDebounced]);

  useEffect(() => {
    // Update local value if saved value changes and control is not in edit mode.
    if (
      isEditingRef.current === false &&
      equal(localValueRef.current, savedValue) === false
    ) {
      localValueRef.current = savedValue;
      refresh();
    }
  }, [savedValue]);

  return {
    /**
     * Contains:
     *  - either the latest `savedValue`
     *  - or the latest value set via `set()`
     * (whichever changed most recently)
     */
    value: localValueRef.current,
    /**
     * Should be called on onChange or similar event
     */
    set: setLocalValue,
    /**
     * Should be called on onBlur or similar event
     */
    save,
    flush: saveDebounced.flush,
  };
};
