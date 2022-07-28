import {
  type ChildrenUpdates,
  publish,
  useAllUserProps,
  type Instance,
} from "@webstudio-is/react-sdk";
import { createInstance } from "~/shared/tree-utils";
import { Box, Button } from "@webstudio-is/design-system";
import { LexicalComposer, ContentEditable } from "./lexical";
import { TreeViewPlugin } from "./plugins/tree-view-plugin";
import { config } from "./config";
import { Editor } from "./editor";

type ExampleTextEditorProps = {
  onChange: (state: ChildrenUpdates) => void;
};

const Menu = () => {
  const [, setAllUserProps] = useAllUserProps();
  return (
    <Box
      css={{
        margin: "$2",
        display: "flex",
        gap: "$2",
      }}
    >
      <Button
        onClick={() => {
          publish({
            type: "insertInlineInstance",
            payload: createInstance({ component: "Bold" }),
          });
        }}
      >
        Bold
      </Button>
      <Button
        onClick={() => {
          publish({
            type: "insertInlineInstance",
            payload: createInstance({ component: "Italic" }),
          });
        }}
      >
        Italic
      </Button>
      <Button
        onClick={() => {
          const instance = createInstance({ component: "Link" });
          publish({
            type: "insertInlineInstance",
            payload: instance,
          });
          const url = prompt("Enter url");
          if (url === null) return;
          setAllUserProps({
            [instance.id]: {
              id: "1",
              instanceId: instance.id,
              treeId: "3",
              props: [
                {
                  id: "4",
                  prop: "href",
                  value: url,
                },
              ],
            },
          });
        }}
      >
        Link
      </Button>
    </Box>
  );
};

export const ExampleTextEditor = ({ onChange }: ExampleTextEditorProps) => {
  return (
    <>
      <Menu />
      <LexicalComposer initialConfig={config}>
        <Box
          css={{
            background: "#fff",
            borderRadius: 2,
            maxWidth: 600,
            color: "#000",
            position: "relative",
            lineHeight: 1.5,
            fontWeight: 400,
            textAlign: "left",
            borderTopLeftRadius: "$3",
            borderTopRightRadius: "$3",
            overflow: "hidden",
            "& p": {
              margin: 0,
            },
          }}
        >
          <Editor
            editable={
              <ContentEditable
                style={{
                  minHeight: 150,
                  resize: "none",
                  fontSize: "1em",
                  position: "relative",
                  tabSize: 1,
                  outline: 0,
                  padding: "15px 10px",
                  caretColor: "#444",
                  background: "#eee",
                }}
              />
            }
            instance={
              {
                component: "Paragraph",
                id: "62bd56ad8f5562223cb85cc2",
                cssRules: [],
                children: [
                  "Pragraph you can edit ",
                  {
                    component: "Bold",
                    id: "62bd56ad8f5562223cb85cc2",
                    cssRules: [],
                    children: ["bold"],
                  },
                ],
              } as Instance
            }
            onChange={onChange}
          />
          <TreeViewPlugin />
        </Box>
      </LexicalComposer>
    </>
  );
};
