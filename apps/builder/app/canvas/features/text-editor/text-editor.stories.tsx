import { useState } from "react";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { Box } from "@webstudio-is/design-system";
import { useSubscribe, publish } from "~/shared/pubsub";
import type { TextToolbarState } from "~/builder/shared/nano-states";
import { TextEditor } from "./text-editor";
import { theme } from "@webstudio-is/design-system";
import type {
  Instance,
  Instances,
  InstancesItem,
} from "@webstudio-is/project-build";

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

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: InstancesItem["children"]
): [Instance["id"], InstancesItem] => {
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
  createInstancePair("1", "TextBlock", [
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
        onClick={(event) => {
          event.preventDefault();
          setFormat("bold");
        }}
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
            padding: `0 ${theme.spacing[5]}`,
            border: "1px solid #999",
            color: "black",
          },
        }}
      >
        <TextEditor
          rootInstanceId={"1"}
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
