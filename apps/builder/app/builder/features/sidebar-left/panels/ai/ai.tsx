import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Flex,
  Label,
  Text,
  TextArea,
  theme,
} from "@webstudio-is/design-system";

import {
  instancesStore,
  projectStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedInstanceStore,
} from "~/shared/nano-states";

import { EyeconOpenIcon } from "@webstudio-is/icons";
import { useMemo, useState } from "react";
import type { Publish } from "~/shared/pubsub";
import { aiGenerationPath } from "~/shared/router-utils";
import { CloseButton, Header } from "../../header";
import type { TabName } from "../../types";

import {
  type EmbedTemplateProp,
  type EmbedTemplateStyleDecl,
  type WsEmbedTemplate,
} from "@webstudio-is/react-sdk";

import { useStore } from "@nanostores/react";
import {
  deleteInstance,
  findClosestDroppableTarget,
  findSelectedInstance,
  insertTemplate,
  replaceTemplate,
} from "~/shared/instance-utils";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

type AIGenerationState =
  | {
      state: "idle";
    }
  | {
      state: "generating";
      step: AIGenerationSteps;
      progress: number;
    };

// @todo Rewrite the type definitions below
// so that when merged the result's type is correctly inferred as WsEmbedTemplate.
type EmbedTemplateStyles = {
  styles: EmbedTemplateStyleDecl[];
  children: EmbedTemplateStyles[];
};
type EmbedTemplateProps = {
  props: EmbedTemplateProp[];
  children: EmbedTemplateProps[];
};

type AIAction = "generate" | "edit";
type AIGenerateResponseType =
  | { step: "full"; response: { json: WsEmbedTemplate; code: string } }
  | { step: "instances"; response: { json: WsEmbedTemplate; code: string } }
  | { step: "styles"; response: { json: EmbedTemplateStyles[]; code: string } }
  | { step: "props"; response: { json: EmbedTemplateProps[]; code: string } };

type AIEditTweakResponseType = {
  step: "tweak";
  response: { json: WsEmbedTemplate; code: string };
};

type AIGenerationResponses = Array<
  AIGenerateResponseType | AIEditTweakResponseType
>;

type AIGenerationSteps = (
  | AIGenerateResponseType
  | AIEditTweakResponseType
)["step"];

const labels: Record<AIGenerationSteps, string> = {
  full: "Generating page",
  instances: "Generating content",
  styles: "Styling content",
  props: "Adding some functionality",
  tweak: "Tweaking",
};

const onAIComplete = {
  generateFull: (responses: AIGenerateResponseType[], instanceId: string) => {
    const template = responses[0].response.json;

    const selectedInstanceSelector = selectedInstanceSelectorStore.get();

    if (
      !selectedInstanceSelector ||
      selectedInstanceSelector[0] !== instanceId
    ) {
      throw new Error("Invalid selected instance");
    }

    const dropTarget = findClosestDroppableTarget(
      registeredComponentMetasStore.get(),
      instancesStore.get(),
      selectedInstanceSelector,
      []
    );

    if (dropTarget) {
      insertTemplate(template, dropTarget);
    } else {
      throw new Error("Invalid selected instance");
    }
  },
  generate: (responses: AIGenerateResponseType[], instanceId: string) => {
    const styles = responses[1].response.json;
    const template = JSON.parse(
      JSON.stringify(responses[0].response.json, function replacer(key, value) {
        if (value.styles) {
          value.styles = value.styles
            .flatMap((style) => {
              const className = style.property;
              return styles[className];
            })
            .filter(Boolean);
        }

        return value;
      })
    );

    const selectedInstanceSelector = selectedInstanceSelectorStore.get();

    if (
      !selectedInstanceSelector ||
      selectedInstanceSelector[0] !== instanceId
    ) {
      throw new Error("Invalid selected instance");
    }

    const dropTarget = findClosestDroppableTarget(
      registeredComponentMetasStore.get(),
      instancesStore.get(),
      selectedInstanceSelector,
      []
    );

    if (dropTarget) {
      insertTemplate(template, dropTarget);
    } else {
      throw new Error("Invalid selected instance");
    }
  },
  edit: (responses: AIEditTweakResponseType[], instanceId: string) => {
    const template = responses[0].response.json;

    const selectedInstanceSelector = selectedInstanceSelectorStore.get();

    if (
      !selectedInstanceSelector ||
      selectedInstanceSelector[0] !== instanceId
    ) {
      // eslint-disable-next-line no-console
      console.log("Invalid selected instance");
      return;
    }

    replaceTemplate(template, selectedInstanceSelector);
    // Replace an existing instance with the current one
    // const replacementDropTarget = findClosestDroppableTarget(
    //   registeredComponentMetasStore.get(),
    //   instancesStore.get(),
    //   selectedInstanceSelector,
    //   []
    // );

    // if (replacementDropTarget) {

    //   console.log({ replacementDropTarget });
    //   deleteInstance(selectedInstanceSelector);
    //   insertTemplate(template, replacementDropTarget);
    // }
  },
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  // @todo Decide whether it makes sense to make "styles" optional
  // i.e. add a checkbox to tick if the user wants styles.
  const [aiGenerationState, setAiGenerationState] = useState<AIGenerationState>(
    { state: "idle" }
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (aiGenerationState.state !== "idle") {
      return;
    }

    const context = [];

    const form = event.currentTarget as HTMLFormElement;
    const baseData = new FormData(form);

    const submitter = event.submitter || document.activeElement;

    const isEdit =
      submitter && submitter.name === "_action"
        ? submitter.value === "edit"
        : false;

    const action: AIAction = isEdit ? "edit" : "generate";
    baseData.append("_action", action);

    let instance = selectedInstanceStore.get();
    const project = projectStore.get();

    if (!instance || !project) {
      return;
    }

    baseData.append("instanceId", instance.id);
    baseData.append("projectId", project.id);

    const steps: AIGenerationSteps[] = isEdit
      ? ["tweak"]
      : ["instances", "styles"];
    // : ["full"];

    const responses: AIGenerationResponses = [];

    for (let i = 0; i < steps.length; ) {
      const step = steps[i];

      setAiGenerationState({
        state: "generating",
        step,
        progress: (steps.indexOf(step) * 100) / steps.length,
      });

      const formData = new FormData();

      for (const [key, value] of baseData.entries()) {
        formData.append(key, value);
      }

      formData.append("steps", step);

      if (responses.length > 0) {
        // Send previous response for context.
        const message = [
          "assistant",
          JSON.stringify(responses[i - 1].response.code),
        ];

        if (Array.isArray(context[i])) {
          context[i].push(message);
        } else {
          context[i] = [message];
        }
      }

      if (Array.isArray(context[i]) && context[i].length > 0) {
        context[i].forEach((message) => {
          formData.append("messages", JSON.stringify(message));
        });
      }

      const res = await fetch(form.action, {
        method: form.method,
        body: formData,
      });

      if (!res.ok) {
        if (!window.confirm(`Something went wrong. Retry?`)) {
          setAiGenerationState({
            state: "idle",
          });
          return;
        }
      }

      const response = await res.json();

      // @todo add abort logic if aiGenerationState.state is changed.

      if (!response.errors && step === response[0][0]) {
        responses.push({ step, response: response[0][1] });
        i++;
      } else {
        // eslint-disable-next-line no-console
        console.log(response.errors);
        // @todo Handle failures - perhaps use expontential backoff retry.
        if (!window.confirm(`Something went wrong. Retry?`)) {
          setAiGenerationState({
            state: "idle",
          });
          return;
        }
      }
    }

    const instanceId = instance.id;
    instance = selectedInstanceStore.get();
    // Make sure that the instance still exists.
    if (instance && instanceId === instance.id) {
      onAIComplete[action](responses, instanceId);
    }

    setAiGenerationState({
      state: "idle",
    });
  };

  const metas = useStore(registeredComponentMetasStore);

  const components = useMemo(() => {
    const exclude = ["Body", "Slot"];
    return JSON.stringify(
      [...metas.keys()].filter((name) => !exclude.includes(name))
    );
  }, [metas]);

  return (
    <>
      <Flex css={{ height: "100%", flexDirection: "column" }}>
        <Header
          title="AI Generation"
          suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
        />
        <Flex gap="2" wrap="wrap" css={{ p: theme.spacing[9] }}>
          <form
            method="POST"
            action={aiGenerationPath()}
            onSubmit={handleSubmit}
          >
            <Label htmlFor="ai-prompt">Prompt</Label>
            <TextArea
              name="prompt"
              id="ai-prompt"
              maxLength={1380}
              required
              disabled={aiGenerationState.state !== "idle"}
            />
            <Label htmlFor="ai-prompt-style">style</Label>
            <input
              type="text"
              name="style"
              id="ai-prompt-style"
              disabled={aiGenerationState.state !== "idle"}
            />
            <input type="hidden" name="components" value={components} />
            <Box css={{ display: "flex", gap: theme.spacing[2] }}>
              <Button
                css={{ width: "100%" }}
                disabled={aiGenerationState.state !== "idle"}
                name="_action"
                value="edit"
                type="submit"
                // onClick={(e) => {
                //   e.preventDefault();
                //   const instance = selectedInstanceStore.get();
                //   if (instance) {
                //     onAIComplete.edit(
                //       [
                //         {
                //           step: "tweak",
                //           response: { code: "", json: template },
                //         },
                //       ],
                //       instance.id
                //     );
                //   }
                // }}
              >
                Edit
              </Button>
              <Button
                css={{ width: "100%" }}
                disabled={aiGenerationState.state !== "idle"}
                name="_action"
                value="generate"
                type="submit"
              >
                Generate
              </Button>
            </Box>
          </form>
        </Flex>
      </Flex>
      {aiGenerationState.state !== "idle" ? (
        <Dialog defaultOpen={true}>
          <DialogContent
            // @todo Add ability to abort generation requests.
            onInteractOutside={(event) => {
              event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
            }}
          >
            <Flex
              gap="2"
              css={{ flexDirection: "column", p: theme.spacing[9] }}
            >
              <Text>🪄 {labels[aiGenerationState.step]}...</Text>
              <progress
                value={aiGenerationState.progress}
                max="100"
                style={{ width: "100%" }}
              >
                {aiGenerationState.progress}%
              </progress>
            </Flex>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
};

export const icon = <EyeconOpenIcon />;

// onClick={(e) => {
//   e.preventDefault();
//   const instance = selectedInstanceStore.get();
//   if (instance) {
//     onAIComplete.edit(
//       [
//         {
//           step: "tweak",
//           response: { code: "", json: template },
//         },
//       ],
//       instance.id
//     );
//   }
// }}
const template = [
  {
    type: "instance",
    component: "Heading",
    children: [
      {
        type: "text",
        value: "Welcome to Stripe",
      },
    ],
    styles: [
      {
        property: "fontSize",
        value: {
          type: "unit",
          unit: "px",
          value: 48,
        },
      },
      {
        property: "fontWeight",
        value: {
          type: "keyword",
          value: "bold",
        },
      },
      {
        property: "marginBottom",
        value: {
          type: "unit",
          unit: "px",
          value: 20,
        },
      },
      // {
      //   property: "color",
      //   value: {
      //     type: "rgb",
      //     alpha: 1,
      //     r: 255,
      //     g: 0,
      //     b: 0,
      //   },
      // },
      {
        property: "color",
        value: {
          type: "rgb",
          alpha: 1,
          r: 0,
          g: 0,
          b: 255,
        },
      },
    ],
  },
];
