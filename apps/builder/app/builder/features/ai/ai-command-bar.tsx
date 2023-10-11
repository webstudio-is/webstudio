import { useStore } from "@nanostores/react";
import {
  AutogrowTextArea,
  Box,
  Button,
  CommandBar,
  CommandBarButton,
  CommandBarContentPrompt,
  CommandBarContentSection,
  CommandBarContentSeparator,
  CommandBarTrigger,
  Flex,
  Grid,
  ScrollArea,
  Text,
  Tooltip,
  theme,
  toast,
  useDisableCanvasPointerEvents,
} from "@webstudio-is/design-system";
import {
  AiIcon,
  MicIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  StopIcon,
  LargeXIcon,
} from "@webstudio-is/icons";
import { useEffect, useRef, useState } from "react";
import { $isAiCommandBarVisible } from "~/shared/nano-states";
import { useMediaRecorder } from "./hooks/media-recorder";
import { useLongPressToggle } from "./hooks/long-press-toggle";
import { AiCommandBarButton } from "./ai-button";
import { fetchTranscription } from "./ai-fetch-transcription";
import { fetchResult } from "./ai-fetch-result";

type Status = "idle" | "recording" | "transcribing" | "ai";

export const AiCommandBar = () => {
  const isAiCommandBarVisible = useStore($isAiCommandBarVisible);
  const [open, setOpen] = useState<boolean>(false);

  const [status, setStatus] = useState<Status>("idle");
  const abortController = useRef<AbortController>();

  const [prompt, setPrompt] = useState<string>("");
  const [promptsHistory, setPromptsHistory] = useState<string[]>([]);

  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  const { start, stop, cancel, state } = useMediaRecorder({
    onComplete: async (file) => {
      abortController.current?.abort();
      abortController.current = new AbortController();
      setStatus("transcribing");
      try {
        const prompt = await fetchTranscription(
          file,
          abortController.current.signal
        );
        setPrompt(prompt);
        handleAiRequest(prompt);
      } catch (error) {
        if (abortController.current.signal.aborted === false) {
          toast("Something went wrong.");
        }
        abortController.current = undefined;
        setStatus("idle");
      }
    },
    onReportSoundAmplitude: (amplitude) => {
      recordButtonRef.current?.style.setProperty(
        "--ws-ai-command-bar-amplitude",
        amplitude.toString()
      );
    },
  });

  useEffect(() => {
    if (state === "recording") {
      setStatus("recording");
    } else {
      setStatus("idle");
    }
  }, [state]);

  const recordButtonProps = useLongPressToggle({
    onStart: () => {
      start();
      disableCanvasPointerEvents();
    },
    onEnd: () => {
      stop();
      enableCanvasPointerEvents();
    },
    onCancel: () => {
      cancel();
      enableCanvasPointerEvents();
    },
  });

  const handleAiRequest = async (prompt: string) => {
    abortController.current?.abort();
    abortController.current = new AbortController();
    setStatus("ai");

    try {
      const errors = await fetchResult(prompt, abortController.current.signal);

      if (errors.length > 0) {
        toast(errors.join("\n"));
      } else {
        setPrompt("");
        setPromptsHistory((history) => [...history, prompt]);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast(error.message);
      } else {
        toast("Something went wrong");
      }
    }
    abortController.current = undefined;
    setStatus("idle");
  };

  if (isAiCommandBarVisible === false) {
    return;
  }

  return (
    <Box
      css={{
        position: "absolute",
        bottom: theme.spacing[11],
        left: 0,
        right: 0,
        height: 0,
        justifyContent: "center",
        alignItems: "flex-end",
        display: "flex",
      }}
    >
      <CommandBar
        open={open}
        onOpenChange={setOpen}
        content={<CommandBarContent prompts={promptsHistory} />}
      >
        <CommandBarTrigger>
          <CommandBarButton color="dark-ghost">
            <ChevronUpIcon />
          </CommandBarButton>
        </CommandBarTrigger>

        <Grid
          css={{
            alignSelf: "center",
            // color: theme.colors.foregroundContrastMain,
            // Set maxWidth to autogrow in width
            width: theme.spacing[31],
          }}
        >
          <ScrollArea css={{ maxHeight: theme.spacing[29] }}>
            <AutogrowTextArea
              autoFocus
              disabled={status !== "idle"}
              placeholder={
                status === "recording"
                  ? "Recording..."
                  : status === "transcribing"
                  ? "Transcribing recording..."
                  : "Enter value..."
              }
              value={prompt}
              onChange={setPrompt}
              onKeyPress={(event) => {
                if (event.key === "Enter" && event.shiftKey === false) {
                  event.preventDefault();
                  handleAiRequest(prompt);
                }
              }}
            />
          </ScrollArea>
        </Grid>

        {/* Record button */}
        {(status === "idle" || status === "recording") && (
          <Tooltip
            side="top"
            sideOffset={10}
            delayDuration={100}
            content={status === "idle" ? "Start recording" : "Stop recording"}
          >
            <CommandBarButton
              ref={recordButtonRef}
              css={{
                "--ws-ai-command-bar-amplitude": 0,
                opacity:
                  "calc(1 - 0.5 * var(--ws-ai-command-bar-amplitude, 0))",
                transition: "opacity 0.1s ease-in-out",
              }}
              color={status === "idle" ? "dark-ghost" : "destructive"}
              {...recordButtonProps}
            >
              {status === "idle" ? <MicIcon /> : <StopIcon />}
            </CommandBarButton>
          </Tooltip>
        )}

        {/* Abort button */}
        {(status === "ai" || status === "transcribing") && (
          <Tooltip
            side="top"
            sideOffset={10}
            delayDuration={100}
            content="Cancel"
          >
            <CommandBarButton
              ref={recordButtonRef}
              css={{
                "--ws-ai-command-bar-amplitude": 0,
                opacity:
                  "calc(1 - 0.5 * var(--ws-ai-command-bar-amplitude, 0))",
                transition: "opacity 0.1s ease-in-out",
              }}
              color="neutral"
              onClick={(event) => {
                abortController.current?.abort();
              }}
            >
              <LargeXIcon />
            </CommandBarButton>
          </Tooltip>
        )}

        <Tooltip
          side="top"
          sideOffset={10}
          delayDuration={0}
          content={status === "idle" && prompt !== "" ? "Go" : undefined}
        >
          <AiCommandBarButton
            color="gradient"
            data-pending={status === "ai"}
            disabled={status !== "idle" || prompt === ""}
            onClick={() => {
              handleAiRequest(prompt);
            }}
          >
            <AiIcon />
          </AiCommandBarButton>
        </Tooltip>
      </CommandBar>
    </Box>
  );
};

const CommandBarContent = (props: { prompts: string[] }) => {
  const shortcutText = "⌘⇧Q";
  return (
    <>
      <CommandBarContentSection>
        <Flex justify={"between"}>
          <Text
            variant={"labelsSentenceCase"}
            color={"subtle"}
            css={{ visibility: "hidden" }}
          >
            {shortcutText}
          </Text>
          <Text variant={"labelsSentenceCase"} align={"center"}>
            Welcome to Webstudio AI alpha!
          </Text>
          <Text variant={"labelsSentenceCase"} color={"subtle"}>
            {shortcutText}
          </Text>
        </Flex>
        <div />
        <Text variant={"labelsSentenceCase"}>
          Ask me to generate or edit sections, text, or images.
          <br />
          For example you can say: ”Make a new contact section”
        </Text>
        {/* @todo: change color on theme when available */}
        <Text variant={"labelsSentenceCase"} css={{ color: "#828486" }}>
          Powered by ChatGPT - By using Webstudio AI, you consent to OpenAI
          storing interactions without personal data.
        </Text>
        <div />
        <Button color="dark" suffix={<ExternalLinkIcon />}>
          Learn more
        </Button>
      </CommandBarContentSection>

      <CommandBarContentSeparator />

      <CommandBarContentSection>
        <Text variant={"labelsSentenceCase"} align={"center"}>
          Previous prompts
        </Text>
        <div />
        <ScrollArea css={{ maxHeight: theme.spacing[29] }}>
          <Grid gap={2}>
            {props.prompts.map((prompt, index) => (
              <CommandBarContentPrompt key={index}>
                {prompt}
              </CommandBarContentPrompt>
            ))}
          </Grid>
        </ScrollArea>
      </CommandBarContentSection>
    </>
  );
};
