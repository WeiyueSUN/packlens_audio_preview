# MsgPack Audio Viewer

![logo](media/icon.png)

MsgPack Audio Viewer is a Visual Studio Code extension and web application designed for decoding and searching within MessagePack binary files, with built-in audio preview support. It provides an intuitive interface for exploring and analyzing data efficiently, especially for MessagePack files containing audio data.

## Features

- 📃 **MessagePack Decoding**: Automatically decode and visualize MessagePack (.msgpack) files with ease.
- 🎵 **Audio Preview**: Built-in audio playback support with waveform visualization for audio data in MessagePack files.
- 🔍 **Advanced Search**: Perform custom searches and map data using JavaScript code.
- 🔄 **Streaming Support**: Efficiently stream and process large MessagePack files without performance bottlenecks.
- 🎯 **Custom Editor**: Seamlessly integrates with VS Code's editor system for a native experience.
- ⚡ **WASM Decoder**: High-performance audio decoding using WebAssembly for MP3 and other formats.

## Installation

### Manual Installation

1. Download the latest `.vsix` file from the releases.
2. Open Visual Studio Code.
3. Navigate to the Extensions view (`Ctrl+Shift+X`).
4. Click the `...` menu and select "Install from VSIX...".
5. Select the downloaded `.vsix` file.

## Usage

### Visual Studio Code Extension

1. Open any `.msgpack` file in VS Code.
2. The file will automatically open in the MsgPack Audio Viewer.
3. Explore the decoded MessagePack data using the interactive interface.
4. If the file contains audio data, you'll see an audio player with waveform visualization.

![demo-vsc](media/vsc-demo.gif)

### Web Application

1. Open the web interface (run `npm run web:dev` from the project root).
2. Upload your `.msgpack` file.
3. Use the search and visualization tools to analyze your data.

![demo-web](media/web-demo.gif)

## Development

This project uses a monorepo structure with three main packages:

### Project Structure

```
packages/
├── common/          # Shared types and utilities for decoding and processing files
├── vsc/             # Visual Studio Code extension
└── web/             # React-based web interface
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes and version history.
