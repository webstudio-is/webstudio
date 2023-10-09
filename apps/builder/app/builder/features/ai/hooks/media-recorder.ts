import { useRef, useState } from "react";
import { useEffectEvent } from "./effect-event";

// https://github.com/openai/whisper/discussions/870
const DEFAULT_OPTIONS: MediaRecorderOptions = {
  audioBitsPerSecond: 16000,
};

export const useMediaRecorder = (
  props: {
    onComplete: (file: File) => void;
    onReportSoundAmplitude?: (amplitude: number) => void;
  },
  options = DEFAULT_OPTIONS
) => {
  const disposeRef = useRef<() => void>();

  const cancelRef = useRef(false);
  const isActiveRef = useRef<boolean>(false);
  const idRef = useRef(0);
  const [error, setError] = useState<Error>();
  const [state, setState] = useState<"inactive" | "recording">("inactive");

  const onComplete = useEffectEvent(props.onComplete);
  const onReportSoundAmplitude = useEffectEvent(props.onReportSoundAmplitude);

  const start = useEffectEvent(async () => {
    isActiveRef.current = true;
    const chunks: Blob[] = [];
    idRef.current++;
    const id = idRef.current;

    cancelRef.current = false;

    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (error) {
      // Not allowed, do not start new recording
      isActiveRef.current = false;

      if (error instanceof Error) {
        setError(error);
        return;
      }
      setError(new Error("Unknown error"));
      return;
    }

    // Recording was stopped, do not start new recording
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore wrong ts error based on isActiveRef.current = true above it think that isActiveRef.current is always true
    if (isActiveRef.current === false) {
      stream.getAudioTracks().forEach((track) => track.stop());
      return;
    }

    // New recording started, do cleanup and return
    if (id !== idRef.current) {
      stream.getAudioTracks().forEach((track) => track.stop());
      return;
    }

    setError(undefined);
    setState("recording");

    const subtype = MediaRecorder.isTypeSupported("audio/webm; codecs=opus")
      ? "webm"
      : "mp4";
    const mimeType =
      subtype === "webm" ? `audio/${subtype}; codecs=opus` : `audio/${subtype}`;

    const recorder = new MediaRecorder(stream, {
      mimeType,
      ...options,
    });

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);

    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    disposeRef.current = () => {
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
      // Safari bug: Calling `stop` on tracks delays next `getUserMedia` by 3-5s.
      // Chrome: `stop` needed to remove recording tab indicator.
      // @todo: Probably don't stop tracks in Safari, as subsequent getUserMedia blocks the main thread, and cause long-press logic to fail
      stream.getAudioTracks().forEach((track) => track.stop());
      recorder.stop();
    };

    const latestSamples = Array.from({ length: 10 }, () => 1);
    let latestSamplesIndex = 0;

    recorder.ondataavailable = (event) => {
      analyser.getFloatTimeDomainData(dataArray);
      const sampleMaxAmplitude = Math.max(...dataArray);
      latestSamples[latestSamplesIndex] = sampleMaxAmplitude;
      latestSamplesIndex = (latestSamplesIndex + 1) % latestSamples.length;

      // To not normalize amplitude around near zero values
      const normalizeThreshold = 0.1;

      // Normalize amplitude to be between 0 and 1, and against lastest samples.
      // The idea to use latest samples for normalization
      onReportSoundAmplitude?.(
        sampleMaxAmplitude /
          Math.max(normalizeThreshold, Math.max(...latestSamples))
      );

      // New recording started, do cleanup and return
      if (id !== idRef.current) {
        chunks.length = 0;
        return;
      }

      // Cancelled, do cleanup and return
      if (cancelRef.current) {
        setState("inactive");
        chunks.length = 0;
        return;
      }

      chunks.push(event.data);

      if (recorder.state === "inactive") {
        const audioFile = new File(chunks, "recording." + subtype, {
          // Add type to be able to play in audio element
          type: "audio/" + subtype,
        });

        if (audioFile.size > 0) {
          onComplete(audioFile);
          onReportSoundAmplitude?.(0);
        }
        chunks.length = 0;
        setState("inactive");
      }
    };

    recorder.start(50);
  });

  const stop = useEffectEvent(() => {
    isActiveRef.current = false;
    disposeRef.current?.();
    disposeRef.current = undefined;
  });

  const cancel = useEffectEvent(() => {
    cancelRef.current = true;
    stop();
  });

  return { start, stop, cancel, error, state };
};
