/**
 * 文件名: AudioPreview.tsx
 * 作者: Weiyue Sun
 * 邮箱: sunweiyue@modelbest.cn
 * 创建日期: 2025-10-21
 * 创建时间: 02:43:20
 * 描述: 音频预览组件，使用 Web Audio API 播放音频字节数据
 *       参考 vscode-audio-preview 的实现模式
 * 
 * Copyright (c) 2025 Weiyue Sun
 */

import { useEffect, useState, useRef, useCallback } from "react";
import styled from "@emotion/styled";
import { decodeAudioWithWasm } from "../Utils/wasmAudioDecoder";

const AudioContainer = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--vscode-editor-background, #f5f5f5);
  border-radius: 4px;
  border: 1px solid var(--vscode-widget-border, #ccc);
  min-width: 350px;

  .audio-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .play-button {
    background: var(--vscode-button-background, #007acc);
    color: var(--vscode-button-foreground, #fff);
    border: none;
    padding: 6px 16px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    font-family: var(--vscode-font-family, sans-serif);
    min-width: 60px;

    &:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #0062a3);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .time-info {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #666);
    font-family: var(--vscode-font-family, monospace);
    min-width: 90px;
  }

  .progress-container {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .progress-bar {
    flex: 1;
    height: 8px;
    background: var(--vscode-input-background, #3c3c3c);
    border-radius: 4px;
    position: relative;
    cursor: pointer;
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background: var(--vscode-progressBar-background, #0e70c0);
      border-radius: 4px;
    }
  }

  .audio-info {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #666);
    font-family: var(--vscode-font-family, monospace);
  }

  .error {
    color: var(--vscode-errorForeground, #f44336);
  }
`;

import { audioDataManager } from "../Utils/audioDataManager";

export interface AudioPreviewProps {
  /** 音频数据 ID（从 audioDataManager 获取实际数据） */
  audioId: string;
  /** 音频 MIME 类型 */
  mimeType: string;
  /** 音频大小（字节） */
  length: number;
}

/**
 * 音频预览组件
 * 
 * 使用 Web Audio API 播放音频，参考 vscode-audio-preview 的实现
 * 不区分大小文件，统一自动加载（带加载提示）
 * 
 * v2.2 改进：通过 audioId 从 audioDataManager 获取数据，避免内存泄漏
 */
export default function AudioPreview({ audioId, mimeType }: AudioPreviewProps) {
  // 从 audioDataManager 获取实际音频数据
  const audioEntry = audioDataManager.get(audioId);
  
  if (!audioEntry) {
    return (
      <AudioContainer>
        <span className="error">⚠️ 音频数据已被清理</span>
      </AudioContainer>
    );
  }
  
  const bytes = audioEntry.bytes;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [perfStats, setPerfStats] = useState<{
    prepare: number;
    decode: number;
    total: number;
    useBuffer: boolean;
    decoder?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekbarValue, setSeekbarValue] = useState(0);

  // KEEP COMMENT: 核心状态，参考 vscode-audio-preview 的 PlayerService
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentSecRef = useRef<number>(0);  // 当前播放位置（秒）
  const lastStartTimeRef = useRef<number>(0);  // 最后开始播放的时间
  const animationFrameIdRef = useRef<number>(0);

  // 格式化字节大小
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // KEEP COMMENT: 解码音频数据，参考 vscode-audio-preview 的异步加载流程
  const loadAudio = useCallback(async () => {
    if (audioBufferRef.current) {
      return;
    }

    const startTime = performance.now();
    setIsLoading(true);
    setLoadingMessage('正在加载音频...');
    setError(null);

    try {
      // 使用 setTimeout 让 UI 有机会更新加载提示
      await new Promise(resolve => setTimeout(resolve, 0));
      const afterYield = performance.now();
      console.log(`[AudioPreview] setTimeout(0) 用时: ${(afterYield - startTime).toFixed(0)}ms`);

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const afterContext = performance.now();
      console.log(`[AudioPreview] AudioContext 创建: ${(afterContext - afterYield).toFixed(0)}ms`);

      const prepareTime = performance.now() - startTime;
      console.log(`[AudioPreview] 准备完成: ${prepareTime.toFixed(0)}ms`);

      setLoadingMessage('正在解码音频（使用 WASM）...');
      
      // 使用 WASM 解码器（比 Web Audio API 快 5-10 倍！）
      const decodeStart = performance.now();
      let decodedData;
      try {
        decodedData = await decodeAudioWithWasm(bytes, mimeType);
      } catch (e) {
        const err = e as Error & { code?: string };
        // 自动上报更详细的异常
        console.error('[AudioPreview] 解码失败:', err);
        if (err.code === 'ETIMEOUT') {
          setError(`解码超时（${mimeType}），已自动取消。建议重试或更换解码器`);
        } else {
          setError(err.message || '解码失败');
        }
        throw err; // 交给外层 finally 做收尾
      }
      const decodeTime = performance.now() - decodeStart;
      console.log(`[AudioPreview] WASM 解码完成: ${decodeTime.toFixed(0)}ms`);

      // 将 WASM 解码的 Float32Array[] 转换成 AudioBuffer
      setLoadingMessage('正在创建音频缓冲区...');
      const createBufferStart = performance.now();
      
      const audioBuffer = audioContextRef.current.createBuffer(
        decodedData.channelData.length,
        decodedData.channelData[0].length,
        decodedData.sampleRate
      );

      // 复制每个声道的数据
      for (let i = 0; i < decodedData.channelData.length; i++) {
        audioBuffer.copyToChannel(decodedData.channelData[i], i);
      }
      
      const createBufferTime = performance.now() - createBufferStart;
      console.log(`[AudioPreview] 创建 AudioBuffer: ${createBufferTime.toFixed(0)}ms`);

      audioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);
      setLoadingMessage('');
      
      const totalTime = performance.now() - startTime;
      setPerfStats({
        prepare: prepareTime,
        decode: decodeTime,
        total: totalTime,
        useBuffer: true, // WASM 解码器内部优化了内存使用
        decoder: decodedData.decoder,
      });
      console.log(`[AudioPreview] 总时间: ${totalTime.toFixed(0)}ms (${audioBuffer.duration.toFixed(1)}s 音频)`);
      console.log(`[AudioPreview] 使用解码器: ${decodedData.decoder}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法解码音频');
      console.error('Failed to decode audio:', err);
      // 额外记录上下文，帮助定位问题
      console.error('[AudioPreview] 上下文: ', {
        audioId,
        mimeType,
        bytesLength: bytes.length,
        hasContext: !!audioContextRef.current,
      });
    } finally {
      setIsLoading(false);
    }
  }, [bytes]);

  // KEEP COMMENT: tick - 更新播放进度，参考 vscode-audio-preview 实现
  const tick = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    // 计算当前播放位置
    const current = currentSecRef.current + 
                   audioContextRef.current.currentTime - 
                   lastStartTimeRef.current;
    
    const progress = (100 * current) / audioBufferRef.current.duration;

    // 更新显示
    setCurrentTime(current);
    setSeekbarValue(progress);

    // 播放结束检查
    if (current > audioBufferRef.current.duration) {
      pause();
      currentSecRef.current = 0;
      setCurrentTime(0);
      setSeekbarValue(0);
      return;
    }

    // 继续更新
    animationFrameIdRef.current = requestAnimationFrame(tick);
  }, []);

  // KEEP COMMENT: play - 开始播放，参考 vscode-audio-preview 实现
  const play = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    // 创建新的 source node (每次都要创建新的，因为 start 只能调用一次)
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(audioContextRef.current.destination);

    // 从当前位置开始播放
    source.start(audioContextRef.current.currentTime, currentSecRef.current);
    lastStartTimeRef.current = audioContextRef.current.currentTime;
    sourceRef.current = source;
    setIsPlaying(true);

    // 开始更新进度条
    animationFrameIdRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // KEEP COMMENT: pause - 暂停播放，参考 vscode-audio-preview 实现
  const pause = useCallback(() => {
    if (!audioContextRef.current) return;

    // 停止进度更新
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    // 停止播放
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // 可能已经停止
      }
      sourceRef.current = null;
    }

    // 更新当前位置
    currentSecRef.current += audioContextRef.current.currentTime - lastStartTimeRef.current;
    setIsPlaying(false);
  }, []);

  // 切换播放/暂停
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // KEEP COMMENT: onSeekbarInput - 跳转，参考 vscode-audio-preview 实现
  const onSeekbarInput = useCallback((value: number) => {
    if (!audioBufferRef.current) return;

    const wasPlaying = isPlaying;

    // 如果正在播放，先暂停
    if (isPlaying) {
      pause();
    }

    // 更新位置
    currentSecRef.current = (value * audioBufferRef.current.duration) / 100;
    setCurrentTime(currentSecRef.current);
    setSeekbarValue(value);

    // 如果之前在播放，继续播放
    if (wasPlaying) {
      play();
    }
  }, [isPlaying, pause, play]);

  // 进度条点击
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(((e.clientX - rect.left) / rect.width) * 100, 100));
    onSeekbarInput(percent);
  }, [onSeekbarInput]);

  // 自动加载音频
  useEffect(() => {
    loadAudio();
  }, [loadAudio]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <AudioContainer>
      {error ? (
        <span className="error">⚠️ {error}</span>
      ) : isLoading ? (
        <>
          <span className="audio-info">{loadingMessage || '加载中...'}</span>
          <span className="audio-info">
            {mimeType.split('/')[1].toUpperCase()} • {formatBytes(bytes.length)}
          </span>
        </>
      ) : audioBufferRef.current ? (
        <>
          <div className="audio-controls">
            <button 
              className="play-button" 
              onClick={togglePlay}
            >
              {isPlaying ? '⏸ 暂停' : '▶ 播放'}
            </button>
            <span className="time-info">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="progress-container">
              <div className="progress-bar" onClick={handleProgressClick}>
                <div className="progress-fill" style={{ width: `${seekbarValue}%` }} />
              </div>
            </div>
          </div>
          <span className="audio-info">
            {mimeType.split('/')[1].toUpperCase()} • {formatBytes(bytes.length)}
          </span>
          {perfStats && (
            <span className="audio-info" style={{ fontSize: '10px', opacity: 0.8 }}>
              ⚡ 加载: {(perfStats.total / 1000).toFixed(2)}s 
              (解码: {(perfStats.decode / 1000).toFixed(2)}s) 
              • {perfStats.decoder ? perfStats.decoder.toUpperCase() : 'Web Audio API'}
            </span>
          )}
        </>
      ) : (
        <span className="audio-info">准备加载...</span>
      )}
    </AudioContainer>
  );
}
