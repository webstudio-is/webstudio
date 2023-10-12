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
  AiLoadingIcon,
} from "@webstudio-is/icons";
import {
  useRef,
  useState,
  type MouseEvent,
  type ComponentPropsWithoutRef,
} from "react";
import { $isAiCommandBarVisible } from "~/shared/nano-states";
import { useMediaRecorder } from "./hooks/media-recorder";
import { useLongPressToggle } from "./hooks/long-press-toggle";
import { AiCommandBarButton } from "./ai-button";
import { fetchTranscription } from "./ai-fetch-transcription";
import { fetchResult } from "./ai-fetch-result";
import { useEffectEvent } from "./hooks/effect-event";

type PartialButtonProps<T = ComponentPropsWithoutRef<typeof Button>> = {
  [key in keyof T]?: T[key];
};

export const AiCommandBar = () => {
  const [value, setValue] = useState("");
  const [prompts, setPrompts] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [isAudioTranscribing, setIsAudioTranscribing] = useState(false);
  const [isAiRequesting, setIsAiRequesting] = useState(false);
  const abortController = useRef<AbortController>();
  const isAiCommandBarVisible = useStore($isAiCommandBarVisible);
  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const guardIdRef = useRef(0);
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  const getValue = useEffectEvent(() => {
    return value;
  });

  const {
    start,
    stop,
    cancel,
    state: mediaRecorderState,
  } = useMediaRecorder({
    onComplete: async (file) => {
      setIsAudioTranscribing(true);
      guardIdRef.current++;
      const guardId = guardIdRef.current;
      const text = await fetchTranscription(file);
      if (guardId !== guardIdRef.current) {
        return;
      }

      const currentValue = getValue();
      const newValue = `${currentValue} ${text}`;
      setValue(newValue);
      setIsAudioTranscribing(false);

      handleAiRequest(newValue);
    },
    onReportSoundAmplitude: (amplitude) => {
      recordButtonRef.current?.style.setProperty(
        "--ws-ai-command-bar-amplitude",
        amplitude.toString()
      );
    },
  });

  const longPressToggleProps = useLongPressToggle({
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
    abortController.current = new AbortController();
    setIsAiRequesting(true);
    guardIdRef.current++;
    const guardId = guardIdRef.current;

    // Skip Abort Logic for now
    try {
      const errors = await fetchResult(prompt, abortController.current.signal);

      if (guardId !== guardIdRef.current) {
        return;
      }

      if (errors.length > 0) {
        toast(errors.join("\n"));
      }

      setPrompts((previousPrompts) => [...previousPrompts, prompt]);

      setValue("");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      if (error instanceof Error) {
        toast(error.message);
      } else {
        toast("Something went wrong");
      }
    }
    abortController.current = undefined;
    setIsAiRequesting(false);
  };

  const handleAiButtonClick = () => {
    handleAiRequest(value);
  };

  if (isAiCommandBarVisible === false) {
    return;
  }

  let textAreaPlaceholder = "Enter value...";
  let textAreaValue = value;
  let textAreaDisabled = false;

  let recordButtonTooltipContent = undefined;
  let recordButtonColor: ComponentPropsWithoutRef<typeof Button>["color"] =
    "dark-ghost";
  let recordButtonProps: PartialButtonProps = longPressToggleProps;
  let recordButtonIcon = <MicIcon />;
  let recordButtonDisabled = false;

  let aiButtonDisabled = value.length === 0;
  let aiButtonTooltip: string | undefined = aiButtonDisabled
    ? undefined
    : "Generate AI results";
  let aiButtonPending = false;
  let aiIcon = <AiIcon />;

  if (isAudioTranscribing) {
    textAreaPlaceholder = "Transcribing voice...";
    // Show placeholder instead
    textAreaValue = "";
    textAreaDisabled = true;

    recordButtonDisabled = true;

    aiButtonTooltip = undefined;
    aiButtonDisabled = true;
  }

  if (mediaRecorderState === "recording") {
    textAreaPlaceholder = "Recording voice...";
    // Show placeholder instead
    textAreaValue = "";
    textAreaDisabled = true;
    aiButtonDisabled = true;

    recordButtonColor = "destructive";
    recordButtonIcon = <StopIcon />;

    aiButtonTooltip = undefined;
  }

  if (isAiRequesting) {
    textAreaDisabled = true;

    recordButtonTooltipContent = "Cancel";
    recordButtonColor = "neutral";
    recordButtonProps = {
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        // Cancel AI request
        guardIdRef.current++;
        setIsAiRequesting(false);
        abortController.current?.abort();
      },
    };
    recordButtonIcon = <LargeXIcon />;

    aiButtonTooltip = "Generating ...";
    aiButtonDisabled = true;
    aiButtonPending = true;
    aiIcon = <AiLoadingIcon />;
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
        content={<CommandBarContent prompts={prompts} />}
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
              disabled={textAreaDisabled}
              placeholder={textAreaPlaceholder}
              value={textAreaValue}
              onChange={setValue}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.shiftKey === false) {
                  event.preventDefault();
                  handleAiRequest(value);
                }
              }}
            />
          </ScrollArea>
        </Grid>

        <Tooltip
          side="top"
          sideOffset={10}
          delayDuration={100}
          content={recordButtonTooltipContent}
        >
          <AiCommandBarButton
            disabled={recordButtonDisabled}
            ref={recordButtonRef}
            css={{
              "--ws-ai-command-bar-amplitude": 0,
              opacity: "calc(1 - 0.5 * var(--ws-ai-command-bar-amplitude, 0))",
              transition: "opacity 0.1s ease-in-out",
            }}
            color={recordButtonColor}
            {...recordButtonProps}
          >
            {recordButtonIcon}
          </AiCommandBarButton>
        </Tooltip>

        <Tooltip
          side="top"
          sideOffset={10}
          delayDuration={0}
          content={aiButtonTooltip}
        >
          <AiCommandBarButton
            color="gradient"
            data-pending={aiButtonPending}
            disabled={aiButtonDisabled}
            onClick={handleAiButtonClick}
          >
            {aiIcon}
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

      {props.prompts.length > 0 && (
        <>
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
      )}
    </>
  );
};
