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

import { EyeconOpenIcon } from "@webstudio-is/icons";
import { useState } from "react";
import type { Publish } from "~/shared/pubsub";
import { aiGenerationPath } from "~/shared/router-utils";
import { CloseButton, Header } from "../../header";
import type { TabName } from "../../types";

import type {
  EmbedTemplateProp,
  EmbedTemplateStyleDecl,
  WsEmbedTemplate,
} from "@webstudio-is/react-sdk";

import merge from "lodash.merge";
import { insertTemplate } from "~/shared/template-utils";

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
  | { step: "instances"; response: WsEmbedTemplate }
  | { step: "styles"; response: EmbedTemplateStyles[] }
  | { step: "props"; response: EmbedTemplateProps[] };

type AIGenerationResponses = Array<AIGenerationResponse>;

type AIGenerationSteps = AIGenerationResponse["step"];

const labels: Record<AIGenerationSteps, string> = {
  instances: "components",
  styles: "styles",
  props: "components props",
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  // @todo Decide whether it makes sense to make "styles" optional
  // i.e. add a checkbox to tick if the user wants styles.
  const steps: AIGenerationSteps[] = ["instances" /*, "styles"*/];
  const [aiGenerationState, setAiGenerationState] = useState<AIGenerationState>(
    { state: "idle" }
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (aiGenerationState.state !== "idle") {
      return;
    }

    const form = event.currentTarget as HTMLFormElement;
    const baseData = new FormData(form);

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
        formData.append(
          "messages",
          JSON.stringify([
            {
              role: "assistant",
              content: JSON.stringify(responses[i - 1].response),
            },
          ])
        );
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

    const template = [
      merge({}, ...responses.flatMap(({ step, response }) => response)),
    ];

    console.log({ template });

    insertTemplate(template);

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
              maxLength={280}
              required
              disabled={aiGenerationState.state !== "idle"}
            />
            <Button
              css={{ width: "100%" }}
              disabled={aiGenerationState.state !== "idle"}
            >
              Generate
            </Button>
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

const exampleInstances = [
  {
    type: "instance",
    component: "Box",
    children: [
      {
        type: "instance",
        component: "Link",
        children: [{ type: "text", value: "Home" }],
      },
      {
        type: "instance",
        component: "Link",
        children: [{ type: "text", value: "About" }],
      },
      {
        type: "instance",
        component: "Link",
        children: [{ type: "text", value: "Contact" }],
      },
    ],
  },
];
