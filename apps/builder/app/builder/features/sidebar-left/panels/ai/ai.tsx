import {
  Button,
  Flex,
  Label,
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

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isGenerating) {
      return;
    }
    setIsGenerating(true);
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const response = await fetch(form.action, {
      method: form.method,
      body: formData,
    });

    const generated = await response.json();

    console.log({ generated });

    setIsGenerating(false);
  };

  return (
    <Flex css={{ height: "100%", flexDirection: "column" }}>
      <Header
        title="AI Generation"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <Flex gap="2" wrap="wrap" css={{ p: theme.spacing[9], overflow: "auto" }}>
        <form method="POST" action={aiGenerationPath()} onSubmit={handleSubmit}>
          <Label htmlFor="ai-prompt">Prompt</Label>
          <TextArea
            name="prompt"
            id="ai-prompt"
            maxLength={280}
            required
            disabled={isGenerating}
          />
          <Button css={{ width: "100%" }} disabled={isGenerating}>
            Generate
          </Button>
        </form>
      </Flex>
    </Flex>
  );
};

export const icon = <EyeconOpenIcon />;
