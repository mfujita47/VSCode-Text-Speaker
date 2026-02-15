# AGENT.md - Developer Guide for Text Speaker Extension

## Project Overview

**Text Speaker** is a professional Text-to-Speech (TTS) extension for VS Code designed to provide a smooth, focused reading experience. It intelligently parses documents and synchronizes speech with visual highlighting, making it ideal for proofreading, accessibility, and focused learning.

### Key Stats
- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **Version**: 1.0.0
- **License**: MIT
- **Repository**: https://github.com/mfujita47/VSCode-Text-Speaker

## Project Structure

```
VSCode-Text-Speaker/
├── src/
│   ├── extension.ts          # Main extension entry point and command handlers
│   ├── SpeechEngine.ts       # Core TTS engine with speech parsing and highlighting
│   └── parser.ts             # Document parser using Textlint kernel
├── dist/                     # Compiled JavaScript output
├── media/                    # Assets (logo, etc.)
├── package.json              # Extension manifest and dependencies
├── tsconfig.json             # TypeScript configuration
├── CHANGELOG.md              # Version history
├── LICENSE                   # MIT License
└── README.md                 # User documentation
```

## Core Architecture

### 1. **extension.ts** - Entry Point
- Manages VS Code commands and editor integration
- Handles speech control (start, stop, pause)
- Manages text decorations (visual highlighting)
- Reads/writes user configuration settings
- Listens to editor events (document close, text change)

**Key Components:**
- `speech` object: Controls TTS playback lifecycle
- `highlightDecorator`: Visual indicator for current speaking position
- `currentEngine`: Active SpeechEngine instance
- Configuration handlers for voice, speed, and highlight color

### 2. **SpeechEngine.ts** - Core Engine
- Extends EventEmitter for event-driven speech control
- Parses text into sentences using `sentence-splitter`
- Handles large file optimization (threshold: 100KB)
- Supports multiple speech ranges:
  - Full document
  - From cursor position
  - Selection only
- Cross-platform speech synthesis (Windows, macOS, Linux)

**Key Features:**
- `parseText()`: Intelligent sentence splitting respecting punctuation and newlines
- `play()`: Initiates speech synthesis
- `stop()`: Terminates speech
- `onChange()`: Emits events for highlighting synchronization

### 3. **parser.ts** - Document Parser
- Wraps Textlint kernel for document parsing
- Supports multiple file formats (.md, .txt, .json, etc.)
- Provides consistent AST for sentence splitting

## Technology Stack

### Dependencies
- **say**: Cross-platform text-to-speech synthesis
- **sentence-splitter**: Intelligent sentence parsing
- **@textlint/kernel**: AST-based document parsing
- **@textlint/ast-node-types**: Standard AST node types
- **VS Code API**: Editor integration (vscode v1.60.0+)

### Dev Dependencies
- **TypeScript**: Language and type safety
- **@types packages**: Type definitions for node APIs
- **webpack**: Module bundling
- **prettier**: Code formatting

## Configuration Options

Users can configure via VS Code settings or `settings.json`:

```json
{
  "text-speaker.voice": "Microsoft David",
  "text-speaker.speed": 1,
  "text-speaker.highlightColor": null
}
```

## Available Commands

| Command | Description |
|---------|-------------|
| `text-speaker.speakDocument` | Read entire file from beginning |
| `text-speaker.speakHere` | Read from cursor position |
| `text-speaker.speakSelection` | Read selected text |
| `text-speaker.stopSpeaking` | Stop current playback |
| `text-speaker.selectVoice` | Choose from system voices |

## Development Setup

### Prerequisites
- Node.js 14+
- npm or yarn
- VS Code 1.60.0+

### Installation & Build

```bash
npm install
npm run compile
npm run bundle
npm run vscode:prepublish
```

### Local Testing

1. Open the repository in VS Code
2. Press F5 to launch the extension in debug mode
3. A new VS Code window opens with the extension active
4. Test commands via Command Palette (Ctrl+Shift+P)

## Key Implementation Details

### Large File Optimization
The engine implements dynamic parsing for files exceeding 100KB:
- Parses a window of 50KB around the current position
- Prevents memory bloat with large documents
- Maintains smooth playback even in massive files

### Speech Synchronization
- Real-time event emission matches speech progress to visual highlight
- Handles file changes/closes gracefully by stopping playback
- Decorations update on every sentence transition

### Platform-Specific Behavior
- **Windows**: Uses SAPI5 via child processes
- **macOS**: Native `say` command
- **Linux**: Espeak or alternative system TTS

## Common Development Tasks

### Adding a New Command
1. Define in `package.json` under `contributes.commands`
2. Add activation event in `activationEvents`
3. Register handler in `extension.ts` via `registerCommand`
4. Implement logic using `SpeechEngine` or `speech` object

### Modifying Parser Behavior
- Edit `parseText()` in `SpeechEngine.ts`
- Adjust thresholds (`LARGE_FILE_THRESHOLD`, `PARSE_WINDOW`)
- Consider backward compatibility with existing selection logic

### Updating Highlighting
- Modify `updateHighlightDecorator()` in `extension.ts`
- Adjust `TextEditorDecorationType` properties
- Update configuration schema in `package.json`

## Testing Recommendations

### Manual Testing Checklist
- [ ] Speak full document (small file)
- [ ] Speak full document (large file 100KB+)
- [ ] Speak from cursor position
- [ ] Speak text selection
- [ ] Pause and resume
- [ ] Stop speaking
- [ ] Switch voices mid-speech
- [ ] Highlight moves correctly with speech
- [ ] Closing document stops playback
- [ ] Editing document stops playback
- [ ] All supported file types (.md, .txt, .json, etc.)

### Edge Cases
- Empty documents
- Very long sentences
- Special characters and unicode
- Mixed line endings (CRLF/LF)
- Rapid command execution

## Contributing Guidelines

### Code Style
- Use TypeScript strict mode
- Follow existing indentation (4 spaces)
- Use Prettier for formatting
- Add JSDoc comments for public methods

### Commit Messages
- Use clear, descriptive messages
- Reference issues when applicable
- Keep commits atomic and focused

### Pull Requests
- Describe changes and motivation
- Test all scenarios thoroughly
- Update CHANGELOG.md
- Ensure no console errors in debug mode

## Performance Considerations

1. **Memory**: Large file parsing uses windowing strategy
2. **CPU**: Speech synthesis handled by system processes
3. **UI**: Decoration updates are throttled per sentence
4. **File I/O**: Text is read into memory (reasonable for editor workflows)

## Troubleshooting

### Speech Not Working
- Check system TTS is available
- Verify voice name matches system (use "Select Voice" command)
- Test with small file first
- Check console for error messages

### Highlighting Not Appearing
- Verify editor theme supports decorations
- Check `highlightColor` setting
- Ensure text file is active editor
- Try resetting highlight via theme change

### Large File Stuttering
- Adjust `PARSE_WINDOW` or `LARGE_FILE_THRESHOLD` in SpeechEngine
- Check system TTS process performance
- Consider reducing speech speed multiplier

## Future Enhancement Ideas

- [ ] Pause/resume functionality
- [ ] Speed adjustment during playback
- [ ] Custom pronunciation rules
- [ ] Support for footnotes/references
- [ ] Bookmark/resume from position
- [ ] Dark mode highlight styling
- [ ] Language detection and switching
- [ ] Cloud TTS backend option

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [sentence-splitter docs](https://github.com/textlint/sentence-splitter)
- [Say.js documentation](https://github.com/marak/say.js)
- [Textlint kernel](https://textlint.github.io/)

## Maintenance Notes

**Last Updated**: 2026-02-15

This project maintains backward compatibility with VS Code 1.60.0 and uses standard Node.js/system APIs for maximum portability. When updating dependencies, verify compatibility with target VS Code version.
