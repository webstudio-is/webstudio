import type {
  SetProperty,
  DeleteProperty,
  CreateBatchUpdate,
} from "../../shared/use-style-data";
import type { StyleInfo } from "../../shared/style-info";

export type SectionProps = {
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  createBatchUpdate: CreateBatchUpdate;
  currentStyle: StyleInfo;
};
