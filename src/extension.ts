import * as vscode from "vscode";
// @ts-ignore
import * as cp from "child_process";
// @ts-ignore
import * as os from "os";
import { SpeechEngine, SpeechEnginePosition } from "./SpeechEngine";

let sessionVoice: string | null = null;
const getVoice = (): string => {
    if (sessionVoice) {
        return sessionVoice;
    }
    return vscode.workspace.getConfiguration("text-speaker").get<string>("voice") || "";
};
const getSpeed = (): number => vscode.workspace.getConfiguration("text-speaker").get<number>("speed") || 1;

let highlightDecorator: vscode.TextEditorDecorationType | null = null;

function updateHighlightDecorator() {
    if (highlightDecorator) {
        highlightDecorator.dispose();
    }
    const highlightColor = vscode.workspace.getConfiguration("text-speaker").get<string | null>("highlightColor");
    const backgroundColor = (highlightColor && highlightColor.length > 0) ? highlightColor : new vscode.ThemeColor("editor.wordHighlightStrongBackground");
    const borderColor = new vscode.ThemeColor("editor.wordHighlightStrongBorder");

    highlightDecorator = vscode.window.createTextEditorDecorationType({
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        borderWidth: "1px",
        borderStyle: "solid",
        overviewRulerColor: "blue",
        overviewRulerLane: vscode.OverviewRulerLane.Right
    });
}

function highlightRange({ startIndex, endIndex }: { startIndex: number; endIndex: number }) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    const startPos = activeEditor.document.positionAt(startIndex);
    const endPos = activeEditor.document.positionAt(endIndex);
    const range = new vscode.Range(startPos, endPos);
    const decoration = {
        range: range
    };

    if (!highlightDecorator) {
        updateHighlightDecorator();
    }

    if (highlightDecorator) {
        activeEditor.setDecorations(highlightDecorator, [decoration]);
    }
    activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

let currentEngine: SpeechEngine | null = null;
let disposeFns: vscode.Disposable[] = [];
const speech = {
    start(
        text: string,
        fileName: string,
        options?: {
            range?: [number, number];
            loc?: {
                start: SpeechEnginePosition;
                end?: SpeechEnginePosition;
            };
        }
    ) {
        if (currentEngine && currentEngine.status === "play") {
            this.stop();
        }
        disposeFns.push(
            vscode.workspace.onDidCloseTextDocument((event) => {
                const changedFileName = event.fileName;
                if (fileName === changedFileName) {
                    this.stop();
                }
            })
        );
        disposeFns.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                const changedFileName = event.document.fileName;
                if (fileName === changedFileName) {
                    this.stop();
                }
            })
        );
        currentEngine = new SpeechEngine(text, fileName, options);
        currentEngine.onChange((currentNode) => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                return;
            }
            // when open another file, does not highlight
            if (fileName !== activeEditor.document.fileName) {
                return;
            }
            highlightRange({
                startIndex: currentNode.range[0],
                endIndex: currentNode.range[1]
            });
        });

        // @ts-ignore
        currentEngine.on("error", (error: any) => {
            const message = error.message || error;
            if (message.includes("Stopped due to")) {
                vscode.window.showErrorMessage(`Text Speaker Error: ${message}`);
            } else {
                vscode.window.setStatusBarMessage(`$(error) Text Speaker: ${message}`, 3000);
            }
        });

        currentEngine.start(getVoice(), getSpeed());

        // Feedback: Show "Reading..." in status bar
        const statusMessage = vscode.window.setStatusBarMessage("$(megaphone) Reading...");
        disposeFns.push(statusMessage);
    },
    stop() {
        if (currentEngine) {
            currentEngine.reset();
        }
        if (highlightDecorator) {
            highlightDecorator.dispose();
            highlightDecorator = null;
        }
        disposeFns.forEach((disposable) => {
            disposable.dispose();
        });
        disposeFns = [];
    }
};
const speakCurrentSelection = (editor: vscode.TextEditor) => {
    const selection = editor.selection;
    if (!selection) return;

    const startPos = editor.selection.start;
    const endPos = editor.selection.end;
    speech.start(editor.document.getText(), editor.document.fileName, {
        range: [editor.document.offsetAt(startPos), editor.document.offsetAt(endPos)],
        loc: {
            start: {
                line: startPos.line + 1,
                column: startPos.character
            },
            end: {
                line: endPos.line + 1,
                column: endPos.character
            }
        }
    });
};

const speakDocument = (editor: vscode.TextEditor) => {
    speech.start(editor.document.getText(), editor.document.fileName);
};

const speakHere = (editor: vscode.TextEditor) => {
    const active = editor.selection.active;
    speech.start(editor.document.getText(), editor.document.fileName, {
        range: [editor.document.offsetAt(active), editor.document.getText().length],
        loc: {
            start: {
                line: active.line + 1,
                column: active.character
            }
        }
    });
};
const getVoices = (): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        if (os.platform() === 'darwin') {
            cp.exec('say -v ?', (err: any, stdout: any) => {
                if (err) return reject(err);
                const voices = stdout.split('\n').map((line: string) => {
                    // Extract name from "Name       Lang" format
                    // Matches "Name" before multiple spaces and language code
                    const match = line.match(/^(.+?)\s+[a-z]{2}_[A-Z]{2}/);
                    return match ? match[1].trim() : null;
                }).filter((v: string | null) => v !== null) as string[];
                resolve(voices);
            });
        } else if (os.platform() === 'win32') {
             const command = `powershell -Command "& {Add-Type -AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }}"`;
             cp.exec(command, (err: any, stdout: any) => {
                 if (err) return reject(err);
                 const voices = stdout.split('\r\n').map((v: string) => v.trim()).filter((v: string) => v.length > 0);
                 resolve(voices);
             });
        } else {
            resolve([]);
        }
    });
};

const selectVoice = async () => {
    try {
        const voices = await getVoices();
        if (voices.length === 0) {
            vscode.window.showWarningMessage("No voices found or platform not supported for listing voices.");
            return;
        }
        const currentVoice = getVoice();
        const selected = await vscode.window.showQuickPick(voices, {
            placeHolder: "Select a voice for reading text",
        });
        if (selected) {
            sessionVoice = selected;
            try {
                await vscode.workspace.getConfiguration("text-speaker").update("voice", selected, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Voice set to: ${selected}`);
            } catch (error) {
                console.warn("Failed to save to Global, trying implicit target", error);
                try {
                    await vscode.workspace.getConfiguration("text-speaker").update("voice", selected);
                    vscode.window.showInformationMessage(`Voice set to: ${selected}`);
                } catch (error) {
                    vscode.window.showInformationMessage(`Voice selected (session only): ${selected}`);
                }
            }
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to list voices: ${error.message}`);
    }
};

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand("text-speaker.speakDocument", editor => {
            speech.stop();
            if (!editor) return;
            // Play or Resume
            speakDocument(editor);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand("text-speaker.speakHere", editor => {
            speech.stop();
            if (!editor) return;
            speakHere(editor);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand("text-speaker.speakSelection", editor => {
            speech.stop();
            if (!editor) return;
            speakCurrentSelection(editor);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("text-speaker.stopSpeaking", () => {
            speech.stop();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("text-speaker.selectVoice", () => {
            selectVoice();
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration("text-speaker.highlightColor")) {
                updateHighlightDecorator();
            }
        })
    );
}
