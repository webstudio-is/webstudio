import ObjectId from "bson-objectid";
import { useEffect } from "react";
import { z } from "zod";
import { Instance, Props, Styles } from "@webstudio-is/project-build";
import { utils } from "@webstudio-is/project";
import { startCopyPaste } from "./copy-paste";

const InstanceCopyData = z.object({
  instance: Instance,
  props: Props,
  styles: Styles,
});

export type InstanceCopyData = z.infer<typeof InstanceCopyData>;

type InstanceCopyPasteProps = {
  selectedInstanceData?: InstanceCopyData;
  allowAnyTarget?: boolean;
  onPaste: (data: InstanceCopyData) => void;
  onCut: (instance: Instance) => void;
};

// to make it easier to remove React from canvas if we need to
export const useInstanceCopyPaste = (props: InstanceCopyPasteProps): void => {
  const { selectedInstanceData, allowAnyTarget, onPaste, onCut } = props;
  useEffect(() => {
    return startCopyPaste({
      version: "@webstudio/instance/v0.1",
      type: InstanceCopyData,
      onCopy: () => {
        return selectedInstanceData;
      },
      onCut: () => {
        if (selectedInstanceData === undefined) {
          return;
        }
        onCut(selectedInstanceData.instance);
        return selectedInstanceData;
      },
      onPaste: (data: InstanceCopyData) => {
        const instance = utils.tree.cloneInstance(data.instance);

        // copy props with new ids and link to new instance
        const props: Props = data.props.map((prop) => {
          return {
            ...prop,
            id: ObjectId().toString(),
            instanceId: instance.id,
          };
        });

        const styles: Styles = data.styles.map((styleDecl) => {
          return {
            ...styleDecl,
            instanceId: instance.id,
          };
        });

        onPaste({ instance, props, styles });
      },
    });
  }, [selectedInstanceData, allowAnyTarget, onPaste, onCut]);
};
