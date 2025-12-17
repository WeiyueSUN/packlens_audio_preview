# Change Log

All notable changes to the "MsgPack Audio Viewer" project will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.0.0] - 2025-10-27

### Added
- Audio format detection via magic number (MP3/WAV/OGG/FLAC/AAC)
- Audio preview with Web Audio API playback
- WASM decoders (mpg123, flac, ogg-vorbis) for faster decoding
- Performance metrics display in UI
- BytesPlaceholder component for non-audio binary data

### Based on
- PackLens by Pejman - MessagePack viewer foundation
- vscode-audio-preview by sukumo28 - Audio preview implementation reference
