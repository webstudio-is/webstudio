import { useState, useRef, useEffect, RefObject } from "react";
import { createContentController } from "./create-content-controller";

const useContentController = ({
  ref,
  read,
  write,
  callback,
}: {
  ref: RefObject<HTMLInputElement>;
  read: (value: HTMLInputElement) => string;
  write: (target: HTMLInputElement, value: string) => void;
  callback: (value: { name: string; value: string }) => void;
}) => {
  useEffect(() => {
    if (ref.current == null) return;
    const { disconnectedCallback } = createContentController(ref.current, {
      contents: [
        {
          name: "unit",
          match: (value: string) => ["px", "em", "rem", "%"].includes(value),
        },
        {
          name: "number",
          match: (value: string) => isNaN(parseFloat(value)) === false,
        },
        { name: "unknown", match: (value: string) => Boolean(value) },
      ],
      read,
      write,
      onMouseMove: callback,
      onCaretMove: callback,
    });
    return () => disconnectedCallback();
  }, [ref, read, write, callback]);
};

const ExampleContentController = () => {
  const [content, setContent] = useState({ name: "none", value: "" });
  const ref = useRef<HTMLInputElement | null>(null);
  useContentController({
    ref,
    callback: (payload) => setContent(payload),
    read: (target) => target.value,
    write: (target, value) => (target.value = value),
  });
  return (
    <form style={{ fontFamily: "sans-serif" }}>
      <fieldset>
        <input
          defaultValue="100px 20% fit-content calc(0.2px, -99em)"
          ref={ref}
          style={{ width: "50%" }}
        />
      </fieldset>
      <fieldset>
        <h1>Currently on: {content.name}</h1>
        <h1>With a value of: {content.value}</h1>
      </fieldset>
    </form>
  );
};

export const DetectInput = Object.assign(ExampleContentController.bind({}), {
  args: {},
});

export default {
  title: "createContentController",
  component: ExampleContentController,
  argTypes: {},
};
