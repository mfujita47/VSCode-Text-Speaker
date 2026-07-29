/** Why a `speak()` call finished. */
export type SpeakResult = "completed" | "cancelled";

export interface SpeakOptions {
    /** Platform-specific voice name. An empty string means "use the system default". */
    voice: string;
    /** Speech rate as a multiplier, where 1 is the platform's normal rate. */
    speed: number;
}

/**
 * A platform's text-to-speech facility.
 *
 * Implementations must never build a shell or interpreter command that embeds `text`
 * or `voice`: document contents are untrusted, and interpolating them into a command
 * string is a code-execution hole.
 */
export interface TtsBackend {
    /**
     * Speak `text`, resolving once it has been spoken in full, or as soon as
     * `cancel()` cuts it short. Rejects only on a genuine synthesis failure.
     */
    speak(text: string, options: SpeakOptions): Promise<SpeakResult>;

    /** Abort the utterance in flight. Must be safe to call when nothing is being spoken. */
    cancel(): void;

    /** Voice names accepted by `SpeakOptions.voice`, or `[]` where enumeration is unsupported. */
    listVoices(): Promise<string[]>;

    /** Release any long-lived resources. The backend is unusable afterwards. */
    dispose(): void;
}
