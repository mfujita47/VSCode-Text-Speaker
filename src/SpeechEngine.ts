import * as say from "say";
import * as os from "os";
import * as cp from "child_process";
import { TxtNode, ASTNodeTypes } from "@textlint/ast-node-types";
import { split } from "sentence-splitter";
import { EventEmitter } from "events";

/**
 *  Line number starts with 1.
 *  Column number starts with 0.
 */
export type SpeechEnginePosition = { line: number; column: number };

let currentWindowsProcess: cp.ChildProcess | null = null;
let isStopping = false;

export class SpeechEngine extends EventEmitter {
    private txtNodes: TxtNode[];
    private speechIndex: number;

    public status: "pause" | "play" | "stop" = "stop";
    constructor(
        text: string,
        filePath: string,
        options?: {
            range?: [number, number];
            loc?: {
                start: SpeechEnginePosition;
                end?: SpeechEnginePosition;
            };
        }
    ) {
        super();
        this.speechIndex = 0;
        this.txtNodes = this.parseText(text, options);
    }

    private parseText(
        text: string,
        options?: { range?: [number, number]; loc?: { start: SpeechEnginePosition; end?: SpeechEnginePosition } }
    ): TxtNode[] {
        let startCharIndex = 0;
        let endCharIndex = text.length;

        if (options?.range) {
            startCharIndex = options.range[0];
            endCharIndex = options.range[1];
        } else if (options?.loc) {
            let currentLine = 1;
            let index = 0;
            const lines = text.split(/\r?\n/);
            for (const line of lines) {
                if (currentLine === options.loc.start.line) {
                    startCharIndex = index + options.loc.start.column;
                }
                if (options.loc.end && currentLine === options.loc.end.line) {
                    endCharIndex = index + options.loc.end.column;
                }
                const isCRLF = text[index + line.length] === "\r";
                index += line.length + (isCRLF ? 2 : 1);
                currentLine++;
            }
        }

        // Optimization and Strict Range Limiting:
        let offset = 0;
        let textToParse = text;

        // If a specific range is requested (Speak Selection or Speak Here), 
        // we should ideally only parse that range to be strict.
        const isRangeStrict = !!(options?.range || (options?.loc && options?.loc.end));
        
        if (isRangeStrict) {
            // Strictly parse only the selected range
            textToParse = text.substring(startCharIndex, endCharIndex);
            offset = startCharIndex;
        } else {
            // Optimization for large files (Speak Document or Speak Here without end)
            const LARGE_FILE_THRESHOLD = 100000;
            const PARSE_WINDOW = 50000; 

            if (text.length > LARGE_FILE_THRESHOLD) {
                const sliceStart = Math.max(0, startCharIndex - 200);
                const targetEnd = text.length;
                const sliceEnd = Math.min(text.length, Math.max(startCharIndex + PARSE_WINDOW, targetEnd));
                
                const MAX_SLICE_SIZE = 500000; 
                const finalSliceEnd = Math.min(sliceEnd, sliceStart + MAX_SLICE_SIZE);
                
                textToParse = text.substring(sliceStart, finalSliceEnd);
                offset = sliceStart;
            }
        }

        const allNodes = split(textToParse);
        const sentenceNodes = allNodes.filter((node) => node.type === "Sentence") as TxtNode[];

        // Further split sentences by newlines to handle bullet points and lines without punctuation
        const fineGrainedNodes: TxtNode[] = [];
        for (const node of sentenceNodes) {
            const lines = node.raw.split(/(\r?\n)/);
            let currentOffset = node.range[0];
            
            for (const line of lines) {
                if (line.match(/^\r?\n$/)) {
                    currentOffset += line.length;
                    continue;
                }
                if (line.trim().length > 0) {
                    const start = currentOffset;
                    const end = currentOffset + line.length;
                    fineGrainedNodes.push({
                        ...node,
                        raw: line,
                        range: [start, end]
                    } as TxtNode);
                }
                currentOffset += line.length;
            }
        }

        return fineGrainedNodes
            .map((node) => {
                return {
                    ...node,
                    range: [node.range[0] + offset, node.range[1] + offset] as [number, number]
                };
            })
            .filter((node) => {
                const [nodeStart, nodeEnd] = node.range;
                // Strict overlap check with the requested range
                const isOverlapping = Math.max(startCharIndex, nodeStart) < Math.min(endCharIndex, nodeEnd);
                return isOverlapping && nodeEnd > startCharIndex && node.raw.trim().length > 0;
            });
    }

    onChange(handler: (currentSpeechNode: TxtNode) => void) {
        this.on("CHANGE", handler);
    }

    start(voice: string, speed: number) {
        this.status = "play";
        isStopping = false;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 5;
        const next = () => {
            if (this.status !== "play" || isStopping) {
                return;
            }
            if (this.speechIndex < 0 || this.speechIndex >= this.txtNodes.length) {
                this.status = "stop";
                return;
            }
            const node = this.txtNodes[this.speechIndex];
            if (!node) {
                this.status = "stop";
                return;
            }
            const text = node.raw;
            this.emit("CHANGE", node);

            speakText(text, voice, speed)
                .then(() => {
                    if (isStopping) return;
                    consecutiveErrors = 0;
                    this.speechIndex++;
                    // Add a small delay between sentences
                    setTimeout(() => next(), 100);
                })
                .catch((error) => {
                    if (isStopping) return;
                    consecutiveErrors++;
                    stopSpeaking();
                    
                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        this.status = "stop";
                        this.emit("error", new Error(`Stopped due to too many consecutive errors: ${error.message || error}`));
                        return;
                    }
                    this.emit("error", error);
                    this.speechIndex++;
                    setTimeout(() => next(), 200);
                });
        };
        next();
    }

    pause() {
        this.status = "pause";
        isStopping = true;
        this.removeAllListeners();
        stopSpeaking();
    }

    reset() {
        this.status = "stop";
        isStopping = true;
        this.removeAllListeners();
        stopSpeaking();
        this.speechIndex = 0;
    }
}

const stopSpeaking = () => {
    if (os.platform() === "win32") {
        if (currentWindowsProcess) {
            try {
                // Try to kill the process and its children
                cp.execSync(`taskkill /F /T /PID ${currentWindowsProcess.pid}`, { stdio: 'ignore' });
            } catch (e) {
                // ignore errors if process already dead
            }
            currentWindowsProcess = null;
        }
    } else {
        say.stop();
    }
};

const speakText = (text: string, voice: string, speed: number): Promise<void> => {
    text = text.trim();
    if (text.length === 0 || isStopping) {
        return Promise.resolve();
    }

    if (os.platform() === "win32") {
        return new Promise((resolve, reject) => {
            const escapedText = text.replace(/'/g, "''").replace(/"/g, '`"');
            const voiceScript = voice ? `$speak.SelectVoice('${voice}');` : "";
            const rate = Math.max(-10, Math.min(10, Math.round((speed - 1) * 5)));

            const command = `Add-Type -AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; ${voiceScript} $speak.Rate = ${rate}; $speak.Speak("${escapedText}")`;

            currentWindowsProcess = cp.spawn("powershell", ["-Command", `& {${command}}`]);

            let isFinished = false;
            
            const cleanup = () => {
                if (isFinished) return;
                isFinished = true;
                if (currentWindowsProcess) {
                    currentWindowsProcess.removeAllListeners();
                }
                currentWindowsProcess = null;
            };

            currentWindowsProcess.on("exit", (code) => {
                cleanup();
                resolve();
            });

            currentWindowsProcess.on("error", (err) => {
                cleanup();
                reject(err);
            });
        });
    }

    return new Promise((resolve, reject) => {
        say.speak(text, voice, speed, (error: any) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};
