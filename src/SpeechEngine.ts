import { iterateSegments, SegmentOptions, SpeechSegment } from "./segmentText";
import { SpeakOptions, TtsBackend } from "./tts";

/** How many failures in a row before reading is abandoned rather than limped through. */
const MAX_CONSECUTIVE_ERRORS = 5;

export interface SpeechEngineHandlers {
    /** Called just before a segment is spoken, so the editor can follow along. */
    onSegment(segment: SpeechSegment): void;
    /**
     * Called when a segment could not be spoken. `fatal` means reading has been abandoned;
     * otherwise the engine skipped the segment and carried on.
     */
    onError(error: Error, fatal: boolean): void;
}

/**
 * Reads one document's segments in order through a {@link TtsBackend}.
 *
 * The engine owns no process and no module-level state: every instance tracks its own
 * position and its own generation, so a stopped engine can never disturb a later one.
 * The backend is injected and outlives individual engines, which is what lets the Windows
 * speech host stay resident between reads.
 */
export class SpeechEngine {
    /**
     * Segments are pulled one at a time rather than built up front, so reading starts
     * immediately however large the document is.
     */
    private readonly segments: Iterator<SpeechSegment>;
    private speaking = false;

    /**
     * Bumped by {@link stop}. Work in flight compares the generation it started under
     * against the current one and abandons itself if they differ, which makes stopping
     * reliable without any shared "is stopping" flag.
     */
    private generation = 0;

    constructor(
        private readonly backend: TtsBackend,
        private readonly handlers: SpeechEngineHandlers,
        text: string,
        options?: SegmentOptions,
    ) {
        this.segments = iterateSegments(text, options);
    }

    get isSpeaking(): boolean {
        return this.speaking;
    }

    /** Resolves when reading finishes, is stopped, or is abandoned after repeated failures. */
    async start(options: SpeakOptions): Promise<void> {
        const generation = ++this.generation;
        this.speaking = true;
        let consecutiveErrors = 0;

        try {
            while (this.generation === generation) {
                const next = this.segments.next();
                if (next.done) {
                    return;
                }

                const segment = next.value;
                const text = segment.raw.trim();
                if (text.length === 0) {
                    continue;
                }

                this.handlers.onSegment(segment);

                try {
                    const result = await this.backend.speak(text, options);
                    if (this.generation !== generation || result === "cancelled") {
                        return;
                    }
                    consecutiveErrors = 0;
                } catch (error) {
                    if (this.generation !== generation) {
                        return;
                    }
                    consecutiveErrors++;
                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        this.handlers.onError(
                            new Error(`Stopped after ${consecutiveErrors} failures in a row: ${describe(error)}`),
                            true,
                        );
                        return;
                    }
                    // Skip the segment that failed and carry on with the next one.
                    this.handlers.onError(new Error(describe(error)), false);
                }
            }
        } finally {
            if (this.generation === generation) {
                this.speaking = false;
            }
        }
    }

    /** Abandon reading. Safe to call repeatedly and when nothing is being read. */
    stop(): void {
        this.generation++;
        this.speaking = false;
        this.backend.cancel();
    }
}

const describe = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};
