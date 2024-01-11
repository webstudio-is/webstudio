import { useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import type { StoryFn, Meta } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { Box } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import type { Instance, Instances } from "@webstudio-is/sdk";
import { $textToolbar } from "~/shared/nano-states";
import { TextEditor } from "./text-editor";
import { emitCommand, subscribeCommands } from "~/canvas/shared/commands";

export default {
  component: TextEditor,
  title: "Text Editor 2",
} satisfies Meta<typeof TextEditor>;

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): [Instance["id"], Instance] => {
  return [
    id,
    {
      type: "instance",
      id,
      component,
      children,
    },
  ];
};

const instances: Instances = new Map([
  createInstancePair("1", "Text", [
    { type: "text", value: "Paragraph you can edit " },
    { type: "id", value: "2" },
    { type: "id", value: "3" },
    { type: "id", value: "5" },
  ]),
  createInstancePair("2", "Bold", [{ type: "text", value: "very bold text " }]),
  createInstancePair("3", "Bold", [{ type: "id", value: "4" }]),
  createInstancePair("4", "Italic", [
    { type: "text", value: "with small italic" },
  ]),
  createInstancePair("5", "Bold", [{ type: "text", value: " subtext" }]),
]);

export const Basic: StoryFn<typeof TextEditor> = ({ onChange }) => {
  const state = useStore($textToolbar);
  const ref = useRef<null | HTMLDivElement>(null);

  useEffect(subscribeCommands, []);

  return (
    <div>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isBold ? "bold" : "normal" }}
        onClick={(event) => {
          event.preventDefault();
          emitCommand("formatBold");
        }}
      >
        Bold
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isItalic ? "bold" : "normal" }}
        onClick={() => emitCommand("formatItalic")}
      >
        Italic
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isSuperscript ? "bold" : "normal" }}
        onClick={() => emitCommand("formatSuperscript")}
      >
        Superscript
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isSubscript ? "bold" : "normal" }}
        onClick={() => emitCommand("formatSubscript")}
      >
        Subscript
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isLink ? "bold" : "normal" }}
        onClick={() => emitCommand("formatLink")}
      >
        Link
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: state?.isSpan ? "bold" : "normal" }}
        onClick={() => emitCommand("formatSpan")}
      >
        Span
      </button>
      <button
        disabled={state == null}
        style={{ fontWeight: "normal" }}
        onClick={() => emitCommand("formatClear")}
      >
        Clear
      </button>
      <Box
        css={{
          "& > div": {
            padding: `0 ${theme.spacing[5]}`,
            border: "1px solid #999",
            color: "black",
          },
        }}
      >
        <TextEditor
          rootRef={ref}
          rootInstanceSelector={["1"]}
          instances={instances}
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
