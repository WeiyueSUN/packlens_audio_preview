/**
 * 文件名: audioDetector.ts
 * 作者: Weiyue Sun
 * 邮箱: sunweiyue@modelbest.cn
 * 创建日期: 2025-10-21
 * 创建时间: 02:43:20
 * 描述: 音频格式检测工具，通过文件头 magic number 识别常见音频格式
 * 
 * Copyright (c) 2025 Weiyue Sun
 */

/**
 * 常见音频格式的文件签名（Magic Numbers）
 * 键为十六进制字符串，值为对应的 MIME 类型
 */
const AUDIO_SIGNATURES: Record<string, string> = {
  '494433': 'audio/mpeg',      // MP3 with ID3 tag
  'FFFB': 'audio/mpeg',        // MP3 without ID3 (MPEG-1 Layer 3)
  'FFF3': 'audio/mpeg',        // MP3 without ID3 (MPEG-2 Layer 3)
  'FFF2': 'audio/mpeg',        // MP3 without ID3 (MPEG-2.5 Layer 3)
  '52494646': 'audio/wav',     // WAV (RIFF header)
  '4F676753': 'audio/ogg',     // OGG Vorbis (OggS)
  '664C6143': 'audio/flac',    // FLAC (fLaC)
  'FFF1': 'audio/aac',         // AAC (ADTS)
  'FFF9': 'audio/aac',         // AAC (ADTS)
};

/**
 * 将字节数组的前 n 个字节转换为大写十六进制字符串
 * 
 * @param bytes - 输入的字节数组
 * @param length - 要提取的字节数量（默认为 4）
 * @returns 十六进制字符串
 * 
 * @example
 * const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x04]);
 * getFileSignature(bytes, 3); // 返回 "494433"
 */
function getFileSignature(bytes: Uint8Array, length: number = 4): string {
  const bytesToRead = Math.min(length, bytes.length);
  return Array.from(bytes.slice(0, bytesToRead))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * 检测字节数据是否为已知的音频格式
 * 
 * @param bytes - 要检测的字节数组
 * @returns 如果是音频格式，返回对应的 MIME 类型；否则返回 null
 * 
 * @example
 * const mp3Bytes = new Uint8Array([0x49, 0x44, 0x33, ...]);
 * detectAudioFormat(mp3Bytes); // 返回 "audio/mpeg"
 * 
 * const randomBytes = new Uint8Array([0x00, 0x01, 0x02, ...]);
 * detectAudioFormat(randomBytes); // 返回 null
 */
export function detectAudioFormat(bytes: Uint8Array): string | null {
  if (!bytes || bytes.length < 2) {
    return null;
  }

  // 检查各种签名长度（从长到短）
  const signatures = [
    { length: 4, patterns: ['52494646', '4F676753', '664C6143'] }, // 4 字节签名
    { length: 3, patterns: ['494433'] },                            // 3 字节签名
    { length: 2, patterns: ['FFFB', 'FFF3', 'FFF2', 'FFF1', 'FFF9'] }, // 2 字节签名
  ];

  for (const { length, patterns } of signatures) {
    if (bytes.length >= length) {
      const signature = getFileSignature(bytes, length);
      for (const pattern of patterns) {
        if (signature.startsWith(pattern)) {
          return AUDIO_SIGNATURES[pattern];
        }
      }
    }
  }

  return null;
}

/**
 * 检查字节数据是否为音频格式
 * 
 * @param bytes - 要检测的字节数组
 * @returns 如果是音频格式返回 true，否则返回 false
 */
export function isAudioData(bytes: Uint8Array): boolean {
  return detectAudioFormat(bytes) !== null;
}

