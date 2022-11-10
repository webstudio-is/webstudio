import { useState } from "react";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { Box } from "@webstudio-is/design-system";
import { useSubscribe, publish } from "~/shared/pubsub";
import { createInstance } from "~/shared/tree-utils";
import { TextEditor } from "./text-editor";

export default {
  component: TextEditor,
  title: "Text Editor 2",
} as ComponentMeta<typeof TextEditor>;

export const Basic: ComponentStory<typeof TextEditor> = ({ onChange }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isLink, setIsLink] = useState(false);
  useSubscribe("showTextToolbar", (event) => {
    setIsEnabled(true);
    setIsBold(event.isBold);
    setIsItalic(event.isItalic);
    setIsLink(event.isLink);
  });
  useSubscribe("hideTextToolbar", () => {
    setIsEnabled(false);
  });

  return (
    <div>
      <button
        disabled={isEnabled === false}
        style={{ fontWeight: isBold ? "bold" : "normal" }}
        onClick={() => publish({ type: "formatTextToolbar", payload: "bold" })}
      >
        Bold
      </button>
      <button
        disabled={isEnabled === false}
        style={{ fontWeight: isItalic ? "bold" : "normal" }}
        onClick={() =>
          publish({ type: "formatTextToolbar", payload: "italic" })
        }
      >
        Italic
      </button>
      <button
        disabled={isEnabled === false}
        style={{ fontWeight: isLink ? "bold" : "normal" }}
        onClick={() => publish({ type: "formatTextToolbar", payload: "link" })}
      >
        Link
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
          instance={createInstance({
            component: "TextBlock",
            children: [
              "Pragraph you can edit ",
              createInstance({
                component: "Bold",
                children: ["very bold text "],
              }),
              createInstance({
                component: "Bold",
                children: [
                  createInstance({
                    component: "Italic",
                    children: ["with small italic"],
                  }),
                ],
              }),
              createInstance({
                component: "Bold",
                children: [" subtext"],
              }),
            ],
          })}
          contentEditable={<ContentEditable />}
          onChange={onChange}
        />
      </Box>
    </div>
  );
};

Basic.args = {
  onChange: action("onChange"),
};
