import { describe, it, expect } from "vitest";
import { SpeechEngine, SpeechEngineHandlers } from "./SpeechEngine";
import { SpeakOptions, SpeakResult, TtsBackend } from "./tts/types";

const OPTIONS: SpeakOptions = { voice: "", speed: 1 };

/** Let queued promise callbacks run so the engine can advance. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

type Outcome = SpeakResult | Error;

/** Backend that answers each `speak` immediately from a fixed script. */
class ScriptedBackend implements TtsBackend {
    readonly spoken: string[] = [];
    cancelCount = 0;

    constructor(private readonly outcomes: Outcome[] = []) {}

    speak(text: string): Promise<SpeakResult> {
        this.spoken.push(text);
        const outcome = this.outcomes.shift() ?? "completed";
        return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome);
    }

    cancel(): void {
        this.cancelCount++;
    }

    listVoices(): Promise<string[]> {
        return Promise.resolve([]);
    }

    dispose(): void {}
}

/**
 * Backend whose utterances finish only when the test says so, mirroring how the real
 * backends resolve an in-flight `speak` as "cancelled" when `cancel()` arrives.
 */
class ManualBackend implements TtsBackend {
    readonly spoken: string[] = [];
    cancelCount = 0;
    private pending: ((result: SpeakResult) => void) | null = null;

    speak(text: string): Promise<SpeakResult> {
        this.spoken.push(text);
        return new Promise<SpeakResult>((resolve) => {
            this.pending = resolve;
        });
    }

    finish(result: SpeakResult = "completed"): void {
        const resolve = this.pending;
        this.pending = null;
        resolve?.(result);
    }

    cancel(): void {
        this.cancelCount++;
        this.finish("cancelled");
    }

    listVoices(): Promise<string[]> {
        return Promise.resolve([]);
    }

    dispose(): void {}
}

const collectErrors = () => {
    const errors: Array<{ message: string; fatal: boolean }> = [];
    const handlers: SpeechEngineHandlers = {
        onSegment: () => {},
        onError: (error, fatal) => errors.push({ message: error.message, fatal }),
    };
    return { errors, handlers };
};

const silentHandlers: SpeechEngineHandlers = { onSegment: () => {}, onError: () => {} };

describe("SpeechEngine", () => {
    it("speaks every segment in document order", async () => {
        const backend = new ScriptedBackend();
        const engine = new SpeechEngine(backend, silentHandlers, "One. Two. Three.");

        await engine.start(OPTIONS);

        expect(backend.spoken).toEqual(["One.", "Two.", "Three."]);
    });

    it("reports each segment before speaking it", async () => {
        const seen: string[] = [];
        const backend = new ScriptedBackend();
        const engine = new SpeechEngine(
            backend,
            { onSegment: (segment) => seen.push(segment.raw), onError: () => {} },
            "One. Two.",
        );

        await engine.start(OPTIONS);

        expect(seen).toEqual(["One.", "Two."]);
    });

    it("restricts reading to the requested range", async () => {
        const backend = new ScriptedBackend();
        const engine = new SpeechEngine(backend, silentHandlers, "One. Two. Three.", { range: [5, 9] });

        await engine.start(OPTIONS);

        expect(backend.spoken).toEqual(["Two."]);
    });

    describe("stopping", () => {
        it("abandons the remaining segments", async () => {
            const backend = new ManualBackend();
            const engine = new SpeechEngine(backend, silentHandlers, "One. Two. Three.");

            const finished = engine.start(OPTIONS);
            await flush();
            expect(backend.spoken).toEqual(["One."]);

            engine.stop();
            await finished;

            expect(backend.spoken).toEqual(["One."]);
            expect(backend.cancelCount).toBe(1);
            expect(engine.isSpeaking).toBe(false);
        });

        it("treats a cancelled utterance as the end of reading", async () => {
            const backend = new ScriptedBackend(["cancelled"]);
            const engine = new SpeechEngine(backend, silentHandlers, "One. Two. Three.");

            await engine.start(OPTIONS);

            expect(backend.spoken).toEqual(["One."]);
        });

        it("is harmless when nothing is being read", () => {
            const backend = new ScriptedBackend();
            const engine = new SpeechEngine(backend, silentHandlers, "One.");

            expect(() => {
                engine.stop();
                engine.stop();
            }).not.toThrow();
            expect(backend.cancelCount).toBe(2);
        });

        it("does not let a stopped engine speak again once another has started", async () => {
            // The bug this guards against: shared "is stopping" state meant a newly started
            // engine could clear the flag and let a stopped engine resume mid-flight.
            const backend = new ManualBackend();
            const stopped = new SpeechEngine(backend, silentHandlers, "Old one. Old two.");

            const finished = stopped.start(OPTIONS);
            await flush();
            stopped.stop();

            const other = new SpeechEngine(backend, silentHandlers, "New one.");
            void other.start(OPTIONS);
            await finished;
            await flush();

            expect(backend.spoken).toEqual(["Old one.", "New one."]);
        });

        it("reports it is no longer speaking after finishing normally", async () => {
            const backend = new ScriptedBackend();
            const engine = new SpeechEngine(backend, silentHandlers, "One.");

            await engine.start(OPTIONS);

            expect(engine.isSpeaking).toBe(false);
        });
    });

    describe("failures", () => {
        it("skips a failing segment and carries on", async () => {
            const { errors, handlers } = collectErrors();
            const backend = new ScriptedBackend([new Error("device busy")]);
            const engine = new SpeechEngine(backend, handlers, "One. Two. Three.");

            await engine.start(OPTIONS);

            expect(backend.spoken).toEqual(["One.", "Two.", "Three."]);
            expect(errors).toEqual([{ message: "device busy", fatal: false }]);
        });

        it("gives up after five failures in a row and says so once", async () => {
            const { errors, handlers } = collectErrors();
            const backend = new ScriptedBackend(Array.from({ length: 5 }, () => new Error("no audio device")));
            const engine = new SpeechEngine(backend, handlers, "One. Two. Three. Four. Five. Six. Seven.");

            await engine.start(OPTIONS);

            expect(backend.spoken).toHaveLength(5);
            expect(errors.filter((e) => e.fatal)).toHaveLength(1);
            expect(errors[errors.length - 1].message).toContain("5 failures in a row");
            expect(errors[errors.length - 1].message).toContain("no audio device");
        });

        it("forgives earlier failures once a segment succeeds", async () => {
            const { errors, handlers } = collectErrors();
            const backend = new ScriptedBackend([
                new Error("a"),
                new Error("b"),
                new Error("c"),
                new Error("d"),
                "completed",
                new Error("e"),
            ]);
            const engine = new SpeechEngine(backend, handlers, "1. 2. 3. 4. 5. 6. 7.");

            await engine.start(OPTIONS);

            // Nothing is fatal, because the run of failures was broken before it reached five.
            expect(errors.every((e) => !e.fatal)).toBe(true);
            expect(backend.spoken).toHaveLength(7);
        });

        it("does not report an error for a segment that was stopped", async () => {
            const { errors, handlers } = collectErrors();
            const backend = new ManualBackend();
            const engine = new SpeechEngine(backend, handlers, "One. Two.");

            const finished = engine.start(OPTIONS);
            await flush();
            engine.stop();
            await finished;

            expect(errors).toEqual([]);
        });
    });

    it("does nothing for a document with no speakable text", async () => {
        const backend = new ScriptedBackend();
        const engine = new SpeechEngine(backend, silentHandlers, "   \n\n  ");

        await engine.start(OPTIONS);

        expect(backend.spoken).toEqual([]);
        expect(engine.isSpeaking).toBe(false);
    });
});
