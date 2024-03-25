import {
  forwardRef,
  useContext,
  useEffect,
  useRef,
  type ForwardedRef,
  useSyncExternalStore,
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
      script.addEventListener("load", () => {
        resolve(script);
      });
      script.addEventListener("error", reject);
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
  for (const task of asyncTasks) {
    task();
  }

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
 * Also executes scripts on the published site when `clientOnly` is true.
 */
const ClientEmbed = (props: ChildProps) => {
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
const ServerEmbed = (props: ChildProps) => {
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

export const getRenderMode = ({
  renderer,
  runtime = "server",
  isFirstMount = true,
  executeScriptOnCanvas = false,
  clientOnly = false,
}: {
  renderer?: "canvas" | "preview";
  runtime?: "server" | "client";
  isFirstMount?: boolean;
  executeScriptOnCanvas?: boolean;
  clientOnly?: boolean;
}) => {
  if (runtime === "server") {
    // Don't render anything on the server when clientOnly is true otherwise SSR will execute the scripts by the browser.
    return clientOnly ? undefined : "static";
  }

  // We are rendering in published mode on the client, so will need to execute the scripts manually
  if (renderer === undefined) {
    // On the first mount when SSR was enabled, scripts were already executed
    if (clientOnly === false && isFirstMount) {
      return "static";
    }
    return "client";
  }

  // On canvas in preview we always execute the scripts, because in doesn't have SSR.
  if (renderer === "preview") {
    return "client";
  }

  // On builder canvas we have a special setting to allow execution. This is useful if the execution doesn't hurt the build process.
  // Otherwise we just need to render it as a static HTML
  if (renderer === "canvas") {
    return executeScriptOnCanvas ? "client" : "static";
  }
};

type HtmlEmbedProps = {
  code: string;
  executeScriptOnCanvas?: boolean;
  clientOnly?: boolean;
};

export const HtmlEmbed = forwardRef<HTMLDivElement, HtmlEmbedProps>(
  (props, ref) => {
    const { code, executeScriptOnCanvas, clientOnly, ...rest } = props;
    const { renderer } = useContext(ReactSdkContext);
    const isServer = useSyncExternalStore(
      () => () => {},
      () => false,
      () => true
    );
    const isFirstMount = useRef(true);
    useEffect(() => {
      isFirstMount.current = false;
    }, []);

    // - code can be actually undefined when prop is not provided
    // - cast code to string in case non-string value is computed from expression
    if (code === undefined || String(code).trim().length === 0) {
      return <Placeholder innerRef={ref} {...rest} />;
    }

    const mode = getRenderMode({
      runtime: isServer ? "server" : "client",
      isFirstMount: isFirstMount.current,
      renderer,
      executeScriptOnCanvas,
      clientOnly,
    });

    if (mode === undefined) {
      return;
    }

    const Embed = mode === "client" ? ClientEmbed : ServerEmbed;

    return <Embed innerRef={ref} code={code} {...rest} />;
  }
);

HtmlEmbed.displayName = "HtmlEmbed";
