import * as cp from "child_process";
import { SpeakOptions, SpeakResult, TtsBackend } from "./types";

/**
 * The PowerShell side of the backend: one long-lived host process driven over stdin/stdout.
 *
 * Two properties matter, and together they are the whole reason this is a resident process
 * rather than one `powershell.exe` per sentence:
 *
 *  - Text never appears on a command line. It arrives base64-encoded on stdin and is decoded
 *    into a variable, so document contents cannot escape into PowerShell syntax.
 *  - Sentences are spoken without paying process startup and `Add-Type` cost each time.
 *
 * Commands are handled while an utterance is in flight, which is why stdin is read through a
 * `StreamReader` over the raw handle: `[Console]::In` is a synchronised reader whose
 * `ReadLineAsync` blocks, which would make `cancel` land only after the utterance ended.
 *
 * Wire format, one command or reply per line, every payload base64 so the transport stays
 * pure ASCII and free of delimiters:
 *
 *   -> speak <id> <b64 text>     <- done <id>
 *   -> voice <id> <b64 name>     <- done <id>
 *   -> rate <id> <int>           <- done <id>
 *   -> cancel <id>               <- done <id>
 *   -> voices <id>               <- voices <id> <b64 names joined by LF>
 *   -> quit <id>                 <- err <id> <b64 message>
 */
const HOST_SCRIPT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToDefaultAudioDevice()

$stdin = New-Object IO.StreamReader([Console]::OpenStandardInput(), [Text.Encoding]::ASCII)
$stdout = [Console]::Out

function Send([string]$s) { $stdout.WriteLine($s); $stdout.Flush() }
function Enc([string]$s) { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($s)) }
function Dec([string]$s) { [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)) }

$prompt = $null
$promptId = $null
$pending = $null
$running = $true

Send 'ready'

while ($running) {
    if ($null -eq $pending) { $pending = $stdin.ReadLineAsync() }
    $timeout = if ($null -ne $prompt) { 20 } else { 200 }

    if ($pending.Wait($timeout)) {
        $line = $pending.Result
        $pending = $null
        if ($null -eq $line) { break }
        $parts = $line.Split(' ')
        $id = if ($parts.Length -gt 1) { $parts[1] } else { '0' }
        try {
            switch ($parts[0]) {
                'speak' {
                    $promptId = $id
                    $prompt = $synth.SpeakAsync((Dec $parts[2]))
                }
                'voice' { $synth.SelectVoice((Dec $parts[2])); Send ('done ' + $id) }
                'rate' { $synth.Rate = [int]$parts[2]; Send ('done ' + $id) }
                'cancel' {
                    $synth.SpeakAsyncCancelAll()
                    $prompt = $null
                    $promptId = $null
                    Send ('done ' + $id)
                }
                'voices' {
                    $names = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name })
                    Send ('voices ' + $id + ' ' + (Enc ([string]::Join([char]10, $names))))
                }
                'quit' { $synth.SpeakAsyncCancelAll(); $running = $false }
                default { Send ('err ' + $id + ' ' + (Enc ('unknown command: ' + $parts[0]))) }
            }
        } catch {
            Send ('err ' + $id + ' ' + (Enc $_.Exception.Message))
            if ($parts[0] -eq 'speak') { $prompt = $null; $promptId = $null }
        }
    }

    if ($null -ne $prompt -and $prompt.IsCompleted) {
        Send ('done ' + $promptId)
        $prompt = $null
        $promptId = $null
    }
}

$synth.Dispose()
`;

/** How long the host is given to exit on its own before it is killed. */
const QUIT_GRACE_MS = 1000;

/** Longest stderr excerpt kept for diagnosing a host that dies at startup. */
const STDERR_TAIL_LIMIT = 500;

type Reply = { kind: "done" } | { kind: "cancelled" } | { kind: "voices"; voices: string[] };

type Pending = {
    resolve: (reply: Reply) => void;
    reject: (error: Error) => void;
};

export class WindowsSapiBackend implements TtsBackend {
    private host: cp.ChildProcess | null = null;
    private stdoutBuffer = "";
    private stderrTail = "";
    private nextId = 1;
    private readonly pending = new Map<string, Pending>();

    /** Settings the live host already knows about, so they are re-sent only when they change. */
    private appliedVoice: string | null = null;
    private appliedRate: number | null = null;

    private currentSpeakId: string | null = null;
    private disposed = false;

    /**
     * Incremented by {@link cancel}. Applying voice and rate takes a round trip to the host,
     * and a cancel arriving during it has no utterance to stop yet; comparing this afterwards
     * keeps that cancel from being lost and letting the utterance start anyway.
     */
    private cancelEpoch = 0;

    async speak(text: string, options: SpeakOptions): Promise<SpeakResult> {
        const epoch = this.cancelEpoch;
        await this.applySettings(options);
        if (epoch !== this.cancelEpoch) {
            return "cancelled";
        }

        const id = this.newId();
        this.currentSpeakId = id;
        try {
            const reply = await this.request(id, `speak ${id} ${encode(text)}`);
            return reply.kind === "cancelled" ? "cancelled" : "completed";
        } finally {
            if (this.currentSpeakId === id) {
                this.currentSpeakId = null;
            }
        }
    }

    cancel(): void {
        this.cancelEpoch++;
        const id = this.currentSpeakId;
        this.currentSpeakId = null;
        if (id !== null) {
            // Settle the caller now rather than waiting for the host to acknowledge: as far
            // as the extension is concerned the utterance is over. The host's later `done`
            // for this id finds no pending entry and is ignored.
            this.settle(id, (entry) => entry.resolve({ kind: "cancelled" }));
        }
        if (this.host && !this.disposed) {
            try {
                this.write(`cancel ${this.newId()}`);
            } catch {
                // Nothing to cancel if the host has already gone away.
            }
        }
    }

    async listVoices(): Promise<string[]> {
        const id = this.newId();
        const reply = await this.request(id, `voices ${id}`);
        return reply.kind === "voices" ? reply.voices : [];
    }

    dispose(): void {
        this.disposed = true;
        const host = this.host;
        // Clear `host` first so the exit handler below sees it is no longer the live host
        // and does not report the shutdown as an unexpected failure.
        this.host = null;
        this.currentSpeakId = null;
        this.rejectAll(new Error("Speech host was shut down"));
        if (!host) {
            return;
        }
        try {
            host.stdin?.write(`quit ${this.newId()}\n`);
        } catch {
            // Already gone; the kill below is enough.
        }
        const killTimer = setTimeout(() => host.kill(), QUIT_GRACE_MS);
        // Never hold the extension host's event loop open just to kill a dying process.
        killTimer.unref();
        host.once("exit", () => clearTimeout(killTimer));
    }

    /**
     * Bring the host's voice and rate in line with `options`.
     *
     * `ensureHost()` runs first because spawning a fresh host resets what it knows, and the
     * change detection below must compare against that reset state.
     */
    private async applySettings(options: SpeakOptions): Promise<void> {
        this.ensureHost();

        const rate = toSapiRate(options.speed);
        if (rate !== this.appliedRate) {
            const id = this.newId();
            await this.request(id, `rate ${id} ${rate}`);
            this.appliedRate = rate;
        }

        // An empty voice means "leave the host on its default", which is where it starts.
        if (options.voice !== "" && options.voice !== this.appliedVoice) {
            const id = this.newId();
            await this.request(id, `voice ${id} ${encode(options.voice)}`);
            this.appliedVoice = options.voice;
        }
    }

    private ensureHost(): cp.ChildProcess {
        if (this.disposed) {
            throw new Error("Speech host was shut down");
        }
        if (this.host) {
            return this.host;
        }

        // -EncodedCommand removes every layer of command-line quoting for the script itself
        // and leaves stdin free for the protocol.
        const encodedScript = Buffer.from(HOST_SCRIPT, "utf16le").toString("base64");
        const host = cp.spawn(
            "powershell",
            ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedScript],
            { windowsHide: true },
        );

        this.host = host;
        this.stdoutBuffer = "";
        this.stderrTail = "";
        this.appliedVoice = null;
        this.appliedRate = null;

        host.stdout?.setEncoding("ascii");
        host.stdout?.on("data", (chunk: string) => this.consume(chunk));
        host.stderr?.setEncoding("utf8");
        host.stderr?.on("data", (chunk: string) => {
            // Keep only the tail: a startup failure is what matters here, not progress noise.
            this.stderrTail = (this.stderrTail + chunk).slice(-STDERR_TAIL_LIMIT);
        });
        host.on("error", (error) => this.onHostGone(host, error));
        host.on("exit", () => this.onHostGone(host, null));

        return host;
    }

    private onHostGone(host: cp.ChildProcess, error: Error | null): void {
        if (this.host !== host) {
            return;
        }
        this.host = null;
        this.currentSpeakId = null;
        const detail = error ? error.message : this.stderrTail.trim() || "host exited unexpectedly";
        this.rejectAll(new Error(`Speech host stopped: ${detail}`));
    }

    private consume(chunk: string): void {
        this.stdoutBuffer += chunk;
        let newline: number;
        while ((newline = this.stdoutBuffer.indexOf("\n")) >= 0) {
            const line = this.stdoutBuffer.slice(0, newline).replace(/\r$/, "");
            this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
            this.handle(line);
        }
    }

    private handle(line: string): void {
        const [kind, id, payload] = line.split(" ");
        switch (kind) {
            case "done":
                this.settle(id, (entry) => entry.resolve({ kind: "done" }));
                return;
            case "voices":
                this.settle(id, (entry) =>
                    entry.resolve({
                        kind: "voices",
                        voices: payload ? decode(payload).split("\n").filter(Boolean) : [],
                    }),
                );
                return;
            case "err":
                this.settle(id, (entry) => entry.reject(new Error(payload ? decode(payload) : "unknown error")));
                return;
            default:
                // "ready" and anything unrecognised need no action: each request is settled
                // by its own reply, so a stray line is harmless.
                return;
        }
    }

    private settle(id: string, apply: (entry: Pending) => void): void {
        const entry = this.pending.get(id);
        if (!entry) {
            return;
        }
        this.pending.delete(id);
        apply(entry);
    }

    private rejectAll(error: Error): void {
        const entries = [...this.pending.values()];
        this.pending.clear();
        for (const entry of entries) {
            entry.reject(error);
        }
    }

    private newId(): string {
        return String(this.nextId++);
    }

    /**
     * Register interest in `id`'s reply and then send `line`, starting the host if needed.
     *
     * The pending entry is recorded inside the Promise constructor, which runs synchronously,
     * so it is in place before any reply can be read off stdout.
     */
    private request(id: string, line: string): Promise<Reply> {
        return new Promise<Reply>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            try {
                this.ensureHost();
                this.write(line);
            } catch (error) {
                this.pending.delete(id);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    private write(line: string): void {
        const stdin = this.host?.stdin;
        if (!stdin) {
            throw new Error("Speech host is not running");
        }
        stdin.write(`${line}\n`);
    }
}

const encode = (value: string): string => Buffer.from(value, "utf8").toString("base64");
const decode = (value: string): string => Buffer.from(value, "base64").toString("utf8");

/**
 * Map a rate multiplier onto SAPI's -10..10 integer scale.
 *
 * The result is interpolated into a protocol line, so it must always be a plain integer;
 * exported so that invariant can be tested.
 */
export const toSapiRate = (speed: number): number => {
    if (!Number.isFinite(speed)) {
        return 0;
    }
    return Math.max(-10, Math.min(10, Math.round((speed - 1) * 5)));
};
