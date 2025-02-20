import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import type { StoryFn, Meta } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { Box, Button, Flex } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import type { Instance, Instances } from "@webstudio-is/sdk";
import { $, renderData } from "@webstudio-is/template";
import {
  $instances,
  $pages,
  $registeredComponentMetas,
  $textEditingInstanceSelector,
  $textToolbar,
} from "~/shared/nano-states";
import { TextEditor } from "./text-editor";
import { emitCommand, subscribeCommands } from "~/canvas/shared/commands";
import { $awareness } from "~/shared/awareness";

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
    { type: "text", value: "Paragraph you can edit Blabla " },
    { type: "id", value: "2" },
    { type: "id", value: "3" },
    { type: "id", value: "5" },
  ]),
  createInstancePair("2", "Bold", [
    { type: "text", value: "Very Very very bold text " },
  ]),
  createInstancePair("3", "Bold", [{ type: "id", value: "4" }]),
  createInstancePair("4", "Italic", [
    { type: "text", value: "And Bold Small with small italic" },
  ]),
  createInstancePair("5", "Bold", [
    { type: "text", value: " la la la subtext" },
  ]),
]);

export const Basic: StoryFn<typeof TextEditor> = ({ onChange }) => {
  const state = useStore($textToolbar);

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
          rootInstanceSelector={["1"]}
          instances={instances}
          contentEditable={<ContentEditable />}
          onChange={onChange}
          onSelectInstance={(instanceId) =>
            console.info("select instance", instanceId)
          }
        />
      </Box>
    </div>
  );
};

export const CursorPositioning: StoryFn<typeof TextEditor> = ({ onChange }) => {
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);

  return (
    <>
      <Box
        css={{
          width: 300,
          "& > div": {
            padding: 40,
            backgroundColor: textEditingInstanceSelector
              ? "unset"
              : "rgba(0,0,0,0.1)",
          },
          border: "1px solid #999",
          color: "black",
          " *": {
            outline: "none",
          },
        }}
        onClick={(event) => {
          if (textEditingInstanceSelector !== undefined) {
            return;
          }
          $textEditingInstanceSelector.set({
            selector: ["1"],
            reason: "click",
            mouseX: event.clientX,
            mouseY: event.clientY,
          });
        }}
      >
        {textEditingInstanceSelector && (
          <TextEditor
            rootInstanceSelector={["1"]}
            instances={instances}
            contentEditable={<ContentEditable />}
            onChange={onChange}
            onSelectInstance={(instanceId) =>
              console.info("select instance", instanceId)
            }
          />
        )}

        {!textEditingInstanceSelector && (
          <div>
            <span>Paragraph you can edit Blabla </span>
            <strong>Very Very very bold text </strong>
            <strong>
              <i>And Bold Small with small italic</i>
            </strong>
            <strong> la la la subtext</strong>
          </div>
        )}
      </Box>
      <br />
      <div>
        <i>Click on text above, see cursor position and start editing text</i>
      </div>
      {textEditingInstanceSelector && (
        <Button
          onClick={() => {
            $textEditingInstanceSelector.set(undefined);
          }}
        >
          Reset
        </Button>
      )}
    </>
  );
};

export const CursorPositioningUpDown: StoryFn<typeof TextEditor> = () => {
  const [{ instances }, setState] = useState(() => {
    $pages.set({
      folders: [],
      homePage: {
        id: "homePageId",
        rootInstanceId: "bodyId",
        meta: {},
        path: "",
        title: "",
        name: "",
      },
      pages: [
        {
          id: "pageId",
          rootInstanceId: "bodyId",
          path: "",
          title: "",
          name: "",
          meta: {},
        },
      ],
    });

    $awareness.set({ pageId: "pageId" });

    $registeredComponentMetas.set(
      new Map([
        [
          "Box",
          {
            type: "container",
            icon: "icon",
          },
        ],
        [
          "Bold",
          {
            type: "rich-text-child",
            icon: "icon",
          },
        ],
      ])
    );

    return renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxAId">
          Hello world <$.Bold ws:id="boldA">Hello world</$.Bold> Hello world
          world Hello worldsdsdj skdk ls dk jslkdjklsjdkl sdk jskdj ksjd lksdj
          dsj
        </$.Box>
        <$.Box ws:id="boxBId">
          Let it be Let it be <$.Bold ws:id="boldB">Let it be Let</$.Bold> Let
          it be Let it be Let it be Let it be Let it be Let it be
        </$.Box>
      </$.Body>
    );
  });

  useEffect(() => {
    $instances.set(instances);
  }, [instances]);

  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);

  return (
    <>
      <Flex
        gap={2}
        direction={"column"}
        css={{
          width: 500,
          "& > div > div": {
            padding: 5,
            border: "1px solid #999",
          },
          "& *[aria-readonly]": {
            backgroundColor: "rgba(0,0,0,0.02)",
          },
          "& strong": {
            fontSize: "1.5em",
          },

          color: "black",
          " *": {
            outline: "none",
          },
        }}
      >
        <div style={{ display: "contents" }} data-ws-selector="boxAId,bodyId">
          <TextEditor
            key={textEditingInstanceSelector?.selector[0] ?? ""}
            editable={
              textEditingInstanceSelector === undefined ||
              textEditingInstanceSelector?.selector[0] === "boxAId"
            }
            rootInstanceSelector={["boxAId", "bodyId"]}
            instances={instances}
            contentEditable={<ContentEditable />}
            onChange={(data) => {
              setState((prev) => {
                for (const instance of data) {
                  prev.instances.set(instance.id, instance);
                }
                return prev;
              });
            }}
            onSelectInstance={(instanceId) =>
              console.info("select instance", instanceId)
            }
          />
        </div>

        <div
          style={{ display: "contents" }}
          data-ws-selector="boxBId,bodyId"
          data-ws-collapsed="true"
        >
          <TextEditor
            key={textEditingInstanceSelector?.selector[0] ?? ""}
            editable={textEditingInstanceSelector?.selector[0] === "boxBId"}
            rootInstanceSelector={["boxBId", "bodyId"]}
            instances={instances}
            contentEditable={<ContentEditable />}
            onChange={(data) => {
              setState((prev) => {
                for (const instance of data) {
                  prev.instances.set(instance.id, instance);
                }
                return prev;
              });
            }}
            onSelectInstance={(instanceId) =>
              console.info("select instance", instanceId)
            }
          />
        </div>
      </Flex>
      <br />
      <i>Use arrows to move between editors, clicks are not working</i>
    </>
  );
};

Basic.args = {
  onChange: action("onChange"),
};

CursorPositioning.args = {
  onChange: action("onChange"),
};
