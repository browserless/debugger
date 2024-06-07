import { get, set } from "./storage";
import { splitByWhitespace } from "./util";

const apiSettingsKey = "apiSettings";
interface APIState {
  baseURL: string;
  headless: boolean;
  stealth: boolean;
  blockAds: boolean;
  ignoreHTTPSErrors: boolean;
  quality: number;
}

const getState = () => get(apiSettingsKey) as APIState;
const saveState = (newState: Partial<APIState>) =>
  set(apiSettingsKey, {
    ...getState(),
    ...newState,
  });

const priorSettings = getState() ?? {};

const token = new URL(window.location.href).searchParams.get("token");

const baseURL =
  priorSettings.baseURL ?? token
    ? `${window.location.origin}?token=${token}`
    : window.location.origin;
const headless = priorSettings.headless ?? true;
const stealth = priorSettings.stealth ?? false;
const blockAds = priorSettings.blockAds ?? false;
const ignoreHTTPSErrors = priorSettings.ignoreHTTPSErrors ?? false;
const quality = priorSettings.quality ?? 100;

saveState({
  ignoreHTTPSErrors,
  baseURL,
  headless,
  stealth,
  blockAds,
  quality,
});

export const getHeadless = () => getState().headless;
export const setHeadless = (headless: boolean) => saveState({ headless });

export const getStealth = () => getState().stealth;
export const setStealth = (stealth: boolean) => saveState({ stealth });

export const getAds = () => getState().blockAds;
export const setAds = (blockAds: boolean) => saveState({ blockAds });

export const getIgnoreHTTPS = () => getState().ignoreHTTPSErrors;
export const setIgnoreHTTPS = (ignoreHTTPSErrors: boolean) =>
  saveState({ ignoreHTTPSErrors });

export const getQuality = () => getState().quality;
export const setQuality = (quality: number) => saveState({ quality });

export const getWebSocketURL = () => {
  const baseURL = getBaseURL();
  const websocketURL = new URL(baseURL.href);
  websocketURL.protocol = websocketURL.protocol === "https:" ? "wss:" : "ws:";

  return websocketURL;
};

const devtoolsInspectorURL = "devtools/inspector.html";
const devtoolsAppURL = "devtools/devtools_app.html";

const getHostedApp = (targetId: string, path: string) => {
  const baseUrl = getBaseURL();
  const isSecure = baseUrl.protocol === "https:";
  const iframePageURL = `${isSecure ? "wss" : "ws"}=${baseUrl.host}${
    baseUrl.pathname
  }devtools/page/${targetId}${baseUrl.search}`;

  return `${baseUrl.origin}${baseUrl.pathname}${path}${
    baseUrl.search.length ? `${baseUrl.search}&` : "?"
  }${iframePageURL}`;
};

export const getDevtoolsInspectorURL = (targetId: string) => {
  return getHostedApp(targetId, devtoolsInspectorURL);
};

export const getDevtoolsAppURL = (targetId: string) => {
  return getHostedApp(targetId, devtoolsAppURL);
};

export const getBaseURL = () => {
  const { baseURL } = get(apiSettingsKey);

  return new URL(baseURL);
};

export const setBrowserURL = (
  input: string,
): { valid: boolean; message: string } => {
  let response = { valid: false, message: "" };

  if (!input.startsWith("ws")) {
    return {
      valid: false,
      message: "URL must start with ws:// or wss://",
    };
  }

  try {
    new URL(input);
    response.valid = true;
    response.message = "";
  } catch {
    response.valid = false;
    response.message = "Invalid browser URL";
  }

  if (!input.startsWith("ws")) {
    response.valid = false;
    response.message = "URL must start with ws:// or wss://";
  }

  if (response.valid) {
    const parsed = new URL(input);
    parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";

    saveState({ baseURL: parsed.href });
  }

  return response;
};

export const getConnectURL = () => {
  const wsURL = getWebSocketURL();

  const headless = getHeadless();
  const blockAds = getAds();
  const ignoreHTTPSErrors = getIgnoreHTTPS();
  const stealth = getStealth();

  const launchArgs = JSON.stringify({
    ignoreHTTPSErrors,
    stealth,
    args: splitByWhitespace((document.getElementById("chrome-flags") as any)?.value),
  });

  if (blockAds) {
    wsURL.searchParams.append("blockAds", "true");
  }

  if (!headless) {
    wsURL.searchParams.append("headless", "false");
  }

  wsURL.searchParams.append("launch", launchArgs);
  return wsURL.href;
};

export const fetchSessions = () => {
  const { baseURL } = get(apiSettingsKey);

  const sessionURL = new URL(baseURL);
  sessionURL.pathname = sessionURL.pathname + "sessions";

  return fetch(sessionURL.href, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  }).then((res) => res.json());
};
