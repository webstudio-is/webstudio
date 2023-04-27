import {
  Button,
  Dialog,
  DialogContent,
  Flex,
  Label,
  Progress,
  TextArea,
  theme,
} from "@webstudio-is/design-system";

import { EyeconOpenIcon } from "@webstudio-is/icons";
import { useEffect, useState } from "react";
import type { Publish } from "~/shared/pubsub";
import { aiGenerationPath } from "~/shared/router-utils";
import { CloseButton, Header } from "../../header";
import type { TabName } from "../../types";

import type { Instance, PropsList } from "@webstudio-is/project-build";
import type { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { generateDataFromEmbedTemplate } from "@webstudio-is/react-sdk";
import { insertInstances } from "~/shared/instance-utils";
import {
  instancesStore,
  selectedInstanceSelectorStore,
  selectedPageStore,
} from "~/shared/nano-states";
import {
  findClosestDroppableTarget,
  type InstanceSelector,
} from "~/shared/tree-utils";

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
type AIGenerationResponse =
  | { step: "instances"; response: EmbedTemplateInstance }
  | { step: "styles"; response: any }
  | { step: "props"; response: PropsList };

type AIGenerationResponses = Array<AIGenerationResponse>;

type AIGenerationSteps = AIGenerationResponse["step"];
// "instances" | "styles" | "props";

const steps: AIGenerationSteps[] = ["instances"];
const labels = {
  instances: "components",
  styles: "styles",
};

const insertTemplate = (template: WsEmbedTemplate) => {
  const { instances, children, props } =
    generateDataFromEmbedTemplate(template);

  const selectedPage = selectedPageStore.get();
  if (selectedPage === undefined) {
    return;
  }
  const dropTarget = findClosestDroppableTarget(
    instancesStore.get(),
    // fallback to root as drop target
    selectedInstanceSelectorStore.get() ?? [selectedPage.rootInstanceId]
  );

  insertInstances(instances, props, dropTarget);
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const [aiGenerationResponses, setAiGenerationResponses] =
    useState<WsEmbedTemplate>([]);
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

    const responses: AIGenerationResponses = [];

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

      if (!response.errors && step === response[0][0]) {
        responses.push({ step, response: response[0][1] });
        i++;
      } else {
        // @todo handle failures - perhaps use expontential backoff retry
        if (!window.confirm(`Something went wrong. Retry?`)) {
          setAiGenerationState({
            state: "idle",
          });
          return;
        }
      }
    }

    const template = responses.flatMap(({ step, response }) => response);

    insertTemplate(template);

    setAiGenerationResponses((existingResponses) => {
      return [template, ...existingResponses];
    });

    setAiGenerationState({
      state: "idle",
    });
  };

  if (aiGenerationResponses.length) {
    console.log({ aiGenerationResponses });
  }

  // useEffect(() => {
  //   insertTemplate(testInstances);
  // }, []);

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
        <Flex
          gap="2"
          wrap="wrap"
          css={{ p: theme.spacing[9], overflow: "auto" }}
        >
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
          <DialogContent>
            <Flex
              gap="2"
              css={{ flexDirection: "column", p: theme.spacing[9] }}
            >
              <p>Generating {labels[aiGenerationState.step]}...</p>
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

const testInstances = [
  {
    type: "instance",
    component: "Box",
    children: [
      {
        type: "instance",
        component: "Box",
        children: [],
      },
      {
        type: "instance",
        component: "Box",
        children: [],
      },
    ],
  },
];
