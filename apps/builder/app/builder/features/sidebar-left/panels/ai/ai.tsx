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
import { useState } from "react";
import type { Publish } from "~/shared/pubsub";
import { aiGenerationPath } from "~/shared/router-utils";
import { CloseButton, Header } from "../../header";
import type { TabName } from "../../types";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

type AIGenerationSteps = "instances" | "styles";
type AIGenerationState =
  | {
      state: "idle";
    }
  | {
      state: "generating";
      step: AIGenerationSteps;
    };
type AIGenerationResults = Array<any>;

const steps: AIGenerationSteps[] = ["instances", "styles"];
const labels = {
  instances: "components",
  styles: "styles",
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const [aiGenerationResults, setAiGenerationResults] =
    useState<AIGenerationResults>([]);
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

    const responses = [];

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

      if (!response.errors) {
        responses.push({ step, response: response[0][1] });
        i++;
      } else {
        // todo handle failures - perhaps use expontential backoff retry
        if (!window.confirm(`Something went wrong. Retry?`)) {
          setAiGenerationState({
            state: "idle",
          });
          return;
        }
      }
    }

    setAiGenerationResults((existingResults) => {
      return [
        Object.assign(...responses.map(({ response }) => response)),
        ...existingResults,
      ];
    });

    setAiGenerationState({
      state: "idle",
    });
  };

  if (aiGenerationResults.length) {
    console.log({ aiGenerationResults });
  }

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
        <Dialog title="AI" defaultOpen={true}>
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

const testInstances = {
  step: "instances",
  response: {
    instances: [
      {
        type: "instance",
        id: "instance-Box-1",
        component: "Box",
        children: [
          { type: "id", value: "instance-Box-2" },
          { type: "id", value: "instance-Box-3" },
        ],
      },
      {
        type: "instance",
        id: "instance-Box-2",
        component: "Box",
        children: [
          { type: "id", value: "instance-Heading-1" },
          { type: "id", value: "instance-Input-1" },
          { type: "id", value: "instance-TextArea-1" },
          { type: "id", value: "instance-Button-1" },
        ],
      },
      {
        type: "instance",
        id: "instance-Box-3",
        component: "Box",
        children: [
          { type: "id", value: "instance-Heading-2" },
          { type: "id", value: "instance-Input-2" },
          { type: "id", value: "instance-TextArea-2" },
          { type: "id", value: "instance-Button-2" },
        ],
      },
      {
        type: "instance",
        id: "instance-Heading-1",
        component: "Heading",
        label: "Column 1 Heading",
        children: [{ type: "text", value: "Column 1" }],
      },
      {
        type: "instance",
        id: "instance-Heading-2",
        component: "Heading",
        label: "Column 2 Heading",
        children: [{ type: "text", value: "Column 2" }],
      },
      {
        type: "instance",
        id: "instance-Input-1",
        component: "Input",
        label: "Column 1 Input",
        children: [],
      },
      {
        type: "instance",
        id: "instance-Input-2",
        component: "Input",
        label: "Column 2 Input",
        children: [],
      },
      {
        type: "instance",
        id: "instance-TextArea-1",
        component: "TextArea",
        label: "Column 1 Text Area",
        children: [],
      },
      {
        type: "instance",
        id: "instance-TextArea-2",
        component: "TextArea",
        label: "Column 2 Text Area",
        children: [],
      },
      {
        type: "instance",
        id: "instance-Button-1",
        component: "Button",
        label: "Column 1 Button",
        children: [{ type: "text", value: "Submit" }],
      },
      {
        type: "instance",
        id: "instance-Button-2",
        component: "Button",
        label: "Column 2 Button",
        children: [{ type: "text", value: "Submit" }],
      },
    ],
  },
};
