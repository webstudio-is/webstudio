import { formatDistance } from "date-fns/formatDistance";
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
import {
  $collaborativeInstanceSelector,
  $selectedInstanceSelector,
  $selectedPage,
} from "~/shared/nano-states";
import { useMediaRecorder } from "./hooks/media-recorder";
import { useLongPressToggle } from "./hooks/long-press-toggle";
import { AiCommandBarButton } from "./ai-button";
import { fetchTranscription } from "./ai-fetch-transcription";
import { fetchResult } from "./ai-fetch-result";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import { AiApiException, RateLimitException } from "./api-exceptions";
import { useClientSettings } from "~/builder/shared/client-settings";
import { flushSync } from "react-dom";

type PartialButtonProps<T = ComponentPropsWithoutRef<typeof Button>> = {
  [key in keyof T]?: T[key];
};

const useSelectText = () => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const selectText = () => {
    ref.current?.focus();
    ref.current?.select();
  };
  return [ref, selectText] as const;
};

const initialPrompts = [
  "Create a hero section with a heading, subheading in white, CTA button and an image of a mountain in the background,  add light blur to the image",
  "Create a two column feature section with a heading and subheading in the left column, and an image that covers the right column",
  "Create a testimonials section on 2 rows. The first row has a heading and subheading, the second row has 3 testimonial cards with an image, headline, description and link.",
];

export const AiCommandBar = ({ isPreviewMode }: { isPreviewMode: boolean }) => {
  const [value, setValue] = useState("");
  const [prompts, setPrompts] = useState<string[]>(initialPrompts);
  const [clientSettings, setClientSetting, isClientSettingsLoaded] =
    useClientSettings();
  const isMenuOpen = isClientSettingsLoaded && clientSettings.isAiMenuOpen;
  const setIsMenuOpen = useEffectEvent((value: boolean) =>
    setClientSetting("isAiMenuOpen", value)
  );

  const [isAudioTranscribing, setIsAudioTranscribing] = useState(false);
  const [isAiRequesting, setIsAiRequesting] = useState(false);
  const abortController = useRef<AbortController>();
  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const guardIdRef = useRef(0);
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  const getValue = useEffectEvent(() => {
    return value;
  });
  const [textAreaRef, selectPrompt] = useSelectText();

  const {
    start,
    stop,
    cancel,
    state: mediaRecorderState,
  } = useMediaRecorder({
    onError: (error) => {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.info("Please enable your microphone.");
        return;
      }
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      toast.error(`Unknown Error: ${error}`);
    },
    onComplete: async (file) => {
      try {
        setIsAudioTranscribing(true);
        guardIdRef.current++;
        const guardId = guardIdRef.current;
        const text = await fetchTranscription(file);
        if (guardId !== guardIdRef.current) {
          return;
        }

        const currentValue = getValue();
        const newValue = [currentValue, text].filter(Boolean).join(" ");

        setValue(newValue);
        handleAiRequest(newValue);
      } catch (error) {
        if (error instanceof RateLimitException) {
          toast.info(
            `Temporary AI rate limit reached. Please wait ${formatDistance(
              Date.now(),
              new Date(error.meta.reset),
              {
                includeSeconds: true,
              }
            )} and try again.`
          );
          return;
        }

        // Above are known errors; we're not interested in logging them.
        // eslint-disable-next-line no-console
        console.error(error);

        if (error instanceof AiApiException) {
          toast.error(`API Internal Error: ${error.message}`);
          return;
        }

        if (error instanceof Error) {
          // Unknown error, show toast
          toast.error(`Unknown Error: ${error.message}`);
        }
      } finally {
        setIsAudioTranscribing(false);
      }
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

  if (isPreviewMode) {
    return;
  }

  const handleAiRequest = async (prompt: string) => {
    if (abortController.current) {
      if (abortController.current.signal.aborted === false) {
        // eslint-disable-next-line no-console
        console.warn(`For some reason previous operation is not aborted.`);
      }

      abortController.current.abort();
    }

    const localAbortController = new AbortController();
    abortController.current = localAbortController;

    setIsAiRequesting(true);

    // Skip Abort Logic for now
    try {
      const page = $selectedPage.get();
      const rootInstanceSelector = page?.rootInstanceId
        ? [page.rootInstanceId]
        : [];
      const instanceSelector =
        $selectedInstanceSelector.get() ?? rootInstanceSelector;

      const [instanceId] = instanceSelector;

      if (instanceId === undefined) {
        // Must not happen, we always have root instance
        throw new Error("No element selected");
      }

      $collaborativeInstanceSelector.set(instanceSelector);
      await fetchResult(prompt, instanceId, abortController.current.signal);

      if (localAbortController !== abortController.current) {
        // skip
        return;
      }

      setPrompts((previousPrompts) => [prompt, ...previousPrompts]);

      setValue("");
    } catch (error) {
      if (
        (error instanceof Error && error.message.startsWith("AbortError:")) ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        // Aborted by user request
        return;
      }

      if (error instanceof RateLimitException) {
        toast.info(
          `Temporary AI rate limit reached. Please wait ${formatDistance(
            Date.now(),
            new Date(error.meta.reset),
            {
              includeSeconds: true,
            }
          )} and try again.`
        );
        return;
      }

      // Above is known errors, we are not interesting in
      // eslint-disable-next-line no-console
      console.error(error);

      if (error instanceof AiApiException) {
        toast.error(`API Internal Error: ${error.message}`);
        return;
      }

      if (error instanceof Error) {
        // Unknown error, show toast
        toast.error(`Unknown Error: ${error.message}`);
      }
    } finally {
      abortController.current = undefined;
      $collaborativeInstanceSelector.set(undefined);
      setIsAiRequesting(false);
    }
  };

  const handleAiButtonClick = () => {
    if (value.trim().length === 0) {
      return;
    }
    handleAiRequest(value);
  };

  const handlePropmptClick = (prompt: string) => {
    if (textAreaRef.current?.disabled) {
      return;
    }
    // We can't select text right away because value will be set using setState.
    flushSync(() => {
      setValue(prompt);
    });
    selectPrompt();
  };

  if (
    isClientSettingsLoaded === false ||
    clientSettings.isAiCommandBarVisible === false
  ) {
    return;
  }

  let textAreaPlaceholder = "Welcome to Webstudio AI alpha!";
  let textAreaValue = value;
  let textAreaDisabled = false;

  let recordButtonTooltipContent = undefined;
  let recordButtonColor: ComponentPropsWithoutRef<typeof Button>["color"] =
    "dark-ghost";
  let recordButtonProps: PartialButtonProps = longPressToggleProps;
  let recordButtonIcon = <MicIcon />;
  let recordButtonDisabled = false;

  let aiButtonDisabled = false;
  let aiButtonTooltip: string | undefined =
    value.length === 0 ? undefined : "Generate AI results";
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
    recordButtonProps = {
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        // Cancel AI request
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
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        content={
          <CommandBarContent
            prompts={prompts}
            onPromptClick={handlePropmptClick}
          />
        }
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
              ref={textAreaRef}
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

const CommandBarContent = (props: {
  prompts: string[];
  onPromptClick: (value: string) => void;
}) => {
  // @todo enable when we will have shortcut
  // const shortcutText = "⌘⇧Q";

  return (
    <>
      <CommandBarContentSection>
        <Text variant="labelsSentenceCase" align="center">
          Welcome to Webstudio AI alpha!
        </Text>
        <Grid columns={2} gap={2}>
          <Button
            onClick={(event) => {
              const url = new URL("https://wstd.us/learn-webstudio-ai");
              window.open(url.href, "_blank");
            }}
            color="dark"
            suffix={<ExternalLinkIcon />}
          >
            Learn more
          </Button>
          <Button
            onClick={(event) => {
              const url = new URL(
                `https://github.com/webstudio-is/webstudio-community/discussions/new?category=q-a&labels=AI`
              );
              window.open(url.href, "_blank");
            }}
            color="dark"
            suffix={<ExternalLinkIcon />}
          >
            Share feedback
          </Button>
        </Grid>
      </CommandBarContentSection>

      {props.prompts.length > 0 && (
        <>
          <CommandBarContentSeparator />

          <CommandBarContentSection>
            {/* negative then positive margin is used to preserve focus outline on command prompts */}
            <ScrollArea
              css={{
                maxHeight: theme.spacing[29],
                margin: -4,
                marginRight: -14,
              }}
            >
              <Grid gap={2} css={{ margin: 4, marginRight: 14 }}>
                {props.prompts.map((prompt, index) => (
                  <Tooltip
                    key={index}
                    side="top"
                    content={"Click to add prompt to input"}
                  >
                    <CommandBarContentPrompt
                      onClick={() => props.onPromptClick(prompt)}
                    >
                      {prompt}
                    </CommandBarContentPrompt>
                  </Tooltip>
                ))}
              </Grid>
            </ScrollArea>
          </CommandBarContentSection>
        </>
      )}
    </>
  );
};
