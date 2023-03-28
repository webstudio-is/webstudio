import type { StyleProperty } from "@webstudio-is/css-data";
import type {
  CreateBatchUpdate,
  DeleteProperty,
  SetProperty,
} from "../../shared/use-style-data";

export const deleteAllProperties: (
  styleProperties: readonly StyleProperty[],
  createBatchUpdate: CreateBatchUpdate
) => DeleteProperty =
  (styleProperties, createBatchUpdate) => (_propertyName, options) => {
    const batch = createBatchUpdate();
    for (const property of styleProperties) {
      batch.deleteProperty(property);
    }
    batch.publish(options);
  };

export const setAllProperties: (
  styleProperties: readonly StyleProperty[],
  createBatchUpdate: CreateBatchUpdate
) => SetProperty =
  (styleProperties, createBatchUpdate) =>
  (_propertyName) =>
  (value, options) => {
    const batch = createBatchUpdate();
    for (const property of styleProperties) {
      batch.setProperty(property)(value);
    }
    batch.publish(options);
  };
