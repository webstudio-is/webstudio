import { useState, useMemo, useEffect, useCallback } from "react";
import warnOnce from "warn-once";
import type { SelectedInstanceData, StyleUpdates } from "@webstudio-is/project";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { type Publish } from "~/shared/pubsub";
import { useSelectedBreakpoint } from "~/designer/shared/nano-states";
import type { StylesMessage } from "~/shared/stores/styles";
import { getCssRuleForBreakpoint } from "./get-css-rule-for-breakpoint";
// @todo: must be removed, now it's only for compatibility with existing code
import { parseCssValue } from "./parse-css-value";
import { useStyleInfo } from "./style-info";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    updateStyle: StyleUpdates;
    previewStyle: StyleUpdates;
  }
}

type UseStyleData = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

export type StyleUpdateOptions = { isEphemeral: boolean };

// @todo: style must have StyleValue type always
export type SetProperty = (
  property: StyleProperty
) => (style: string | StyleValue, options?: StyleUpdateOptions) => void;

export type DeleteProperty = (
  property: StyleProperty,
  options?: StyleUpdateOptions
) => void;

export type CreateBatchUpdate = () => {
  setProperty: (
    property: StyleProperty
  ) => (style: string | StyleValue) => void;
  deleteProperty: (property: StyleProperty) => void;
  publish: (options?: StyleUpdateOptions) => void;
};

export const useStyleData = ({
  selectedInstanceData,
  publish,
}: UseStyleData) => {
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const cssRule = useMemo(
    () =>
      getCssRuleForBreakpoint(
        selectedInstanceData?.cssRules,
        selectedBreakpoint
      ),
    [selectedInstanceData?.cssRules, selectedBreakpoint]
  );

  const [breakpointStyle, setBreakpointStyle] = useState(() => cssRule?.style);

  const currentStyle = useStyleInfo({
    localStyle: breakpointStyle,
    browserStyle: selectedInstanceData?.browserStyle,
  });

  useEffect(() => {
    setBreakpointStyle({ ...cssRule?.style });
  }, [cssRule?.style]);

  const publishUpdates = useCallback(
    (type: "update" | "preview", updates: StylesMessage[]) => {
      if (
        updates.length === 0 ||
        selectedInstanceData === undefined ||
        selectedBreakpoint === undefined
      ) {
        return;
      }
      publish({
        type: type === "update" ? "updateStyle" : "previewStyle",
        payload: {
          id: selectedInstanceData.id,
          updates,
          breakpoint: selectedBreakpoint,
        },
      });
      if (type === "update") {
        publish({
          type: "update",
          payload: updates,
        });
      }
    },
    [publish, selectedBreakpoint, selectedInstanceData]
  );

  // @deprecated should not be called
  const toStyleValue = (property: StyleProperty, value: string) => {
    if (property === "fontFamily") {
      return { type: "fontFamily" as const, value: [value] };
    }

    return parseCssValue(property, value);
  };

  const setProperty = useCallback<SetProperty>(
    (property) => {
      return (inputOrStyle, options = { isEphemeral: false }) => {
        warnOnce(
          typeof inputOrStyle === "string",
          "setProperty should be called with a style object, string is deprecated"
        );

        const nextValue =
          typeof inputOrStyle === "string"
            ? toStyleValue(property, inputOrStyle)
            : inputOrStyle;

        if (nextValue.type !== "invalid") {
          if (
            selectedInstanceData === undefined ||
            selectedBreakpoint === undefined
          ) {
            return;
          }
          const updates: StylesMessage[] = [
            {
              store: "styles",
              breakpointId: selectedBreakpoint.id,
              instanceId: selectedInstanceData.id,
              operation: "set",
              property,
              value: nextValue,
            },
          ];
          const type = options.isEphemeral ? "preview" : "update";

          publishUpdates(type, updates);
        }

        if (options.isEphemeral === false) {
          setBreakpointStyle((prevStyle) => ({
            ...prevStyle,
            [property]: nextValue,
          }));
        }
      };
    },
    [publishUpdates, selectedBreakpoint, selectedInstanceData]
  );

  const deleteProperty = useCallback(
    (property: StyleProperty, options = { isEphemeral: false }) => {
      if (
        selectedInstanceData === undefined ||
        selectedBreakpoint === undefined
      ) {
        return;
      }
      const updates: StylesMessage[] = [
        {
          store: "styles",
          breakpointId: selectedBreakpoint.id,
          instanceId: selectedInstanceData.id,
          operation: "delete",
          property,
        },
      ];
      const type = options.isEphemeral ? "preview" : "update";
      publishUpdates(type, updates);

      if (options.isEphemeral === false) {
        setBreakpointStyle((prevStyle) => {
          const nextStyle = { ...prevStyle };
          delete nextStyle[property];
          return nextStyle;
        });
      }
    },
    [publishUpdates, selectedBreakpoint, selectedInstanceData]
  );

  const createBatchUpdate = useCallback(() => {
    let updates: StylesMessage[] = [];

    const setProperty = (property: StyleProperty) => {
      const setValue = (inputOrStyle: string | StyleValue) => {
        warnOnce(
          typeof inputOrStyle === "string",
          "setProperty should be called with a style object, string is deprecated"
        );

        const value =
          typeof inputOrStyle === "string"
            ? toStyleValue(property, inputOrStyle)
            : inputOrStyle;

        if (value.type === "invalid") {
          return;
        }

        if (
          selectedInstanceData === undefined ||
          selectedBreakpoint === undefined
        ) {
          return;
        }

        updates.push({
          store: "styles",
          breakpointId: selectedBreakpoint.id,
          instanceId: selectedInstanceData.id,
          operation: "set",
          property,
          value,
        });
      };
      return setValue;
    };

    const deleteProperty = (property: StyleProperty) => {
      if (
        selectedInstanceData === undefined ||
        selectedBreakpoint === undefined
      ) {
        return;
      }
      updates.push({
        store: "styles",
        breakpointId: selectedBreakpoint.id,
        instanceId: selectedInstanceData.id,
        operation: "delete",
        property,
      });
    };

    const publish = (options = { isEphemeral: false }) => {
      if (!updates.length) {
        return;
      }
      const type = options.isEphemeral ? "preview" : "update";
      publishUpdates(type, updates);

      if (options.isEphemeral === false) {
        setBreakpointStyle((prevStyle) => {
          const nextStyle = updates.reduce(
            (reduceStyle, update) => {
              if (update.operation === "delete") {
                delete reduceStyle[update.property];
              }
              if (update.operation === "set") {
                reduceStyle[update.property] = update.value;
              }
              return reduceStyle;
            },
            { ...prevStyle }
          );
          return nextStyle;
        });
      }
      updates = [];
    };

    return {
      setProperty,
      deleteProperty,
      publish,
    };
  }, [publishUpdates, selectedBreakpoint, selectedInstanceData]);

  return {
    currentStyle,
    setProperty,
    deleteProperty,
    createBatchUpdate,
  };
};
