import { getSetting } from "~/designer/shared/client-settings";
import { darkTheme } from "../stitches.config";

const getTheme = () => {
  const theme = getSetting("theme");
  if (theme === "dark") return darkTheme.toString();
  return "light-theme";
  // @todo handle system theme
};

export const Theme = () => {
  globalThis.theme = getTheme();
  console.log(1111, globalThis.theme);

  const code = `
    !(function () {
      setTimeout(function() {
        console.log(222, globalThis.theme)
        document.documentElement.classList.add(globalThis.theme)
      });
    })();
  `;
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: code,
      }}
    />
  );
};
