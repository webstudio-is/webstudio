import { PropItem } from "react-docgen-typescript";
export declare type FilterPredicate = (prop: PropItem) => boolean;
export declare const propsToArgTypes: (
  props: Record<string, PropItem>,
  filter?: FilterPredicate
) => Record<string, any>;
export declare const getArgType: (propItem: any) =>
  | {
      type: string;
      defaultValue: any;
      options: any;
      required: any;
    }
  | null
  | undefined;
//# sourceMappingURL=arg-types.d.ts.map
