/**
 * 文件名: wasmAudioDecoder.ts
 * 作者: Weiyue Sun
 * 邮箱: sunweiyue@modelbest.cn
 * 创建日期: 2025-10-21
 * 描述: WASM 音频解码器统一封装
 *       支持 MP3, FLAC, OGG Vorbis 等格式
 *       比 Web Audio API 的 decodeAudioData 快 5-10 倍
 * 
 * Copyright (c) 2025 Weiyue Sun
 */

import { MPEGDecoder } from 'mpg123-decoder';
import { FLACDecoder } from '@wasm-audio-decoders/flac';
import { OggVorbisDecoder } from '@wasm-audio-decoders/ogg-vorbis';
import { vscodeLogger } from './vscodeLogger';

// KEEP COMMENT: 解码超时（毫秒）。对 MP3/FLAC/OGG 采取激进 15s 超时，避免长时间卡死
const DEFAULT_DECODE_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: number | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = window.setTimeout(() => {
      const error = new Error(`[Timeout] ${label} 超时 ${ms}ms`);
      // 标记用于上层判断
      (error as any).code = 'ETIMEOUT';
      reject(error);
    }, ms);
    promise
      .then((v) => {
        if (timer) clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        if (timer) clearTimeout(timer);
        reject(e);
      });
  });
}

export interface DecodedAudioData {
  /** 每个声道的音频数据（Float32Array 数组） */
  channelData: Float32Array[];
  /** 采样率 */
  sampleRate: number;
  /** 音频时长（秒） */
  duration: number;
  /** 使用的解码器类型 */
  decoder: 'wasm-mp3' | 'wasm-flac' | 'wasm-vorbis' | 'web-audio-api';
}

/**
 * 使用 WASM 解码音频数据
 * 
 * 根据 MIME 类型自动选择合适的解码器：
 * - audio/mpeg, audio/mp3 → mpg123-decoder
 * - audio/flac → @wasm-audio-decoders/flac
 * - audio/ogg, audio/vorbis → @wasm-audio-decoders/ogg-vorbis
 * - 其他格式 → 回退到 Web Audio API
 * 
 * @param bytes 音频字节数据
 * @param mimeType 音频 MIME 类型
 * @returns 解码后的音频数据
 */
export async function decodeAudioWithWasm(
  bytes: Uint8Array,
  mimeType: string
): Promise<DecodedAudioData> {
  const startTime = performance.now();
  
  vscodeLogger.info(`[WASM Decoder] 🎵 开始解码`);
  vscodeLogger.info(`  - MIME 类型: "${mimeType}"`);
  vscodeLogger.info(`  - 文件大小: ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
  vscodeLogger.info(`  - 前 16 字节: ${Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

  try {
    // 根据 MIME 类型选择解码器
    if (mimeType === 'audio/mpeg' || mimeType === 'audio/mp3') {
      vscodeLogger.success(`[WASM Decoder] ✅ 匹配 MP3 格式，使用 WASM 解码器`);
      return await decodeMp3(bytes, startTime);
    } else if (mimeType === 'audio/flac' || mimeType === 'audio/x-flac') {
      vscodeLogger.success(`[WASM Decoder] ✅ 匹配 FLAC 格式，使用 WASM 解码器`);
      return await decodeFlac(bytes, startTime);
    } else if (mimeType === 'audio/ogg' || mimeType === 'audio/vorbis') {
      vscodeLogger.success(`[WASM Decoder] ✅ 匹配 OGG 格式，使用 WASM 解码器`);
      return await decodeOggVorbis(bytes, startTime);
    } else if (mimeType === 'audio/wav' || mimeType === 'audio/wave' || mimeType === 'audio/x-wav') {
      // WAV 通常不需要解码（已经是 PCM），直接用 Web Audio API
      vscodeLogger.warn(`[WASM Decoder] ⚠️ WAV 格式，使用 Web Audio API（预期行为）`);
      return await decodeWithWebAudioApi(bytes, mimeType, startTime);
    } else {
      vscodeLogger.warn(`[WASM Decoder] ❌ 不支持的格式 "${mimeType}"，回退到 Web Audio API`);
      return await decodeWithWebAudioApi(bytes, mimeType, startTime);
    }
  } catch (err) {
    vscodeLogger.error(`[WASM Decoder] 💥 WASM 解码失败，回退到 Web Audio API`);
    vscodeLogger.error((err as Error).message);
    return await decodeWithWebAudioApi(bytes, mimeType, startTime);
  }
}

/**
 * 使用 mpg123-decoder 解码 MP3
 */
async function decodeMp3(bytes: Uint8Array, startTime: number): Promise<DecodedAudioData> {
  vscodeLogger.info(`[WASM Decoder] 使用 mpg123-decoder`);
  
  const decoder = new MPEGDecoder();
  // 初始化解码器设置超时保护
  await withTimeout(
    Promise.resolve(decoder.ready as any),
    DEFAULT_DECODE_TIMEOUT_MS,
    'MP3 解码器初始化'
  );
  vscodeLogger.success(`[WASM Decoder] 解码器初始化完成: ${(performance.now() - startTime).toFixed(0)}ms`);

  const decodeStart = performance.now();
  // 真正解码也添加超时保护
  const result = await withTimeout(
    Promise.resolve(decoder.decode(bytes) as any),
    DEFAULT_DECODE_TIMEOUT_MS,
    'MP3 解码过程'
  ) as any;
  const decodeTime = performance.now() - decodeStart;
  
  const duration = (result as any).channelData[0].length / (result as any).sampleRate;
  const totalTime = performance.now() - startTime;
  
  vscodeLogger.success(`[WASM Decoder] MP3 解码完成:`);
  vscodeLogger.info(`  - 解码时间: ${decodeTime.toFixed(0)}ms`);
  vscodeLogger.info(`  - 总时间: ${totalTime.toFixed(0)}ms`);
  vscodeLogger.info(`  - 采样率: ${(result as any).sampleRate} Hz`);
  vscodeLogger.info(`  - 声道数: ${(result as any).channelData.length}`);
  vscodeLogger.info(`  - 时长: ${duration.toFixed(2)}s`);

  // 清理解码器
  decoder.free();

  return {
    channelData: (result as any).channelData,
    sampleRate: (result as any).sampleRate,
    duration,
    decoder: 'wasm-mp3',
  };
}

/**
 * 使用 @wasm-audio-decoders/flac 解码 FLAC
 */
async function decodeFlac(bytes: Uint8Array, startTime: number): Promise<DecodedAudioData> {
  console.log(`[WASM Decoder] 使用 @wasm-audio-decoders/flac`);
  
  const decoder = new FLACDecoder();
  await withTimeout(
    Promise.resolve(decoder.ready as any),
    DEFAULT_DECODE_TIMEOUT_MS,
    'FLAC 解码器初始化'
  );
  console.log(`[WASM Decoder] 解码器初始化完成: ${(performance.now() - startTime).toFixed(0)}ms`);

  const decodeStart = performance.now();
  const result = await withTimeout(
    Promise.resolve(decoder.decode(bytes) as any),
    DEFAULT_DECODE_TIMEOUT_MS,
    'FLAC 解码过程'
  ) as any;
  const decodeTime = performance.now() - decodeStart;
  
  const duration = (result as any).channelData[0].length / (result as any).sampleRate;
  const totalTime = performance.now() - startTime;
  
  console.log(`[WASM Decoder] FLAC 解码完成:`);
  console.log(`  - 解码时间: ${decodeTime.toFixed(0)}ms`);
  console.log(`  - 总时间: ${totalTime.toFixed(0)}ms`);
  console.log(`  - 采样率: ${(result as any).sampleRate} Hz`);
  console.log(`  - 声道数: ${(result as any).channelData.length}`);
  console.log(`  - 时长: ${duration.toFixed(2)}s`);

  // 清理解码器
  decoder.free();

  return {
    channelData: (result as any).channelData,
    sampleRate: (result as any).sampleRate,
    duration,
    decoder: 'wasm-flac',
  };
}

/**
 * 使用 @wasm-audio-decoders/ogg-vorbis 解码 OGG Vorbis
 */
async function decodeOggVorbis(bytes: Uint8Array, startTime: number): Promise<DecodedAudioData> {
  console.log(`[WASM Decoder] 使用 @wasm-audio-decoders/ogg-vorbis`);
  
  const decoder = new OggVorbisDecoder();
  await withTimeout(
    Promise.resolve(decoder.ready as any),
    DEFAULT_DECODE_TIMEOUT_MS,
    'OGG 解码器初始化'
  );
  console.log(`[WASM Decoder] 解码器初始化完成: ${(performance.now() - startTime).toFixed(0)}ms`);

  const decodeStart = performance.now();
  const result = await withTimeout(
    Promise.resolve(decoder.decode(bytes) as any),
    DEFAULT_DECODE_TIMEOUT_MS,
    'OGG 解码过程'
  ) as any;
  const decodeTime = performance.now() - decodeStart;
  
  const duration = (result as any).channelData[0].length / (result as any).sampleRate;
  const totalTime = performance.now() - startTime;
  
  console.log(`[WASM Decoder] OGG Vorbis 解码完成:`);
  console.log(`  - 解码时间: ${decodeTime.toFixed(0)}ms`);
  console.log(`  - 总时间: ${totalTime.toFixed(0)}ms`);
  console.log(`  - 采样率: ${(result as any).sampleRate} Hz`);
  console.log(`  - 声道数: ${(result as any).channelData.length}`);
  console.log(`  - 时长: ${duration.toFixed(2)}s`);

  // 清理解码器
  decoder.free();

  return {
    channelData: (result as any).channelData,
    sampleRate: (result as any).sampleRate,
    duration,
    decoder: 'wasm-vorbis',
  };
}

/**
 * 回退方案：使用 Web Audio API 解码
 * （用于 WAV 或不支持的格式）
 */
async function decodeWithWebAudioApi(
  bytes: Uint8Array,
  _mimeType: string,
  startTime: number
): Promise<DecodedAudioData> {
  vscodeLogger.info(`[Web Audio API] 使用传统解码`);

  const audioContext = new AudioContext();
  
  // 准备 ArrayBuffer
  let arrayBuffer: ArrayBuffer;
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    arrayBuffer = bytes.buffer as ArrayBuffer;
  } else {
    const newBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(newBuffer).set(bytes);
    arrayBuffer = newBuffer;
  }

  const decodeStart = performance.now();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const decodeTime = performance.now() - decodeStart;
  const totalTime = performance.now() - startTime;

  vscodeLogger.success(`[Web Audio API] 解码完成:`);
  vscodeLogger.info(`  - 解码时间: ${decodeTime.toFixed(0)}ms`);
  vscodeLogger.info(`  - 总时间: ${totalTime.toFixed(0)}ms`);
  vscodeLogger.info(`  - 采样率: ${audioBuffer.sampleRate} Hz`);
  vscodeLogger.info(`  - 声道数: ${audioBuffer.numberOfChannels}`);
  vscodeLogger.info(`  - 时长: ${audioBuffer.duration.toFixed(2)}s`);

  // 提取 channelData
  const channelData: Float32Array[] = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  // 关闭 AudioContext
  audioContext.close();

  return {
    channelData,
    sampleRate: audioBuffer.sampleRate,
    duration: audioBuffer.duration,
    decoder: 'web-audio-api',
  };
}

