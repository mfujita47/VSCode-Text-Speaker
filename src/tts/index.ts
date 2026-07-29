import * as os from "os";
import { TtsBackend } from "./types";
import { WindowsSapiBackend } from "./WindowsSapiBackend";
import { SayBackend } from "./SayBackend";

export { SpeakOptions, SpeakResult, TtsBackend } from "./types";

/** Pick the backend for the current platform. This is the only place that branches on it. */
export const createTtsBackend = (): TtsBackend =>
    os.platform() === "win32" ? new WindowsSapiBackend() : new SayBackend();
