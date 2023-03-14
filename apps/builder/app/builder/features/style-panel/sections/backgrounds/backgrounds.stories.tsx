import type { LayersValue } from "@webstudio-is/css-data";
import { styled, theme } from "@webstudio-is/design-system";
import { useState } from "react";
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
    setStyleInfo((styleInfo) => ({
      ...styleInfo,
      [name]: {
        ...styleInfo[name],
        value: value,
        local: value,
      },
    }));
  };

  const deleteProperty: DeleteProperty = (name) => {
    setStyleInfo((styleInfo) => {
      const { [name]: _, ...rest } = styleInfo;
      return rest;
    });
  };

  const createBatchUpdate: CreateBatchUpdate = () => ({
    deleteProperty,
    setProperty,
    publish: () => {
      // do nothing
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
