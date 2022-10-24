// This is a temporary work around for https://github.com/remix-run/remix/issues/3659

// The code is based on this discussion https://bugs.chromium.org/p/chromium/issues/detail?id=357625
const polyfill = `(function () {
  try {
    const key = "__session_storage_availability_test__";
    sessionStorage.setItem(key, "test");
    sessionStorage.removeItem(key);
  } catch (e) {
    const data = new Map();
    Object.defineProperty(window, "sessionStorage", {
      value: {
        setItem: (key, val) => {
          console.warn(
            \`Session storage is unavailable due to Error "\${e.message}". A polyfill is used to set value of "\${key}". The value will be lost when the page is reloaded.\`
          );
          data.set(key, String(val));
        },
        getItem: (key) => {
          return data.get(key);
        },
        removeItem: (key) => {
          data.delete(key);
        },
        clear: () => {
          data.clear();
        },
      },
    });
  }
})();`;

export const SessionStoragePolyfill = () => (
  <script dangerouslySetInnerHTML={{ __html: polyfill }} />
);
