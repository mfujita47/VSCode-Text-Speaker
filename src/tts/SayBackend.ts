import * as say from "say";
import * as cp from "child_process";
import * as os from "os";
import { SpeakOptions, SpeakResult, TtsBackend } from "./types";

/** Matches the voice name in a `say -v ?` line, e.g. "Kyoko              ja_JP    # ...". */
const SAY_VOICE_LINE = /^(.+?)\s+[a-z]{2}_[A-Z]{2}/;

/**
 * macOS and Linux backend built on the `say` package, which shells out to `say` or `festival`
 * with the text passed as an argument rather than interpolated into a shell command.
 *
 * `say.stop()` kills the child process, which makes the in-flight `speak` callback report a
 * signal error. A cancel is therefore tracked here so it is not mistaken for a real failure.
 */
export class SayBackend implements TtsBackend {
    private cancelSequence = 0;

    speak(text: string, options: SpeakOptions): Promise<SpeakResult> {
        const startedAt = this.cancelSequence;
        return new Promise<SpeakResult>((resolve, reject) => {
            // `say`'s bundled types declare a `string` argument, but it passes `null` on
            // success and an `Error` on failure, so both shapes are handled here.
            say.speak(text, options.voice || undefined, options.speed, (error?: string | Error | null) => {
                if (this.cancelSequence !== startedAt) {
                    // A cancel landed while this utterance was in flight, so whatever the
                    // callback reports is a consequence of the kill, not a synthesis failure.
                    resolve("cancelled");
                    return;
                }
                if (error) {
                    reject(error instanceof Error ? error : new Error(String(error)));
                    return;
                }
                resolve("completed");
            });
        });
    }

    cancel(): void {
        this.cancelSequence++;
        try {
            // Reports "no speech to kill" when idle, which is not worth surfacing.
            say.stop();
        } catch {
            // `say` can also throw synchronously when there is no child process.
        }
    }

    listVoices(): Promise<string[]> {
        if (os.platform() !== "darwin") {
            // `festival` has no comparable enumeration, so offer nothing rather than guess.
            return Promise.resolve([]);
        }
        return new Promise<string[]>((resolve, reject) => {
            cp.execFile("say", ["-v", "?"], (error, stdout) => {
                if (error) {
                    // Node always hands back an Error here; the fallback only satisfies the type.
                    reject(error instanceof Error ? error : new Error("could not run `say -v ?`"));
                    return;
                }
                const voices = stdout
                    .split("\n")
                    .map((line) => line.match(SAY_VOICE_LINE)?.[1]?.trim())
                    .filter((name): name is string => Boolean(name));
                resolve(voices);
            });
        });
    }

    dispose(): void {
        this.cancel();
    }
}
