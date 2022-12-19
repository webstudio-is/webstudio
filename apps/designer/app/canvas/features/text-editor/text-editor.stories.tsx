import { useState } from "react";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { Box } from "@webstudio-is/design-system";
import { useSubscribe, publish } from "~/shared/pubsub";
import { utils } from "@webstudio-is/project";
import type { TextToolbarState } from "~/designer/shared/nano-states";
import { TextEditor } from "./text-editor";

export default {
  component: TextEditor,
  title: "Text Editor 2",
} as ComponentMeta<typeof TextEditor>;

type Format =
  | "bold"
  | "italic"
  | "superscript"
  | "subscript"
  | "link"
  | "span"
  | "clear";

export const Basic: ComponentStory<typeof TextEditor> = ({ onChange }) => {
  const [state, setState] = useState<null | TextToolbarState>(null);
  useSubscribe("showTextToolbar", (event) => {
    setState(event);
  });
  useSubscribe("hideTextToolbar", () => {
    setState(null);
  });

  const setFormat = (type: Format) => {
    publish({ type: "formatTextToolbar", payload: type });
  };

  return (
    <div>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isBold ? "bold" : "normal" }}
        onClick={() => setFormat("bold")}
      >
        Bold
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isItalic ? "bold" : "normal" }}
        onClick={() => setFormat("italic")}
      >
        Italic
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isSuperscript ? "bold" : "normal" }}
        onClick={() => setFormat("superscript")}
      >
        Superscript
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isSubscript ? "bold" : "normal" }}
        onClick={() => setFormat("subscript")}
      >
        Subscript
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isLink ? "bold" : "normal" }}
        onClick={() => setFormat("link")}
      >
        Link
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isSpan ? "bold" : "normal" }}
        onClick={() => setFormat("span")}
      >
        Span
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: "normal" }}
        onClick={() => setFormat("clear")}
      >
        Clear
      </button>
      <Box
        css={{
          "& > div": {
            padding: "0 $spacing$5",
            border: "1px solid #999",
            color: "black",
          },
        }}
      >
        <TextEditor
          instance={utils.tree.createInstance({
            component: "TextBlock",
            children: [
              { type: "text", value: "Paragraph you can edit " },
              utils.tree.createInstance({
                component: "Bold",
                children: [{ type: "text", value: "very bold text " }],
              }),
              utils.tree.createInstance({
                component: "Bold",
                children: [
                  utils.tree.createInstance({
                    component: "Italic",
                    children: [{ type: "text", value: "with small italic" }],
                  }),
                ],
              }),
              utils.tree.createInstance({
                component: "Bold",
                children: [{ type: "text", value: " subtext" }],
              }),
            ],
          })}
          contentEditable={<ContentEditable />}
          onChange={onChange}
          onSelectInstance={(instanceId) =>
            // eslint-disable-next-line no-console
            console.info("select instance", instanceId)
          }
        />
      </Box>
    </div>
  );
};

Basic.args = {
  onChange: action("onChange"),
};
