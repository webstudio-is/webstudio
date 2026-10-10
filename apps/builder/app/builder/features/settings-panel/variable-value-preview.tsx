import { useMemo } from "react";
import { Grid } from "@webstudio-is/design-system";
import { javascript } from "@codemirror/lang-javascript";
import { EditorContent, foldGutterExtension } from "~/shared/code-editor-base";
import { formatValue } from "~/builder/shared/expression-editor";

export const ValuePreviewFrame = ({ value }: { value: unknown }) => {
  const extensions = useMemo(() => [javascript({}), foldGutterExtension], []);
  return (
    <Grid
      align="stretch"
      css={{
        height: "100%",
        overflow: "hidden",
        boxSizing: "content-box",
        position: "relative",
        gridTemplateRows: "minmax(0, 1fr)",
      }}
    >
      <EditorContent
        readOnly
        chromeless
        extensions={extensions}
        value={formatValue(value)}
        onChange={() => {}}
        onChangeComplete={() => {}}
      />
    </Grid>
  );
};
