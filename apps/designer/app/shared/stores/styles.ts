import { useEffect } from "react";
import store from "immerhin";
import { createValueContainer, useValue } from "react-nano-state";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import type { Styles } from "@webstudio-is/react-sdk";
import { publish, subscribe } from "~/shared/pubsub";
import { useSyncInitializeOnce } from "~/shared/hook-utils";

export const stylesContainer = createValueContainer<Styles>([]);

export const useStyles = () => useValue(stylesContainer);

type SetStylesMessage = {
  store: "styles";
  operation: "set";
  breakpointId: string;
  instanceId: string;
  property: StyleProperty;
  value: StyleValue;
};

type DeleteStylesMessage = {
  store: "styles";
  operation: "delete";
  breakpointId: string;
  instanceId: string;
  property: StyleProperty;
};

export type StylesMessage = SetStylesMessage | DeleteStylesMessage;

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    loadStyles: Styles;
  }
}

export const updateStyles = (styles: Styles, message: StylesMessage) => {
  const { breakpointId, instanceId, property } = message;
  const matchedIndex = styles.findIndex(
    (item) =>
      item.breakpointId === breakpointId &&
      item.instanceId === instanceId &&
      item.property === property
  );

  if (message.operation === "set") {
    const newItem = {
      breakpointId,
      instanceId,
      property,
      value: message.value,
    };
    if (matchedIndex === -1) {
      styles.push(newItem);
    } else {
      styles[matchedIndex] = newItem;
    }
  }

  if (message.operation === "delete" && matchedIndex !== -1) {
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
    return subscribe("update", (messages) => {
      store.createTransaction([stylesContainer], (styles) => {
        for (const message of messages) {
          if (message.store === "styles") {
            updateStyles(styles, message);
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
