# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-14

### Added

-   **Initial Release**: Modernized and high-stability version of the text-to-speech extension.
-   **Large File Optimization**: Introduced a windowed parsing logic that allows instant speech on documents with tens of thousands of lines without freezing the editor.
-   **Improved Windows Support**: Implemented a direct PowerShell-based speech engine for Windows to ensure reliable process control and consistent voice quality.
-   **Newline-Aware Parsing**: Added logic to treat newlines as sentence boundaries, making it perfect for reading bullet points, lists, and code comments.
-   **Strict Selection Reading**: Enhanced the "Speak Selection" command to strictly parse and read only the chosen range.
-   **High-Stability Stop**: Refined process management to ensure speech termination is immediate and reliable.
-   **Derivative Editor Support**: Verified compatibility with VS Code, Cursor, VSCodium, and Azure Data Studio.
-   **Visual Sync**: Synchronized text highlighting with the active speech node, with customizable background colors.
-   **Voice Selection**: Integrated a system-wide voice selection menu.

### Credits

-   Based on the original [vscode-read-aloud-text](https://github.com/azu/vscode-read-aloud-text) project by [azu](https://github.com/azu).
