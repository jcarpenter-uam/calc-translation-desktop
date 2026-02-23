import packageJson from "../../package.json";

export const PROD_BASE_URL = "https://translator.my-uam.com";
export const STAG_BASE_URL = "https://6832-158-120-147-235.ngrok-free.app";

const APP_VERSION = packageJson.version ?? "";
const IS_PRERELEASE = /-(alpha|beta|rc|pre)\.?/i.test(APP_VERSION);

export const BASE_URL = IS_PRERELEASE ? STAG_BASE_URL : PROD_BASE_URL;
export const BASE_DOMAIN = new URL(BASE_URL).host;
export const API_BASE_URL = BASE_URL;
export const WS_BASE_URL = BASE_URL.replace(/^http/i, "ws");
