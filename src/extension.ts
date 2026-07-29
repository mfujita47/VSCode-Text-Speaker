import * as vscode from "vscode";
import { SpeechEngine } from "./SpeechEngine";
import { SegmentOptions, SpeechSegment } from "./segmentText";
import { createTtsBackend, SpeakOptions, TtsBackend } from "./tts";

const CONFIG_SECTION = "text-speaker";

/**
 * Voice chosen through the picker but not persisted, because writing the setting failed.
 * Applies for the rest of the window's lifetime only.
 */
let sessionVoice: string | null = null;

const readSpeakOptions = (): SpeakOptions => {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return {
        voice: sessionVoice ?? config.get<string>("voice") ?? "",
        speed: config.get<number>("speed") ?? 1,
    };
};

/** The visible editor showing `document`, if any. Reading survives the editor losing focus. */
const visibleEditorFor = (document: vscode.TextDocument): vscode.TextEditor | undefined =>
    vscode.window.visibleTextEditors.find((editor) => editor.document === document);

/**
 * Owns the decoration type used to mark the segment being spoken.
 *
 * The decoration type is created once and cleared by setting an empty range, rather than
 * being disposed and rebuilt on every stop. It is recreated only when the colour setting
 * changes, since that is the one thing baked into the type itself.
 */
class SpeechHighlighter implements vscode.Disposable {
    private decoration = SpeechHighlighter.createDecoration();
    private marked: vscode.TextEditor | null = null;

    private static createDecoration(): vscode.TextEditorDecorationType {
        const configured = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string | null>("highlightColor");
        const backgroundColor =
            configured && configured.length > 0
                ? configured
                : new vscode.ThemeColor("editor.wordHighlightStrongBackground");

        return vscode.window.createTextEditorDecorationType({
            backgroundColor,
            borderColor: new vscode.ThemeColor("editor.wordHighlightStrongBorder"),
            borderWidth: "1px",
            borderStyle: "solid",
            overviewRulerColor: new vscode.ThemeColor("editor.wordHighlightStrongBackground"),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
        });
    }

    show(editor: vscode.TextEditor, [startIndex, endIndex]: [number, number]): void {
        const range = new vscode.Range(editor.document.positionAt(startIndex), editor.document.positionAt(endIndex));
        editor.setDecorations(this.decoration, [{ range }]);
        this.marked = editor;
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    clear(): void {
        this.marked?.setDecorations(this.decoration, []);
        this.marked = null;
    }

    /** Rebuild the decoration type after the colour setting changed. */
    reload(): void {
        this.clear();
        this.decoration.dispose();
        this.decoration = SpeechHighlighter.createDecoration();
    }

    dispose(): void {
        this.clear();
        this.decoration.dispose();
    }
}

/**
 * One run of reading a document: the engine, the highlight, and the listeners that abandon
 * it when the document changes underneath.
 */
class ReadingSession implements vscode.Disposable {
    private readonly engine: SpeechEngine;
    private readonly disposables: vscode.Disposable[] = [];
    private stopped = false;

    constructor(
        backend: TtsBackend,
        private readonly highlighter: SpeechHighlighter,
        private readonly document: vscode.TextDocument,
        options: SegmentOptions | undefined,
        private readonly onFinished: (session: ReadingSession) => void,
    ) {
        this.engine = new SpeechEngine(
            backend,
            {
                onSegment: (segment) => this.highlight(segment),
                onError: (error, fatal) => reportSpeechError(error, fatal),
            },
            document.getText(),
            options,
        );

        // Segment offsets are taken from a snapshot of the text, so any edit invalidates them.
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (event.document === this.document && event.contentChanges.length > 0) {
                    this.dispose();
                }
            }),
            vscode.workspace.onDidCloseTextDocument((closed) => {
                if (closed === this.document) {
                    this.dispose();
                }
            }),
            vscode.window.setStatusBarMessage("$(megaphone) Text Speaker: reading..."),
        );
    }

    start(options: SpeakOptions): void {
        void this.engine.start(options).finally(() => {
            if (!this.stopped) {
                this.dispose();
            }
        });
    }

    private highlight(segment: SpeechSegment): void {
        const editor = visibleEditorFor(this.document);
        if (editor) {
            this.highlighter.show(editor, segment.range);
        }
    }

    dispose(): void {
        if (this.stopped) {
            return;
        }
        this.stopped = true;
        this.engine.stop();
        this.highlighter.clear();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
        this.onFinished(this);
    }
}

const reportSpeechError = (error: Error, fatal: boolean): void => {
    if (fatal) {
        void vscode.window.showErrorMessage(`Text Speaker: ${error.message}`);
    } else {
        vscode.window.setStatusBarMessage(`$(error) Text Speaker: ${error.message}`, 3000);
    }
};

export function activate(context: vscode.ExtensionContext) {
    const backend = createTtsBackend();
    const highlighter = new SpeechHighlighter();
    let session: ReadingSession | null = null;

    const stopReading = () => {
        session?.dispose();
        session = null;
    };

    const startReading = (editor: vscode.TextEditor, options?: SegmentOptions) => {
        stopReading();
        const started = new ReadingSession(backend, highlighter, editor.document, options, (finished) => {
            if (session === finished) {
                session = null;
            }
        });
        session = started;
        started.start(readSpeakOptions());
    };

    const selectVoice = async () => {
        let voices: string[];
        try {
            voices = await backend.listVoices();
        } catch (error) {
            void vscode.window.showErrorMessage(`Text Speaker: could not list voices. ${describe(error)}`);
            return;
        }
        if (voices.length === 0) {
            void vscode.window.showWarningMessage("Text Speaker: no voices are available on this platform.");
            return;
        }

        const selected = await vscode.window.showQuickPick(voices, {
            placeHolder: "Select a voice for reading text",
        });
        if (!selected) {
            return;
        }

        try {
            await vscode.workspace
                .getConfiguration(CONFIG_SECTION)
                .update("voice", selected, vscode.ConfigurationTarget.Global);
            sessionVoice = null;
            void vscode.window.showInformationMessage(`Text Speaker: voice set to ${selected}.`);
        } catch (error) {
            // Persisting can fail in restricted environments; still honour the choice for now.
            sessionVoice = selected;
            void vscode.window.showWarningMessage(
                `Text Speaker: using ${selected} for this session only, could not save the setting. ${describe(error)}`,
            );
        }
    };

    context.subscriptions.push(
        backend,
        highlighter,
        new vscode.Disposable(stopReading),

        vscode.commands.registerTextEditorCommand("text-speaker.speakDocument", (editor) => {
            startReading(editor);
        }),

        vscode.commands.registerTextEditorCommand("text-speaker.speakHere", (editor) => {
            const from = editor.document.offsetAt(editor.selection.active);
            startReading(editor, { range: [from, editor.document.getText().length] });
        }),

        vscode.commands.registerTextEditorCommand("text-speaker.speakSelection", (editor) => {
            const { start, end } = editor.selection;
            startReading(editor, {
                range: [editor.document.offsetAt(start), editor.document.offsetAt(end)],
            });
        }),

        vscode.commands.registerCommand("text-speaker.stopSpeaking", stopReading),

        vscode.commands.registerCommand("text-speaker.selectVoice", () => void selectVoice()),

        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(`${CONFIG_SECTION}.highlightColor`)) {
                highlighter.reload();
            }
            if (event.affectsConfiguration(`${CONFIG_SECTION}.voice`)) {
                // An explicit setting change supersedes a session-only override.
                sessionVoice = null;
            }
        }),
    );
}

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));
