import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { WindowsSapiBackend, toSapiRate } from "./WindowsSapiBackend";

describe("toSapiRate", () => {
    it("maps the normal rate to zero", () => {
        expect(toSapiRate(1)).toBe(0);
    });

    it("clamps to SAPI's -10..10 range", () => {
        expect(toSapiRate(100)).toBe(10);
        expect(toSapiRate(0)).toBe(-5);
        expect(toSapiRate(-100)).toBe(-10);
    });

    it("falls back to the normal rate for values that are not numbers", () => {
        expect(toSapiRate(NaN)).toBe(0);
        expect(toSapiRate(Infinity)).toBe(0);
    });

    it("always produces an integer, because the value is interpolated into a protocol line", () => {
        for (const speed of [0.1, 0.33, 0.75, 1, 1.5, 2.4, 3.7]) {
            expect(Number.isInteger(toSapiRate(speed))).toBe(true);
        }
    });
});

/**
 * These drive a real PowerShell speech host, so they only run on Windows and only when
 * asked for: they play audio out loud.
 *
 *   TEXT_SPEAKER_AUDIO_TESTS=1 npx vitest run src/tts
 */
const audioTests = os.platform() === "win32" && process.env.TEXT_SPEAKER_AUDIO_TESTS === "1";

// Each test starts its own host, and starting PowerShell plus opening the audio device costs
// a few seconds before a word is spoken, so the default per-test budget is far too small.
describe.runIf(audioTests)("WindowsSapiBackend against a real speech host", { timeout: 30000 }, () => {
    let backend: WindowsSapiBackend | null = null;
    const openBackend = () => {
        backend = new WindowsSapiBackend();
        return backend;
    };

    afterEach(() => {
        backend?.dispose();
        backend = null;
    });

    it("lists the installed voices", async () => {
        const voices = await openBackend().listVoices();
        expect(voices.length).toBeGreaterThan(0);
        expect(voices.every((name) => name.trim().length > 0)).toBe(true);
    });

    it("speaks a short utterance to completion", async () => {
        await expect(openBackend().speak("Ok.", { voice: "", speed: 1 })).resolves.toBe("completed");
    });

    it("treats document text as data, not as PowerShell", async () => {
        // The regression test for the injection this backend exists to prevent: this payload
        // executed as PowerShell back when text was interpolated into the command line.
        // It is kept short because it is spoken out loud, and it reaches the marker through
        // $env:TEMP so that no long path has to appear in it.
        const marker = path.join(process.env.TEMP ?? os.tmpdir(), "tsp.txt");
        fs.rmSync(marker, { force: true });

        const payload = `A $(Set-Content $env:TEMP\\tsp.txt x) \`b\` "c" 'd' \${e} B.`;
        await expect(openBackend().speak(payload, { voice: "", speed: 1 })).resolves.toBe("completed");

        expect(fs.existsSync(marker)).toBe(false);
    });

    it("speaks multibyte text and text containing newlines", async () => {
        await expect(openBackend().speak("はい。\nOk.", { voice: "", speed: 1 })).resolves.toBe("completed");
    });

    it("cancels an utterance that has not started speaking yet", async () => {
        // Starting the host and applying voice and rate takes a round trip. A cancel during
        // that window used to be dropped, and the utterance then spoke in full.
        const live = openBackend();
        const speaking = live.speak("One two three four five six seven eight nine ten.", { voice: "", speed: 1 });
        live.cancel();

        await expect(speaking).resolves.toBe("cancelled");
    });

    it("cuts an utterance short once it is speaking", async () => {
        const live = openBackend();
        await live.speak("Ok.", { voice: "", speed: 1 }); // warm the host up so the next utterance starts at once

        const speaking = live.speak("One two three four five six seven eight nine ten.", { voice: "", speed: 1 });
        await new Promise((resolve) => setTimeout(resolve, 500));
        live.cancel();

        await expect(speaking).resolves.toBe("cancelled");
    });

    it("stays usable after a cancel", async () => {
        const live = openBackend();
        await live.speak("Ok.", { voice: "", speed: 1 });

        const speaking = live.speak("One two three four five six seven eight nine ten.", { voice: "", speed: 1 });
        await new Promise((resolve) => setTimeout(resolve, 500));
        live.cancel();
        await speaking;

        await expect(live.speak("Ok.", { voice: "", speed: 1 })).resolves.toBe("completed");
    });

    it("reports an unusable voice and keeps working afterwards", async () => {
        const live = openBackend();
        await expect(live.speak("Ok.", { voice: "No Such Voice XYZ", speed: 1 })).rejects.toThrow(/voice/i);

        await expect(live.speak("Ok.", { voice: "", speed: 1 })).resolves.toBe("completed");
    });

    it("refuses to speak once disposed", async () => {
        const live = openBackend();
        await live.speak("Ok.", { voice: "", speed: 1 });
        live.dispose();

        await expect(live.speak("Ok.", { voice: "", speed: 1 })).rejects.toThrow(/shut down/i);
    });
});
