# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0]

### Security

- **Fixed arbitrary code execution when reading a document on Windows.** Text was interpolated
  into a PowerShell command string, and `$` and backticks were not escaped, so a document
  containing a `$(...)` subexpression ran it as PowerShell simply by being read aloud. The
  configured voice name was interpolated the same way. Text and voice names are now passed to
  the speech host as base64 data over stdin and never appear on a command line. Covered by a
  regression test.

### Fixed

- **Long documents are read to the end.** Reading silently stopped at 500,000 characters, so a
  2 MB file had three quarters of it never read out. The "windowed parsing" that 1.0.0 described
  now genuinely exists: text is split a window at a time as reading progresses, so reading still
  begins immediately no matter the file size.
- **Stop now stops.** Pressing stop (or starting a new read) just as reading began could let a
  sentence be spoken in full anyway, because a cancel arriving before the utterance started was
  dropped.
- **Removed a crash in the extension host.** Reading errors were emitted on the `error` event of
  an `EventEmitter` whose listeners had already been removed, which throws. Errors are now
  delivered through an explicit callback.
- **Stopping no longer freezes the editor.** Speech was terminated with a synchronous
  `taskkill`, which blocked the extension host. The resident speech host is asked to cancel
  instead.
- **Highlighting follows the right editor.** It was applied to whichever editor was active, and
  the highlight could be left behind after switching files.
- **The declared minimum VS Code version is now honoured.** `@types/vscode` floated to the
  latest release while `engines.vscode` claimed `^1.60.0`, so APIs missing from 1.60 would have
  compiled.

### Changed

- Speech now runs through one resident PowerShell host instead of launching `powershell.exe` per
  sentence. Measured on five short sentences: **4099 ms per sentence to 1873 ms**.
- Platform handling is behind a `TtsBackend` interface (`WindowsSapiBackend`, `SayBackend`)
  rather than spread across the extension and the engine.
- Dropped 9 unused runtime dependencies, leaving `say` and `sentence-splitter`. `src/parser.ts`
  was dead code left over from the removed textlint-based Markdown parsing.
- Added tests (93) covering segmentation, offsets, windowing, and engine state, plus an opt-in
  suite that drives a real speech host: `TEXT_SPEAKER_AUDIO_TESTS=1 npx vitest run src/tts`.
- Development commands are now `npm run check` (typecheck, lint, format, test), with ESLint and
  a working `pre-commit` hook — the previous hook was registered as `precommit` and never ran.

### Known gaps

- `SpeechEngine.pause()` was removed rather than fixed. It was never bound to a command and its
  body was identical to a full stop, so resuming was not implemented.
- Reading is still plain-text: the Markdown, plain-text and re:VIEW AST parsing from the original
  project is not present, so Markdown syntax is read literally.

## [1.0.0] - 2026-02-14

### Added

- **Initial Release**: Modernized and high-stability version of the text-to-speech extension.
- **Large File Optimization**: Introduced a windowed parsing logic that allows instant speech on documents with tens of thousands of lines without freezing the editor.
- **Improved Windows Support**: Implemented a direct PowerShell-based speech engine for Windows to ensure reliable process control and consistent voice quality.
- **Newline-Aware Parsing**: Added logic to treat newlines as sentence boundaries, making it perfect for reading bullet points, lists, and code comments.
- **Strict Selection Reading**: Enhanced the "Speak Selection" command to strictly parse and read only the chosen range.
- **High-Stability Stop**: Refined process management to ensure speech termination is immediate and reliable.
- **Derivative Editor Support**: Verified compatibility with VS Code, Cursor, VSCodium, and Azure Data Studio.
- **Visual Sync**: Synchronized text highlighting with the active speech node, with customizable background colors.
- **Voice Selection**: Integrated a system-wide voice selection menu.

### Credits

- Based on the original [vscode-read-aloud-text](https://github.com/azu/vscode-read-aloud-text) project by [azu](https://github.com/azu).
