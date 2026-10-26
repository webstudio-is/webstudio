/** Lets router and Remix tests keep their existing fetch-backed endpoint fakes. */
export class FetchBackedFormRequest {
  upload: { onload?: (event: ProgressEvent) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  status = 0;
  responseText = "";
  private url = "";
  private headers = new Headers();
  private response?: Response;
  private controller = new AbortController();

  open(_method: string, url: string) {
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  getResponseHeader(name: string) {
    return this.response?.headers.get(name) ?? null;
  }

  send(body: FormData) {
    fetch(this.url, {
      method: "POST",
      body,
      headers: this.headers,
      signal: this.controller.signal,
    })
      .then(async (response) => {
        if (this.controller.signal.aborted) {
          return;
        }
        this.upload.onload?.({
          loaded: 0,
          total: 0,
          lengthComputable: false,
        } as ProgressEvent);
        this.response = response;
        this.status = response.status;
        this.responseText = await response.text();
        this.onload?.();
      })
      .catch(() => {
        if (!this.controller.signal.aborted) {
          this.onerror?.();
        }
      });
  }

  abort() {
    this.controller.abort();
    this.onabort?.();
  }
}
