import { useRef, useState } from "react";
import { useLongPressToggle } from "./long-press-toggle";
import { useMediaRecorder } from "./media-recorder";
import { Button, Flex, Grid, css } from "@webstudio-is/design-system";

export default {
  title: "Library/Media Recorder",
  argTypes: {
    audioBitsPerSecond: {
      options: [4000, 8000, 16000, 32000, 64000, 128000, 256000],
      control: { type: "radio" },
    },
  },
  args: {
    audioBitsPerSecond: 16000,
  },
};

const playAudio = (file: File) => {
  const blobUrl = URL.createObjectURL(file);
  const audioElement = new Audio(blobUrl);

  audioElement.addEventListener("ended", () => {
    URL.revokeObjectURL(blobUrl);
  });

  audioElement.play();
};

export const MediaRecorder = (options: { audioBitsPerSecond: number }) => {
  const soundRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File>();

  const { start, stop, cancel, state } = useMediaRecorder(
    {
      onError: (error) => {
        // eslint-disable-next-line no-console
        console.error(error);
      },
      onComplete: (file) => {
        setFile(file);
      },
      onReportSoundAmplitude: (amplitude) => {
        soundRef.current?.style.setProperty("--volume", amplitude.toString());
      },
    },
    options
  );

  const clickAndHoldProps = useLongPressToggle({
    onStart: start,
    onEnd: stop,
    onCancel: cancel,
  });

  return (
    <Grid css={{ m: 4 }} gap={2}>
      <Flex ref={soundRef} justify="center" align="center">
        <div className={soundCss()}></div>
      </Flex>
      <Button {...clickAndHoldProps}>
        {state === "inactive" ? "Start recording" : "Recording"}
      </Button>
      {file && (
        <Button color="positive" onClick={() => playAudio(file)}>
          Play, recorded size {file.size}
        </Button>
      )}
    </Grid>
  );
};
MediaRecorder.storyName = "Media Recorder";

const soundCss = css({
  transition: "transform 0.15s ease-in-out",
  borderRadius: "9999px",
  backgroundColor: "#F56565",
  width: "3rem",
  height: "3rem",
  transformOrigin: "center",
  transform: "scale(calc(1 + var(--volume, 0)))",
});
