import { darkTheme } from "../design-system/stitches.config";

export const Theme = () => {
  darkTheme.toString();
  // @todo switch the default to system theme once we support both.
  const code = `
    !(function () {
      try {
        var theme = 'dark';
        var savedTheme = localStorage.getItem("__webstudio_theme__");
        if (savedTheme === 'system') {
          theme = matchMedia("(prefers-color-scheme: light)").matches ? 'light' : 'dark';
        }
        if (savedTheme && savedTheme !== theme) theme = savedTheme
        document.documentElement.classList.add(theme + "-theme");
        document.documentElement.style.colorScheme = theme;
      } catch (e) {}
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
