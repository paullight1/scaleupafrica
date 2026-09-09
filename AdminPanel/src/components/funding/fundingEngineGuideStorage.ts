const SEEN_KEY = "cresciva:funding-engine-guide:v1";

export function hasSeenFundingEngineGuide() {
  return window.localStorage.getItem(SEEN_KEY) === "seen";
}

export function rememberFundingEngineGuide() {
  window.localStorage.setItem(SEEN_KEY, "seen");
}
