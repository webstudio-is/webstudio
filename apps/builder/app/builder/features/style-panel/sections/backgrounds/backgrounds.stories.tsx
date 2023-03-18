import type { LayersValue } from "@webstudio-is/css-data";
import { styled, theme } from "@webstudio-is/design-system";
import { useRef, useState } from "react";
import type { StyleInfo } from "../../shared/style-info";
import type {
  CreateBatchUpdate,
  DeleteProperty,
  SetProperty,
} from "../../shared/use-style-data";
import { BackgroundsSection } from "./backgrounds";

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

const styleInfoInitial: StyleInfo = {
  backgroundImage: {
    value: backgroundImageStyle,
    local: backgroundImageStyle,
  },
};

const Panel = styled("div", {
  width: theme.spacing[30],
});

export const Backgrounds = () => {
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
      <BackgroundsSection
        currentStyle={styleInfo}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
        createBatchUpdate={createBatchUpdate}
        category={"backgrounds"}
        styleConfigsByCategory={[]}
        moreStyleConfigsByCategory={[]}
      />
    </Panel>
  );
};

export default {
  title: "Style/Background",
  component: BackgroundsSection,
};
