import type { FormEventHandler, ReactNode, RefObject } from "react";
import {
  DialogTitle,
  Flex,
  ScrollArea,
  SplitView,
  theme,
} from "@webstudio-is/design-system";

export const VariableEditorBody = ({
  formRef,
  onSubmit,
  disabled,
  commonFields,
  fields,
  preview,
  title,
  titleActions,
}: {
  formRef: RefObject<HTMLFormElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  disabled: boolean;
  commonFields: ReactNode;
  fields: ReactNode;
  preview: ReactNode;
  title: string;
  titleActions: ReactNode;
}) => (
  <>
    <SplitView
      defaultSize={{ value: 320, unit: "px" }}
      minimumStartSize={240}
      minimumEndSize={240}
      separatorLabel="Resize variable configuration"
      start={
        <ScrollArea css={{ display: "flex", flexDirection: "column" }}>
          <form
            ref={formRef}
            noValidate={true}
            style={{ display: "contents" }}
            onSubmit={onSubmit}
          >
            <button hidden />
            <fieldset style={{ display: "contents" }} disabled={disabled}>
              <Flex
                direction="column"
                css={{
                  overflow: "hidden",
                  paddingBlock: theme.panel.paddingBlock,
                  gap: theme.spacing[7],
                }}
              >
                {commonFields}
                {fields}
              </Flex>
            </fieldset>
          </form>
        </ScrollArea>
      }
      end={preview}
    />
    <DialogTitle maximizable suffix={titleActions}>
      {title}
    </DialogTitle>
  </>
);
