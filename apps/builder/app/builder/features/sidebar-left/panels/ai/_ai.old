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
  breakpointsStore,
  instancesStore,
  registeredComponentMetasStore,
  rootInstanceStore,
  selectedInstanceSelectorStore,
  selectedInstanceStore,
  styleSourceSelectionsStore,
  stylesStore,
} from "~/shared/nano-states";

import { EyeconOpenIcon } from "@webstudio-is/icons";
import { useState } from "react";
import type { Publish } from "~/shared/pubsub";
import { aiGenerationPath } from "~/shared/router-utils";
import { CloseButton, Header } from "../../header";
import type { TabName } from "../../types";

import {
  generateCssText,
  type EmbedTemplateProp,
  type EmbedTemplateStyleDecl,
  type WsEmbedTemplate,
} from "@webstudio-is/react-sdk";

import {
  deleteInstance,
  findClosestDroppableTarget,
  findSelectedInstance,
  insertTemplate,
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
type AIGenerationResponse =
  | { step: "instances"; response: { json: WsEmbedTemplate; code: string } }
  | { step: "styles"; response: { json: EmbedTemplateStyles[]; code: string } }
  | { step: "props"; response: { json: EmbedTemplateProps[]; code: string } };

type AIGenerationResponses = Array<AIGenerationResponse>;

type AIGenerationSteps = AIGenerationResponse["step"];

const labels: Record<AIGenerationSteps, string> = {
  instances: "components",
  styles: "styles",
  props: "components props",
};

const selectedInstanceToTemplateAndStyleSourceSelections =
  function selectedInstanceToTemplateAndStyleSourceSelections(
    instances = instancesStore.get(),
    selectedInstance = selectedInstanceStore.get() || rootInstanceStore.get(),
    styleSourceSelections = styleSourceSelectionsStore.get()
  ) {
    let jsx = "";
    const templateStyleSourceSelections = new Map();

    if (!selectedInstance) {
      return { template: {}, jsx, styleSourceSelections };
    }

    const processInstances = function processInstances(
      template: typeof selectedInstance
    ) {
      jsx += `<${template.component}`;

      if (styleSourceSelections.has(template.id)) {
        templateStyleSourceSelections.set(
          template.id,
          styleSourceSelections.get(template.id)
        );

        jsx += ` className="${template.id}"`;
      }

      jsx += `>`;

      template.children.map((child) => {
        if (child.type === "text") {
          jsx += child.value;
          return child;
        }
        const instanceId = child.value;
        const childInstance = instances.get(instanceId);
        return childInstance ? processInstances(childInstance) : undefined;
      });

      jsx += `</${template.component}>`;

      return template;
    };

    const template = processInstances(selectedInstance);

    return {
      template,
      jsx,
      styleSourceSelections: templateStyleSourceSelections,
    };
  };

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  // @todo Decide whether it makes sense to make "styles" optional
  // i.e. add a checkbox to tick if the user wants styles.
  const steps: AIGenerationSteps[] = ["instances", "styles"];
  const [aiGenerationState, setAiGenerationState] = useState<AIGenerationState>(
    { state: "idle" }
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (aiGenerationState.state !== "idle") {
      return;
    }
    // const selectedInstanceSelector = selectedInstanceSelectorStore.get();
    // console.log(selectedInstanceSelector);
    // console.log(
    //   findClosestDroppableTarget(
    //     instancesStore.get(),
    //     selectedInstanceSelector.slice(1),
    //     []
    //   )
    // );
    // console.log(findSelectedInstance());

    // return;

    const context = [];

    const form = event.currentTarget as HTMLFormElement;
    const baseData = new FormData(form);

    const submitter = event.submitter || document.activeElement;

    const isEdit =
      submitter && submitter.name === "_action"
        ? submitter.value === "edit"
        : false;

    baseData.append("_action", isEdit ? "edit" : "generate");

    if (isEdit) {
      const { jsx, styleSourceSelections } =
        selectedInstanceToTemplateAndStyleSourceSelections();

      const css = generateCssText(
        {
          assets: [],
          breakpoints: breakpointsStore.get().entries(),
          styles: stylesStore.get().entries(),
          styleSourceSelections: styleSourceSelections.entries(),
          componentMetas: new Map(),
        },
        {
          assetBaseUrl: "/",
          createSelector: ({ idAttribute, instanceId, state }) =>
            `.${instanceId}${state ?? ""}`,
        }
      )
        .replace(/\s\s+/g, " ")
        .replace(/\n/g, "");

      context.push(
        ...[jsx, css].map((content) => [
          {
            role: "assistant",
            content,
          },
        ])
      );
    }

    const responses: AIGenerationResponses = [
      // {
      //   step: "instances",
      //   response: exampleInstances,
      // },
    ];

    for (let i = 0; i < steps.length; ) {
      const step = steps[i];

      setAiGenerationState({
        state: "generating",
        step,
      });

      const formData = new FormData();

      for (const [key, value] of baseData.entries()) {
        formData.append(key, value);
      }

      formData.append("steps", step);

      if (responses.length > 0) {
        // Send previous response for context.
        const message = {
          role: "assistant",
          content: JSON.stringify(responses[i - 1].response.code),
        };
        if (Array.isArray(context[i])) {
          context[i].push(message);
        } else {
          context[i] = [message];
        }

        // formData.append(
        //   "messages",
        //   JSON.stringify([
        //     {
        //       role: "assistant",
        //       content: JSON.stringify(responses[i - 1].response.code),
        //     },
        //   ])
        // );
      }

      if (Array.isArray(context[i]) && context[i].length > 0) {
        formData.append("messages", JSON.stringify(context[i]));
      }

      const res = await fetch(form.action, {
        method: form.method,
        body: formData,
      });

      const response = await res.json();

      // @todo add abort logic if aiGenerationState.state is changed.

      if (!response.errors && step === response[0][0]) {
        responses.push({ step, response: response[0][1] });
        i++;
      } else {
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

    console.log({ template });

    if (isEdit) {
      const selectedInstanceSelector = selectedInstanceSelectorStore.get();

      if (selectedInstanceSelector && selectedInstanceSelector.length > 1) {
        const replacementDropTarget = findClosestDroppableTarget(
          registeredComponentMetasStore.get(),
          instancesStore.get(),
          selectedInstanceSelector.slice(1),
          []
        );
        if (replacementDropTarget) {
          deleteInstance(selectedInstanceSelector);
          insertTemplate(template, replacementDropTarget);
        }
      } else {
        const dropTarget = findSelectedInstance();
        dropTarget && insertTemplate(template, dropTarget);
      }
    } else {
      const dropTarget = findSelectedInstance();
      dropTarget && insertTemplate(template, dropTarget);
    }

    setAiGenerationState({
      state: "idle",
    });
  };

  const progress =
    aiGenerationState.state === "idle"
      ? 0
      : (steps.indexOf(aiGenerationState.step) * 100) / steps.length;

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
            <Box css={{ display: "flex", gap: theme.spacing[2] }}>
              <Button
                css={{ width: "100%" }}
                disabled={aiGenerationState.state !== "idle"}
                name="_action"
                value="edit"
                type="submit"
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
              <Text>🪄 Generating {labels[aiGenerationState.step]}...</Text>
              <progress value={progress} max="100" style={{ width: "100%" }}>
                {progress}%
              </progress>
            </Flex>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
};

export const icon = <EyeconOpenIcon />;
