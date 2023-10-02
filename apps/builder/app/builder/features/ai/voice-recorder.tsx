// Examples:
// Code https://github.com/mozdevs/MediaRecorder-examples/blob/gh-pages/filter-and-record-live-audio.js
// Demo https://mozdevs.github.io/MediaRecorder-examples/record-live-audio.html
// Code https://github.com/mdn/dom-examples/blob/main/media/web-dictaphone/scripts/app.js
// Demo https://mdn.github.io/dom-examples/media/web-dictaphone/

import { requestStream } from "@webstudio-is/ai";
import { restAiWhisper } from "~/shared/router-utils";
import { Button } from "@webstudio-is/design-system";
import { useEffect, useMemo, useRef, useState } from "react";

const createRecorder = ({
  onStart,
  onStop,
  onError,
  onData,
}: {
  onStart: (recorder: MediaRecorder) => void;
  onStop: (event: Event) => void;
  onError: (error: Error) => void;
  onData: (data: Blob) => void;
}) => {
  let recorder: MediaRecorder | undefined;
  let state: "idle" | "started" = "idle";
  let chunks: Array<Blob> = [];

  const reset = () => {
    state = "idle";
    recorder = undefined;
    chunks = [];
  };

  const start = () => {
    if (state === "started") {
      console.warn("Already started");
      return;
    }
    state = "started";
    return navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        recorder = createRecorder(stream);
        recorder.addEventListener("dataavailable", (event) => {
          chunks.push(event.data);
        });

        recorder.onstop = async (event) => {
          console.info("Recorder stopped: ", event);
          const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
          onData(blob);
          onStop(event);
          reset();
        };

        recorder.start();
        console.info(recorder.state);
        onStart(recorder);
      })
      .catch((error: Error) => {
        reset();
        onError(error);
      });
  };

  const stop = () => {
    if (state !== "started" || recorder === undefined) {
      console.warn("Already stopped");
      return;
    }
    recorder.stop();
    console.info(recorder.state);
    reset();
  };

  // @todo figure out if it can improve sound quality
  // right now it adds weird noises
  const createFilter = (audioContext: AudioContext) => {
    const filter = audioContext.createBiquadFilter();
    filter.frequency.setValueAtTime(1000, audioContext.currentTime);
    filter.type = "highpass";
    filter.Q.value = 40;

    const oscillator = audioContext.createOscillator();
    oscillator.frequency.setValueAtTime(0.5, audioContext.currentTime);
    oscillator.start();

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(1000, audioContext.currentTime);
    oscillator.connect(gain);
    gain.connect(filter.frequency);
    return filter;
  };

  const createRecorder = (stream: MediaStream) => {
    // Creating a filter could help us provide better audio, this example is taken from here
    // I have no idea what I am doing there, so I commented it out for now
    // Code https://github.com/mozdevs/MediaRecorder-examples/blob/gh-pages/filter-and-record-live-audio.js
    // Demo https://mozdevs.github.io/MediaRecorder-examples/record-live-audio.html

    //const audioContext = new AudioContext();
    //const input = audioContext.createMediaStreamSource(stream);
    // const filter = createFilter(audioContext);
    //const output = audioContext.createMediaStreamDestination();
    //input.connect(filter);
    //filter.connect(output);
    return new MediaRecorder(stream);
  };

  return {
    start,
    stop,
  };
};

const createRequest = async (
  projectId: string,
  blob: Blob,
  onText: (text: string) => void
) => {
  const abort = new AbortController();

  const blobToBase64 = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result;
        if (typeof base64data !== "string") {
          return;
        }
        // Only send the base64 string
        const base64String = base64data.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
    });
  };

  requestStream([
    restAiWhisper(),
    {
      method: "POST",
      body: JSON.stringify({
        projectId,
        audio: await blobToBase64(blob),
      }),
      signal: abort.signal,
    },
  ]).then((result) => {
    if (result.success) {
      return onText(result.text);
    }
    alert("Error ", result);
  });

  return abort;
};

type VoiceRecorderProps = {
  projectId?: string;
  onText: (text: string) => void;
};

export const VoiceRecorder = ({ projectId, onText }: VoiceRecorderProps) => {
  const [status, setStatus] = useState<
    "idle" | "blocked" | "recording" | "loading"
  >("idle");
  const abortRef = useRef<AbortController>();
  const [blob, setBlob] = useState<Blob>();

  const recorder = useMemo(() => {
    if (projectId === undefined) {
      return;
    }
    return createRecorder({
      onStart() {
        setStatus("recording");
      },
      onStop() {
        setStatus("idle");
      },
      async onData(blob) {
        abortRef.current = await createRequest(projectId, blob, onText);
        setBlob(blob);
      },
      onError(error) {
        console.error(error);
      },
    });
  }, [projectId, onText]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // @todo when blocked add a tooltip explaining why
  return (
    <>
      <Button
        state={
          status === "recording" || status === "loading" ? "pending" : undefined
        }
        disabled={status === "blocked"}
        onPointerDown={recorder?.start}
        onPointerUp={recorder?.stop}
      >
        Record Voice Prompt
      </Button>
      <Player blob={blob} />
    </>
  );
};

const Player = ({ blob }: { blob?: Blob }) => {
  if (blob === undefined) {
    return;
  }

  const play = (blob: Blob) => {
    const audio = document.createElement("audio");
    audio.onended = () => {
      document.body.removeChild(audio);
    };
    const audioURL = URL.createObjectURL(blob);
    audio.src = audioURL;
    document.body.appendChild(audio);
    audio.play();
  };

  return (
    <Button
      onClick={() => {
        play(blob);
      }}
    >
      Play
    </Button>
  );
};
