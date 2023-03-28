import { styled, theme } from "@webstudio-is/design-system";
import { setEnv } from "@webstudio-is/feature-flags";
import { useRef, useState } from "react";
import type { StyleInfo } from "../../shared/style-info";
import type {
  CreateBatchUpdate,
  DeleteProperty,
  SetProperty,
} from "../../shared/use-style-data";
import { BordersSection } from "./borders";
setEnv("*");

const styleInfoInitial: StyleInfo = {
  borderTopColor: {
    local: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
    value: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
  },
};

const Panel = styled("div", {
  width: theme.spacing[30],
  boxSizing: "border-box",
});

export const Borders = () => {
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
      const { [name]: _, ...rest } = styleInfo;
      return rest;
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

  return (
    <Panel>
      <BordersSection
        currentStyle={styleInfo}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
        createBatchUpdate={createBatchUpdate}
        category={"borders"}
        label={"Borders"}
        styleConfigsByCategory={[]}
        moreStyleConfigsByCategory={[]}
      />
    </Panel>
  );
};

export default {
  title: "Style/Borders",
  component: BordersSection,
};
