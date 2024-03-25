import {
  forwardRef,
  useContext,
  useEffect,
  useRef,
  type ForwardedRef,
} from "react";
import { mergeRefs } from "@react-aria/utils";
import { ReactSdkContext } from "@webstudio-is/react-sdk";

const insertScript = (
  sourceScript: HTMLScriptElement
): Promise<HTMLScriptElement> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const hasSrc = sourceScript.hasAttribute("src");

    // Copy all attributes from the source script to the new script, because we are going to replace the source script with the new one
    // and the user might rely on some attributes.
    for (const { name, value } of sourceScript.attributes) {
      script.setAttribute(name, value);
    }

    if (hasSrc) {
      script.onload = () => {
        resolve(script);
      };
      script.onerror = reject;
      script.src = sourceScript.src;
    } else {
      script.textContent = sourceScript.innerText;
    }

    sourceScript.replaceWith(script);

    // Run the callback immediately for inline scripts.
    if (hasSrc === false) {
      resolve(script);
    }
  });
};

type ScriptTask = () => Promise<HTMLScriptElement>;

// Inspiration https://ghinda.net/article/script-tags
const execute = async (container: HTMLElement) => {
  const scripts = container.querySelectorAll("script");
  const syncTasks: Array<ScriptTask> = [];
  const asyncTasks: Array<ScriptTask> = [];

  scripts.forEach((script) => {
    const type = script.getAttribute("type");
    if (type == null || type === "" || type === "text/javascript") {
      const tasks = script.hasAttribute("async") ? asyncTasks : syncTasks;
      tasks.push(() => {
        return insertScript(script);
      });
    }
  });

  // Insert the script tags in parallel.
  Promise.all(asyncTasks.map((task) => task()));

  // Insert the script tags sequentially to preserve execution order.
  for (const task of syncTasks) {
    await task();
  }
};

type ChildProps = {
  innerRef: ForwardedRef<HTMLDivElement>;
  // code can be actually undefined when prop is not provided
  code?: string;
  shouldExecute?: boolean;
};

const Placeholder = (props: ChildProps) => {
  const { code, innerRef, ...rest } = props;
  return (
    <div ref={innerRef} {...rest} style={{ padding: "20px" }}>
      {'Open the "Settings" panel to insert HTML code'}
    </div>
  );
};

/**
 * Executes scripts when rendered in the builder manually, because innerHTML doesn't execute scripts.
 */
const ExecutableHtml = (props: ChildProps) => {
  const { code, innerRef, ...rest } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      execute(container);
    }
  }, []);

  return (
    <div
      {...rest}
      ref={mergeRefs(innerRef, containerRef)}
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: code ?? "" }}
    />
  );
};

/**
 * Scripts are executed when rendered server side without any manual intervention.
 */
const InnerHtml = (props: ChildProps) => {
  const { code, innerRef, ...rest } = props;

  return (
    <div
      {...rest}
      ref={innerRef}
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: code ?? "" }}
    />
  );
};

const shouldExecute = ({
  renderer,
  executeScriptOnCanvas = false,
  clientOnly = false,
}: {
  renderer?: "canvas" | "preview";
  executeScriptOnCanvas?: boolean;
  clientOnly?: boolean;
}) => {
  // We are rendering in published mode.
  if (renderer === undefined) {
    return clientOnly;
  }

  // On canvas in preview we always execute the scripts, because in doesn't have SSR.
  if (renderer === "preview") {
    return true;
  }

  // On builder canvas we have a special setting to allow execution. This is useful if the execution doesn't hurt the build process.
  if (renderer === "canvas") {
    return executeScriptOnCanvas;
  }

  return false;
};

type HtmlEmbedProps = {
  code: string;
  executeScriptOnCanvas?: boolean;
  clientOnly?: boolean;
};

export const HtmlEmbed = forwardRef<HTMLDivElement, HtmlEmbedProps>(
  (props, ref) => {
    const { renderer } = useContext(ReactSdkContext);
    const { code, executeScriptOnCanvas, clientOnly, ...rest } = props;

    // - code can be actually undefined when prop is not provided
    // - cast code to string in case non-string value is computed from expression
    if (code === undefined || String(code).trim().length === 0) {
      return <Placeholder innerRef={ref} {...rest} />;
    }

    const execute = shouldExecute({
      renderer,
      executeScriptOnCanvas,
      clientOnly,
    });

    if (execute) {
      return <ExecutableHtml innerRef={ref} code={code} {...rest} />;
    }

    return <InnerHtml innerRef={ref} code={code} {...rest} />;
  }
);

HtmlEmbed.displayName = "HtmlEmbed";
