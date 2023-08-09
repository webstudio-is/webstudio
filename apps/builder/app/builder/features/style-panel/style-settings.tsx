import { Fragment } from "react";
import type { StyleProperty } from "@webstudio-is/css-data";
import {
  categories,
  renderCategory,
  shouldRenderCategory,
  type RenderCategoryProps,
} from "./style-sections";
import type { SetProperty, CreateBatchUpdate } from "./shared/use-style-data";
import type { StyleInfo } from "./shared/style-info";
import { useStore } from "@nanostores/react";
import {
  selectedInstanceIntanceToTagStore,
  selectedInstanceSelectorStore,
} from "~/shared/nano-states";
import { useStyleInfoByInstanceId } from "./shared/style-info";
import { computed } from "nanostores";

export type StyleSettingsProps = {
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: (property: StyleProperty) => void;
  createBatchUpdate: CreateBatchUpdate;
};

const useParentStyle = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const parentInstanceSelector =
    // root does not have parent
    selectedInstanceSelector?.length === 1
      ? undefined
      : selectedInstanceSelector?.slice(1);
  const parentStyleInfo = useStyleInfoByInstanceId(parentInstanceSelector);

  return parentStyleInfo;
};

const selectedInstanceTagStore = computed(
  [selectedInstanceSelectorStore, selectedInstanceIntanceToTagStore],
  (instanceSelector, instanceToTag) => {
    if (instanceSelector === undefined || instanceToTag === undefined) {
      return;
    }
    return instanceToTag.get(instanceSelector[0]);
  }
);

export const StyleSettings = ({
  setProperty,
  deleteProperty,
  createBatchUpdate,
  currentStyle,
}: StyleSettingsProps) => {
  const selectedInstanceTag = useStore(selectedInstanceTagStore);
  const all = [];
  const parentStyle = useParentStyle();

  for (const category of categories) {
    const categoryProps: RenderCategoryProps = {
      setProperty,
      deleteProperty,
      createBatchUpdate,
      currentStyle,
      category,
    };

    if (shouldRenderCategory(categoryProps, parentStyle, selectedInstanceTag)) {
      all.push(
        <Fragment key={category}>{renderCategory(categoryProps)}</Fragment>
      );
    }
  }

  return <>{all}</>;
};
