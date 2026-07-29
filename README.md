# 🎙️ Text Speaker: High-Performance Text-to-Speech for VS Code

**Text Speaker** is a professional TTS (Text-to-Speech) extension for VS Code, designed to provide a smooth and focused reading experience. It intelligently parses your documents and synchronizes speech with visual highlighting, making it ideal for proofreading, accessibility, and focused learning.

## ✨ Key Features

- **🚀 Massive Document Support**: Optimized to handle files with tens of thousands of lines without any lag or editor freezing. Speech starts instantly, regardless of the document's scale.
- **📝 Context-Aware Parsing**: Intelligent sentence splitting that respects both standard punctuation and newlines. This ensures bullet points, lists, and technical notes are read with natural pauses.
- **🎨 Visual Synchronization**: Real-time highlighting of the active sentence keeps you focused. The appearance is fully customizable to integrate perfectly with your editor's theme.
- **🖥️ Universal Compatibility**: Built for **Visual Studio Code** and works seamlessly with all derivative editors.
- **⚙️ Flexible Control**: Easily switch between system voices and adjust reading speed to suit your workflow.

## 🚀 Usage

1.  Open any text or markdown file.
2.  Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and choose a command:

| Command                         | Description                                       |
| :------------------------------ | :------------------------------------------------ |
| `Text Speaker: Speak Document`  | Starts reading from the beginning of the file.    |
| `Text Speaker: Speak Here`      | Starts reading from the current cursor position.  |
| `Text Speaker: Speak Selection` | Reads only the selected text range.               |
| `Text Speaker: Stop Speaking`   | Terminates the current speech process.            |
| `Text Speaker: Select Voice`    | Choose from a variety of installed system voices. |

## ⚙️ Settings

Configure via VS Code Settings or `settings.json`:

- `text-speaker.voice`: Preferred voice name (e.g., `"Microsoft David"`, `"Alex"`).
- `text-speaker.speed`: Speech rate multiplier (Default: `1`).
- `text-speaker.highlightColor`: Background color for the current sentence.

## 📦 Building and installing from source

VS Code forks such as Antigravity IDE, Cursor, VSCodium and Windsurf cannot use the Visual
Studio Marketplace, so install the packaged extension directly:

```bash
npm install && npm run package
```

That writes `text-speaker-<version>.vsix` after running `npm run check`, so packaging fails
rather than shipping a broken build. Install it with the editor's own CLI:

| Editor          | Command                                                       |
| :-------------- | :------------------------------------------------------------ |
| Antigravity IDE | `antigravity-ide --install-extension text-speaker-1.1.0.vsix` |
| VS Code         | `code --install-extension text-speaker-1.1.0.vsix`            |
| Cursor          | `cursor --install-extension text-speaker-1.1.0.vsix`          |
| VSCodium        | `codium --install-extension text-speaker-1.1.0.vsix`          |

Reload the window afterwards (`Developer: Reload Window`) so the extension is picked up. The
GUI alternative is `Extensions: Install from VSIX...` in the Command Palette.

On Windows, Antigravity IDE's CLI lives at
`%LOCALAPPDATA%\Programs\Antigravity IDE\bin\antigravity-ide.cmd`, and extensions are installed
under `%USERPROFILE%\.antigravity-ide\extensions`.

## 🧑‍💻 Development

```bash
npm run check     # typecheck, lint, format check, and the test suite
npm run watch     # rebuild the bundle on change
npm run package   # produce the .vsix
```

Tests that drive a real speech engine are opt-in, because they play audio out loud:

```bash
TEXT_SPEAKER_AUDIO_TESTS=1 npx vitest run src/tts
```

## 🧑‍💻 Credits

This project is a modernized and high-stability version based on the work by [azu](https://github.com/azu).

## 📄 License

[MIT License](LICENSE)
