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

    // Copy all attributes from the source script to the new script, because we are going to replace the source script with the new one
    // and the user might rely on some attributes.
    for (const { name, value } of sourceScript.attributes) {
      script.setAttribute(name, value);
    }

    if (sourceScript.src) {
      script.onload = () => {
        resolve(script);
      };
      script.onerror = reject;
      script.src = sourceScript.src;
    } else {
      script.textContent = sourceScript.innerText;
    }

    document.head.appendChild(script);
    sourceScript.replaceWith(script);

    // Run the callback immediately for inline scripts.
    if (sourceScript.hasAttribute("src") === false) {
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
    if (type == null || type == "" || type === "text/javascript") {
      const tasks = script.hasAttribute("async") ? asyncTasks : syncTasks;
      tasks.push(() => {
        return insertScript(script);
      });
    }
  });

  // Insert the script tags in parallel.
  Promise.all(
    asyncTasks.map(async (task) => {
      return await task();
    })
  );
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

/**
 * Scripts are executed when rendered client side and `shouldExecute` is true, otherwise regular innerHTML won't execute scripts when clientOnly setting is used.
 * Server-side rendered scripts are executed as like any server-side rendered HTML.
 */
const ExecutableHtml = (props: ChildProps) => {
  const { code, shouldExecute, innerRef, ...rest } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container == null || shouldExecute !== true) {
      return;
    }
    execute(container);
  }, [shouldExecute]);

  return (
    <div
      {...rest}
      ref={mergeRefs(innerRef, containerRef)}
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: code ?? "" }}
    />
  );
};

const Placeholder = (props: ChildProps) => {
  const { code, innerRef, ...rest } = props;
  return (
    <div ref={innerRef} {...rest} style={{ padding: "20px" }}>
      {'Open the "Settings" panel to insert HTML code'}
    </div>
  );
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

    // code can be actually undefined when prop is not provided
    //
    // cast code to string in case non-string value is computed
    // from expression
    if (code === undefined || String(code).trim().length === 0) {
      return <Placeholder innerRef={ref} {...rest} />;
    }

    const shouldExecute =
      (renderer === "canvas" && executeScriptOnCanvas === true) ||
      renderer === "preview" ||
      clientOnly;

    return (
      <ExecutableHtml
        innerRef={ref}
        code={code}
        shouldExecute={shouldExecute}
        {...rest}
      />
    );
  }
);

HtmlEmbed.displayName = "HtmlEmbed";
