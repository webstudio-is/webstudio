import type { LayersValue } from "@webstudio-is/css-engine";
import { styled, theme } from "@webstudio-is/design-system";
import { setEnv } from "@webstudio-is/feature-flags";
import { useRef, useState } from "react";
import type { StyleInfo } from "../../shared/style-info";
import type {
  CreateBatchUpdate,
  DeleteProperty,
  SetProperty,
} from "../../shared/use-style-data";
import { Section } from "./backgrounds";

setEnv("*");

const backgroundImageStyle: LayersValue = {
  type: "layers",
  value: [
    {
      type: "unparsed",
      value: "linear-gradient(red, yellow)",
    },
    {
      type: "unparsed",
      value: "linear-gradient(blue, red)",
    },
    {
      type: "keyword",
      value: "none",
    },
  ],
};

const Panel = styled("div", {
  width: theme.spacing[30],
});

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

  return { styleInfo, setProperty, deleteProperty, createBatchUpdate };
};

export const BackgroundsCollapsible = () => {
  const { styleInfo, setProperty, deleteProperty, createBatchUpdate } =
    useStyleInfo({
      backgroundImage: {
        cascaded: {
          value: backgroundImageStyle,
          breakpointId: "mobile",
        },
        value: backgroundImageStyle,
      },
    });

  return (
    <Panel>
      <Section
        currentStyle={styleInfo}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
        createBatchUpdate={createBatchUpdate}
      />
    </Panel>
  );
};

export const Backgrounds = () => {
  const { styleInfo, setProperty, deleteProperty, createBatchUpdate } =
    useStyleInfo({
      backgroundImage: {
        value: backgroundImageStyle,
        local: backgroundImageStyle,
      },
    });

  return (
    <Panel>
      <Section
        currentStyle={styleInfo}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
        createBatchUpdate={createBatchUpdate}
      />
    </Panel>
  );
};

export default {
  title: "Style/Background",
  component: Section,
};
