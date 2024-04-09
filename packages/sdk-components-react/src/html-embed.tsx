import {
  forwardRef,
  useContext,
  useEffect,
  useRef,
  type ForwardedRef,
  useSyncExternalStore,
  useState,
  type ReactNode,
} from "react";
import { mergeRefs } from "@react-aria/utils";
import { ReactSdkContext } from "@webstudio-is/react-sdk";

export const __testing__ = {
  scriptTestIdPrefix: "client-",
};

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

    // For testing purposes, we add a prefix to the testid to differentiate between server and client rendered scripts.
    if (script.dataset.testid !== undefined) {
      script.dataset.testid = `${__testing__.scriptTestIdPrefix}${script.dataset.testid}`;
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
    const tasks = script.hasAttribute("async") ? asyncTasks : syncTasks;
    tasks.push(() => {
      return insertScript(script);
    });
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
};

const Placeholder = (props: ChildProps) => {
  const { code, innerRef, ...rest } = props;
  return (
    <div ref={innerRef} {...rest} style={{ padding: "20px" }}>
      {'Open the "Settings" panel to insert HTML code'}
    </div>
  );
};

const useIsServer = () => {
  // https://tkdodo.eu/blog/avoiding-hydration-mismatches-with-use-sync-external-store
  const isServer = useSyncExternalStore(
    () => () => {},
    () => false,
    () => true
  );
  return isServer;
};

const ClientOnly = (props: { children: ReactNode }) => {
  const isServer = useIsServer();

  if (isServer) {
    return;
  }
  return props.children;
};

/**
 * Executes scripts when rendered in the builder manually, because innerHTML doesn't execute scripts.
 * Also executes scripts on the published site when `clientOnly` is true.
 */
const ClientEmbed = (props: ChildProps) => {
  const { code, innerRef, ...rest } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const executeScripts = useRef(true);

  useEffect(() => {
    const container = containerRef.current;

    if (container && executeScripts.current) {
      executeScripts.current = false;
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

const ClientEmbedWithNonExecutableScripts = ServerEmbed;

type HtmlEmbedProps = {
  code: string;
  executeScriptOnCanvas?: boolean;
  clientOnly?: boolean;
};

export const HtmlEmbed = forwardRef<HTMLDivElement, HtmlEmbedProps>(
  (props, ref) => {
    const { code, executeScriptOnCanvas, clientOnly, ...rest } = props;
    const { renderer } = useContext(ReactSdkContext);

    const isServer = useIsServer();

    const [ssrRendered] = useState(isServer);

    // - code can be actually undefined when prop is not provided
    // - cast code to string in case non-string value is computed from expression
    if (code === undefined || String(code).trim().length === 0) {
      return <Placeholder innerRef={ref} {...rest} />;
    }

    if (ssrRendered) {
      // We are on published site, on server rendering or after hydration
      if (clientOnly !== true) {
        return <ServerEmbed innerRef={ref} code={code} {...rest} />;
      }

      return (
        <ClientOnly>
          <ClientEmbed innerRef={ref} code={code} {...rest} />
        </ClientOnly>
      );
    }
    // We are or on canvas | preview | published site after client routing

    // The only case we need to prevent script execution if it's explicitly disabled on the canvas
    if (renderer === "canvas" && executeScriptOnCanvas !== true) {
      return (
        <ClientOnly>
          <ClientEmbedWithNonExecutableScripts
            innerRef={ref}
            code={code}
            {...rest}
          />
        </ClientOnly>
      );
    }

    return (
      <ClientOnly>
        <ClientEmbed
          // Use key={code} to allow scripts to be reexecuted when code has changed
          key={code}
          innerRef={ref}
          code={code}
          {...rest}
        />
      </ClientOnly>
    );
  }
);

HtmlEmbed.displayName = "HtmlEmbed";
