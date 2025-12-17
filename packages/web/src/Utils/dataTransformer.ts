/**
 * 文件名: dataTransformer.ts
 * 作者: Weiyue Sun
 * 邮箱: sunweiyue@modelbest.cn
 * 创建日期: 2025-10-21
 * 创建时间: 02:43:20
 * 描述: 数据转换工具，用于预处理 MessagePack 解码后的数据，
 *       将 Uint8Array 类型转换为可渲染的特殊标记对象
 * 
 * Copyright (c) 2025 Weiyue Sun
 */

import { detectAudioFormat } from "./audioDetector";
import { audioDataManager } from "./audioDataManager";

/**
 * 音频数据标记对象
 * 
 * 关键改进：不保留 bytes，只保留 audioId！
 * - 避免内存泄漏
 * - AudioPreview 通过 audioId 从 audioDataManager 获取实际数据
 */
export interface AudioMarker {
  __type: 'audio';
  audioId: string;  // ← 只保留 ID，不保留数据！
  mimeType: string;
  length: number;
}

/**
 * 字节数据标记对象
 */
export interface BytesMarker {
  __type: 'bytes';
  length: number;
}

/**
 * 特殊标记类型联合
 */
export type DataMarker = AudioMarker | BytesMarker;

/**
 * 检查值是否为音频标记
 */
export function isAudioMarker(value: unknown): value is AudioMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__type' in value &&
    (value as AudioMarker).__type === 'audio'
  );
}

/**
 * 检查值是否为字节标记
 */
export function isBytesMarker(value: unknown): value is BytesMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__type' in value &&
    (value as BytesMarker).__type === 'bytes'
  );
}

/**
 * 递归转换数据中的所有 Uint8Array
 * 
 * 遍历数据结构（对象、数组），将所有 Uint8Array 类型的值转换为标记对象：
 * - 如果识别为音频格式：转换为 AudioMarker
 * - 否则：转换为 BytesMarker
 * 
 * @param data - 要转换的数据
 * @returns 转换后的数据
 * 
 * @example
 * const input = {
 *   audio: new Uint8Array([0x49, 0x44, 0x33, ...]),
 *   binary: new Uint8Array([0x00, 0x01, 0x02])
 * };
 * const output = transformBytesData(input);
 * // output.audio = { __type: 'audio', bytes: ..., mimeType: 'audio/mpeg' }
 * // output.binary = { __type: 'bytes', length: 3 }
 */
let totalUint8Arrays = 0;
let totalAudioDetections = 0;
let audioDetectionTime = 0;

export function transformBytesData<T>(data: T, _isRoot = true): T {
  // 根调用时重置计数器
  if (_isRoot) {
    totalUint8Arrays = 0;
    totalAudioDetections = 0;
    audioDetectionTime = 0;
  }

  // 处理 null 或 undefined
  if (data == null) {
    if (_isRoot) {
      console.log(`[transformBytesData] 完成 - Uint8Array: ${totalUint8Arrays}, 音频检测: ${totalAudioDetections}, 检测用时: ${audioDetectionTime.toFixed(0)}ms`);
    }
    return data;
  }

  // 处理 Uint8Array
  if (data instanceof Uint8Array) {
    totalUint8Arrays++;
    const size = (data.length / 1024 / 1024).toFixed(1);
    console.log(`[transformBytesData] 发现 Uint8Array #${totalUint8Arrays}: ${size} MB`);
    
    const detectStart = performance.now();
    const mimeType = detectAudioFormat(data);
    const detectTime = performance.now() - detectStart;
    audioDetectionTime += detectTime;
    
    if (mimeType) {
      totalAudioDetections++;
      console.log(`[transformBytesData] → 识别为音频: ${mimeType} (用时 ${detectTime.toFixed(0)}ms)`);
      
      // ✅ 关键改进：注册到 audioDataManager，只保留 ID
      const audioId = audioDataManager.register(data, mimeType);
      
      const result = {
        __type: 'audio',
        audioId,  // ← 只保留 ID！
        mimeType,
        length: data.length,
      } as unknown as T;
      
      if (_isRoot) {
        console.log(`[transformBytesData] 完成 - Uint8Array: ${totalUint8Arrays}, 音频检测: ${totalAudioDetections}, 检测用时: ${audioDetectionTime.toFixed(0)}ms`);
      }
      return result;
    } else {
      console.log(`[transformBytesData] → 非音频 (用时 ${detectTime.toFixed(0)}ms)`);
      const result = {
        __type: 'bytes',
        length: data.length,
      } as unknown as T;
      
      if (_isRoot) {
        console.log(`[transformBytesData] 完成 - Uint8Array: ${totalUint8Arrays}, 音频检测: ${totalAudioDetections}, 检测用时: ${audioDetectionTime.toFixed(0)}ms`);
      }
      return result;
    }
  }

  // 处理数组
  if (Array.isArray(data)) {
    const result = data.map(item => transformBytesData(item, false)) as unknown as T;
    if (_isRoot) {
      console.log(`[transformBytesData] 完成 - Uint8Array: ${totalUint8Arrays}, 音频检测: ${totalAudioDetections}, 检测用时: ${audioDetectionTime.toFixed(0)}ms`);
    }
    return result;
  }

  // 处理普通对象
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = transformBytesData(value, false);
    }
    if (_isRoot) {
      console.log(`[transformBytesData] 完成 - Uint8Array: ${totalUint8Arrays}, 音频检测: ${totalAudioDetections}, 检测用时: ${audioDetectionTime.toFixed(0)}ms`);
    }
    return result as T;
  }

  // 其他类型（string, number, boolean 等）直接返回
  if (_isRoot) {
    console.log(`[transformBytesData] 完成 - Uint8Array: ${totalUint8Arrays}, 音频检测: ${totalAudioDetections}, 检测用时: ${audioDetectionTime.toFixed(0)}ms`);
  }
  return data;
}
