import type { Meta } from "@storybook/react";
import type * as React from "react";
import { PositionControl } from "./position-control";
import type {
  CreateBatchUpdate,
  DeleteProperty,
  SetProperty,
} from "../../shared/use-style-data";
import { useState, useRef } from "react";
import type { StyleInfo } from "../../shared/style-info";
import { Box } from "@webstudio-is/design-system";

const useStyleInfo = (styleInfoInitial: StyleInfo) => {
  const [styleInfo, setStyleInfo] = useState(() => styleInfoInitial);

  const setProperty: SetProperty = (name) => (value, options) => {
    if (options?.isEphemeral) {
      return;
    }

    setStyleInfo((styleInfo) => ({
      ...styleInfo,
      [name]: {
        ...styleInfo[name],
        value: value,
        local: value,
      },
    }));
  };

  const deleteProperty: DeleteProperty = (name, options) => {
    if (options?.isEphemeral) {
      return;
    }

    setStyleInfo((styleInfo) => {
      const styleInfoCopy = { ...styleInfo };

      styleInfoCopy[name] = structuredClone(defaultValue);

      return styleInfoCopy;
    });
  };

  const execCommands = useRef<(() => void)[]>([]);

  const createBatchUpdate: CreateBatchUpdate = () => ({
    deleteProperty: (property) => {
      execCommands.current.push(() => {
        deleteProperty(property);
      });
    },
    setProperty: (property) => (style) => {
      execCommands.current.push(() => {
        setProperty(property)(style);
      });
    },
    publish: (options) => {
      if (options?.isEphemeral) {
        execCommands.current = [];
        return;
      }

      for (const command of execCommands.current) {
        command();
      }

      execCommands.current = [];
    },
  });

  return { styleInfo, setProperty, deleteProperty, createBatchUpdate };
};

const defaultValue = {
  value: {
    type: "keyword",
    value: "auto",
  },
} as const;

const bigValue = {
  value: {
    type: "unit",
    value: 123.27,
    unit: "rem",
  },

  local: {
    type: "unit",
    value: 123.27,
    unit: "rem",
  },
} as const;

export const PositionControlComponent = (
  args: Omit<React.ComponentProps<typeof PositionControl>, "renderCell">
) => {
  const { styleInfo, setProperty, deleteProperty, createBatchUpdate } =
    useStyleInfo({
      left: defaultValue,
      right: bigValue,
      top: defaultValue,
      bottom: defaultValue,
    });

  return (
    <Box css={{ marginLeft: 100 }}>
      <PositionControl
        createBatchUpdate={createBatchUpdate}
        currentStyle={styleInfo}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
    </Box>
  );
};

export default {
  title: "Position/Control",
  component: PositionControlComponent,
} as Meta<typeof PositionControlComponent>;
