const _LOCAL_STORAGE_KEY = `browserless-debugger:` + window.location.origin + window.location.pathname;
const hasLocalStorage = (() => {
  let can = false;

  try {
    window.localStorage.getItem(_LOCAL_STORAGE_KEY);
    can = true;
  } catch(e) {
    console.error(`Error writing to local-storage: ${e}`);
    can = false;
  }

  return can;
})();

const state: Record<string, any> = (() => {
  const prior = hasLocalStorage ? window.localStorage.getItem(_LOCAL_STORAGE_KEY) : '{}';
  let priorState: Record<string, string>;

  try {
    priorState = JSON.parse(prior || '{}');
  } catch {
    priorState = {};
  }

  return priorState;
})();

const writeState = (value: Record<string, any>) => {
  if (hasLocalStorage) {
    window.localStorage.setItem(_LOCAL_STORAGE_KEY, JSON.stringify(value));
  }
}

export const get = (key: string) => state.hasOwnProperty(key) ? state[key] : null;

export const set = <T>(key: string, value:T): T => {
  state[key] = value;
  writeState(state);

  return value;
};
