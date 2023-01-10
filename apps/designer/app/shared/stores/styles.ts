import { useEffect } from "react";
import store from "immerhin";
import { createValueContainer, useValue } from "react-nano-state";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import type { Styles } from "@webstudio-is/react-sdk";
import { publish, subscribe } from "~/shared/pubsub";
import { useSyncInitializeOnce } from "~/shared/hook-utils";

export const stylesContainer = createValueContainer<Styles>([]);

export const useStyles = () => useValue(stylesContainer);

type SetStylesUpdate = {
  store: "styles";
  operation: "set";
  breakpointId: string;
  instanceId: string;
  property: StyleProperty;
  value: StyleValue;
};

type DeleteStylesUpdate = {
  store: "styles";
  operation: "delete";
  breakpointId: string;
  instanceId: string;
  property: StyleProperty;
};

export type StylesUpdate = SetStylesUpdate | DeleteStylesUpdate;

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    loadStyles: Styles;
  }
}

export const updateStylesMutable = (styles: Styles, update: StylesUpdate) => {
  const { breakpointId, instanceId, property } = update;
  const matchedIndex = styles.findIndex(
    (item) =>
      item.breakpointId === breakpointId &&
      item.instanceId === instanceId &&
      item.property === property
  );

  if (update.operation === "set") {
    const newItem = {
      breakpointId,
      instanceId,
      property,
      value: update.value,
    };
    if (matchedIndex === -1) {
      styles.push(newItem);
    } else {
      styles[matchedIndex] = newItem;
    }
  }

  if (update.operation === "delete" && matchedIndex !== -1) {
    styles.splice(matchedIndex, 1);
  }
};

export const useInitStyles = (styles: Styles) => {
  // set initial styles value
  useSyncInitializeOnce(() => {
    stylesContainer.value = styles;
  });

  // styles are maintained on canvas side
  // always send latest state to designer
  useEffect(() => {
    publish({
      type: "loadStyles",
      payload: stylesContainer.value,
    });
    stylesContainer.subscribe((styles) => {
      publish({
        type: "loadStyles",
        payload: styles,
      });
    });
  }, []);

  // subscribe to styles updates
  useEffect(() => {
    return subscribe("update", (updates) => {
      store.createTransaction([stylesContainer], (styles) => {
        for (const update of updates) {
          if (update.store === "styles") {
            updateStylesMutable(styles, update);
          }
        }
      });
    });
  }, []);
};

// synchronize with canvas styles
export const useSubscribeStyles = () => {
  useEffect(() => {
    return subscribe("loadStyles", (styles) => {
      stylesContainer.dispatch(styles);
    });
  }, []);
};
