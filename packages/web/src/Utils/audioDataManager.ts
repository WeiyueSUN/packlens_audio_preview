/**
 * 文件名: audioDataManager.ts
 * 作者: Weiyue Sun
 * 邮箱: sunweiyue@modelbest.cn
 * 创建日期: 2025-10-21
 * 创建时间: 18:00:00
 * 描述: 音频数据管理器 - 避免内存泄漏
 * 
 * 核心思路：
 * - transformBytesData 不保留音频数据，只生成 audioId
 * - 实际数据存储在 AudioDataManager 中（单例）
 * - AudioPreview 按需获取数据
 * - Row 卸载时清理数据
 * 
 * Copyright (c) 2025 Weiyue Sun
 */

/**
 * 音频数据条目
 */
interface AudioDataEntry {
  /** 音频字节数据 */
  bytes: Uint8Array;
  /** MIME 类型 */
  mimeType: string;
  /** 注册时间戳（用于调试） */
  registeredAt: number;
}

/**
 * 音频数据管理器 - 全局单例
 * 
 * 职责：
 * 1. 注册音频数据，返回唯一 ID
 * 2. 通过 ID 获取音频数据
 * 3. 清理不再使用的数据（避免内存泄漏）
 */
class AudioDataManager {
  private audioData = new Map<string, AudioDataEntry>();
  private nextId = 1;

  /**
   * 注册音频数据
   * 
   * @returns 唯一的 audio ID
   */
  register(bytes: Uint8Array, mimeType: string): string {
    const audioId = `audio_${this.nextId++}_${Date.now()}`;
    
    this.audioData.set(audioId, {
      bytes,
      mimeType,
      registeredAt: Date.now(),
    });
    
    console.log(`[AudioDataManager] 注册音频: ID=${audioId}, size=${(bytes.length / 1024 / 1024).toFixed(1)} MB, total=${this.audioData.size} 个`);
    
    return audioId;
  }

  /**
   * 获取音频数据
   */
  get(audioId: string): AudioDataEntry | undefined {
    return this.audioData.get(audioId);
  }

  /**
   * 清理指定的音频数据
   */
  unregister(audioId: string): void {
    const entry = this.audioData.get(audioId);
    if (entry) {
      console.log(`[AudioDataManager] 清理音频: ID=${audioId}, size=${(entry.bytes.length / 1024 / 1024).toFixed(1)} MB`);
      this.audioData.delete(audioId);
    }
  }

  /**
   * 删除指定的音频数据（unregister 的别名）
   */
  delete(audioId: string): void {
    this.unregister(audioId);
  }

  /**
   * 清理所有音频数据
   */
  clear(): void {
    const count = this.audioData.size;
    const totalSize = Array.from(this.audioData.values())
      .reduce((sum, entry) => sum + entry.bytes.length, 0);
    
    console.log(`[AudioDataManager] 清理所有音频: ${count} 个, 总计 ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
    this.audioData.clear();
  }

  /**
   * 获取当前状态（调试用）
   */
  getStats() {
    const entries = Array.from(this.audioData.entries());
    const totalSize = entries.reduce((sum, [, entry]) => sum + entry.bytes.length, 0);
    
    return {
      count: entries.length,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(1),
      entries: entries.map(([id, entry]) => ({
        id,
        size: entry.bytes.length,
        sizeMB: (entry.bytes.length / 1024 / 1024).toFixed(1),
        mimeType: entry.mimeType,
        age: Date.now() - entry.registeredAt,
      })),
    };
  }
}

// 全局单例
export const audioDataManager = new AudioDataManager();

