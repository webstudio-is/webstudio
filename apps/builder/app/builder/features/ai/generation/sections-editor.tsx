import {
  request,
  templateGenerator,
  type ErrorResponse,
} from "@webstudio-is/ai";
import {
  Box,
  theme,
  Button,
  InputField,
  TextArea,
  Text,
} from "@webstudio-is/design-system";
import { CheckCircleIcon, SpinnerIcon } from "@webstudio-is/icons";
import type { FormEventHandler } from "react";
import { registeredComponentMetasStore } from "~/shared/nano-states";
import { restAiTemplateGenerator } from "~/shared/router-utils";
import type { GenerationState, Section, SectionId } from "./types";

/**
 * The SectionsGeneration component
 */

// This helper makes an API call to generate a section.
const generate = ({
  name,
  description,
  signal,
}: {
  name: string;
  description: string;
  signal: AbortSignal;
}) => {
  const metas = registeredComponentMetasStore.get();
  const exclude = ["Body", "Slot"];

  const components = [...metas.keys()].filter(
    (name) => !exclude.includes(name)
  );

  return request<templateGenerator.Response>(
    [
      restAiTemplateGenerator(),
      {
        method: "POST",
        body: JSON.stringify({
          prompt: `${name}\n\n${description}`,
          components,
        }),
        signal,
      },
    ],
    { retry: 2 }
  );
};

// Handles form submission for a generation request.
const handleSubmit = async (
  event: React.FormEvent<HTMLFormElement>,
  signal: AbortSignal
) => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const name = formData.get("name");
  const description = formData.get("description");

  if (typeof name === "string" && typeof description === "string") {
    return generate({ name, description, signal });
  }

  return {
    success: false,
    type: "invalidInput",
    status: 500,
    message: "Missing parameters",
  } as ErrorResponse;
};

type OnInput = (
  id: SectionId,
  key: "name" | "description",
  value: string
) => void;

export const SectionsEditor = ({
  sections,
  onInput,
  onStateChange,
}: {
  sections: [SectionId, Section][];
  onInput: OnInput;
  onStateChange: (id: SectionId, state: GenerationState) => void;
}) => {
  const showGenerateAll =
    sections.filter(([id, { state }]) => state.status !== "done").length > 1;

  const pendingAllSection =
    sections.length > 0
      ? sections.find(([id, { state }]) => state.status === "pendingAll")
      : undefined;

  return (
    <Box>
      {showGenerateAll ? (
        <Box
          css={{
            marginTop: theme.spacing[10],
            marginBottom: theme.spacing[10],
          }}
        >
          {pendingAllSection === undefined ? (
            <Button
              onClick={() => {
                const abortController = new AbortController();

                sections.forEach(
                  ([id, { name, description, state }], index) => {
                    if (state.status === "done") {
                      return;
                    }
                    generate({
                      name,
                      description,
                      signal: abortController.signal,
                    })
                      .then((result) => {
                        if (result.success) {
                          onStateChange(id, {
                            status: "done",
                            data: result.data,
                            index,
                          });
                        } else if (result.type === "aborted") {
                          onStateChange(id, {
                            status: "idle",
                          });
                        } else {
                          onStateChange(id, {
                            status: "error",
                            message: result.message,
                          });
                        }

                        return result;
                      })
                      .catch((error) => {
                        onStateChange(id, {
                          status: "error",
                          message: "Something went wrong",
                        });
                        return {
                          success: false,
                          type: "genericError",
                          status: 500,
                          message: "Something went wrong",
                        } as ErrorResponse;
                      });

                    onStateChange(id, {
                      status: "pendingAll",
                      abortController,
                    });
                  }
                );
              }}
            >
              Generate All
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (pendingAllSection[1].state.status === "pendingAll") {
                  pendingAllSection[1].state.abortController.abort();
                }
              }}
            >
              Stop
            </Button>
          )}
        </Box>
      ) : null}

      {sections.map(([id, { name, description, state }], index) => {
        const key = id;

        if (state.status === "done") {
          return (
            <Box key={key} css={{ marginBottom: theme.spacing[10] }}>
              <CheckCircleIcon /> {name}
            </Box>
          );
        }

        if (state.status === "pending") {
          return (
            <Box key={key} css={{ marginBottom: theme.spacing[10] }}>
              <SpinnerIcon /> {name}{" "}
              <Button
                onClick={() => {
                  state.abortController.abort();
                }}
              >
                Stop
              </Button>
            </Box>
          );
        }

        if (state.status === "pendingAll") {
          return (
            <Box key={key} css={{ marginBottom: theme.spacing[10] }}>
              <SpinnerIcon /> {name}
            </Box>
          );
        }

        return (
          <Box key={key} css={{ marginBottom: theme.spacing[10] }}>
            <Section
              id={id}
              name={name}
              description={description}
              onInput={onInput}
              onSubmit={(event) => {
                const abortController = new AbortController();

                handleSubmit(event, abortController.signal)
                  .then((result) => {
                    if (result.success) {
                      onStateChange(id, {
                        status: "done",
                        data: result.data,
                        index,
                      });
                    } else if (result.type === "aborted") {
                      onStateChange(id, {
                        status: "idle",
                      });
                    } else {
                      onStateChange(id, {
                        status: "error",
                        message: result.message,
                      });
                    }

                    return result;
                  })
                  .catch((error) => {
                    onStateChange(id, {
                      status: "error",
                      message: "Something went wrong",
                    });
                    return {
                      success: false,
                      type: "genericError",
                      status: 500,
                      message: "Something went wrong",
                    } as ErrorResponse;
                  });

                onStateChange(id, {
                  status: "pending",
                  abortController,
                });
              }}
            />
            {state.status === "error" ? <Text>{state.message}</Text> : null}
          </Box>
        );
      })}
    </Box>
  );
};

const Section = ({
  id,
  name,
  description,
  onInput,
  onSubmit,
}: Omit<Section, "state"> & {
  id: SectionId;
  onInput: OnInput;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) => {
  return (
    <form method="POST" action={restAiTemplateGenerator()} onSubmit={onSubmit}>
      <InputField
        type="text"
        name="name"
        value={name}
        placeholder="name"
        css={{ fontWeight: "bold" }}
        onChange={(event) => {
          onInput(id, "name", event.target.value);
        }}
      />
      <TextArea
        name="description"
        value={description}
        placeholder="description"
        onChange={(event) => {
          onInput(id, "description", event.target.value);
        }}
      />
      <Button>Generate</Button>
    </form>
  );
};
