import { request, type sections } from "@webstudio-is/ai";
import {
  Label,
  InputField,
  Button,
  Checkbox,
  Text,
} from "@webstudio-is/design-system";
import { useState, useRef } from "react";
import { restAiSections } from "~/shared/router-utils";

export const Prompt = ({
  onSections,
}: {
  onSections: (sections: sections.Sections | undefined) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (isLoading) {
          return;
        }

        const formData = new FormData(event.currentTarget);
        const prompt = formData.get("prompt");

        if (typeof prompt !== "string") {
          return;
        }

        const breakIntoSections = formData.get("break");
        if (breakIntoSections == null) {
          onSections({ section: prompt });
          return;
        }

        abort.current = new AbortController();
        setIsLoading(true);

        request<sections.Response>(
          [
            restAiSections(),
            {
              method: "POST",
              body: JSON.stringify({
                prompt,
              }),
              signal: abort.current.signal,
            },
          ],
          {
            retry: 2,
          }
        ).then((result) => {
          abort.current = null;

          if (result.success === true) {
            onSections(result.data);
          } else {
            alert("Something went wrong. " + result.message);
          }

          setIsLoading(false);
        });
      }}
    >
      <Label>
        Instructions
        <InputField
          type="text"
          name="prompt"
          defaultValue={`A vintige-inspired page for a Jazz festival in Austin Texas called "JazzJams" The page should use lots of background textures and shadows!`}
        />
      </Label>

      <Label css={{ display: "flex" }}>
        <Checkbox defaultChecked={true} name="break" />
        <Text>Break into sections</Text>
      </Label>

      <Button type="submit" disabled={isLoading}>
        Scaffold
      </Button>
    </form>
  );
};
