# MsgPack Audio Viewer

![logo](https://raw.githubusercontent.com/WeiyueSUN/msgpack-audio-viewer/main/media/icon.png)

**A VS Code / Cursor extension for viewing MessagePack files with embedded audio preview.**

![screenshot](https://raw.githubusercontent.com/WeiyueSUN/msgpack-audio-viewer/main/media/screenshot.png)

## Why This Tool?

This extension is specifically designed for **text-audio multimodal training data inspection**, especially for teams working on **audio LLM training**.

### The Problem

When building audio chat datasets for model training, you need to store text and audio together. Traditional approaches have limitations:

| Approach | Issue |
|----------|-------|
| **Separate files** | Text and audio stored separately, not atomic, hard to manage |
| **JSON + Base64** | Audio must be encoded as Base64, bloated and unreadable |
| **Custom binary formats** | Requires specialized tools, not lightweight |

### The Solution: MessagePack + This Viewer

**MessagePack** provides the best of both worlds:
- ✅ JSON-like structure (human-readable keys, nested objects)
- ✅ Native binary support (embed audio bytes directly, no Base64)
- ✅ Compact and efficient

**This extension** lets you:
- 📂 Open `.msgpack` files directly in VS Code / Cursor
- 🎵 **Play embedded audio inline** without extracting files
- 🔍 Browse the data structure like JSON

**No similar tool exists in the market.** This is the only viewer that supports atomic text+audio data inspection.

## Features

- 📃 **MessagePack Decoding**: Automatically decode and visualize MessagePack (.msgpack) files
- 🎵 **Inline Audio Player**: Play embedded audio data directly in the viewer
- 🔍 **Advanced Search**: Filter and transform data using JavaScript expressions
- 🔄 **Streaming Support**: Handle large files efficiently
- ⚡ **WASM Decoder**: High-performance audio decoding (MP3/FLAC/OGG via WebAssembly)

## Installation

### Manual Installation

1. Download the latest `.vsix` file from the [releases](https://github.com/WeiyueSUN/msgpack-audio-viewer/releases).
2. In VS Code / Cursor: `Ctrl+Shift+X` → `...` → "Install from VSIX..."
3. Select the downloaded `.vsix` file.

## Usage

### Quick Start

1. Open any `.msgpack` file (try `examples/example_audio_qa.msgpack`)
2. The file opens in MsgPack Audio Viewer automatically
3. Browse the JSON-like structure
4. Click ▶ to play any embedded audio

### Example Data Structure

```json
{
  "id": "audio_qa_001",
  "messages": [
    { "role": "user", "content": [
        { "type": "text", "text": "Describe this audio" },
        { "type": "audio", "audio": <bytes>, "format": "wav" }
    ]},
    { "role": "assistant", "content": "This is a violin tone..." }
  ]
}
```

The `audio` field contains raw bytes — **no Base64, no external files**.

## Development

### Project Structure

```
packages/
├── common/    # Shared types and utilities
├── vsc/       # VS Code extension
└── web/       # React-based web interface
```

### Build

```bash
npm install
npm run build

# Package vsix
cd packages/vsc
npx vsce package
```

### Run Web App

```bash
npm run web:dev
```

## License

MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

Based on:
- [PackLens](https://github.com/PejmanNik/packlens) by Pejman - MessagePack viewer foundation
- [vscode-audio-preview](https://github.com/sukumo28/vscode-audio-preview) by sukumo28 - Audio preview reference

Developed during employment at [ModelBest](https://modelbest.cn).
