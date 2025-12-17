#!/usr/bin/env python3
"""
生成示例 msgpack 文件，模拟 audio chat QA 场景
"""

import numpy as np
import msgspec
import wave
import io

def generate_violin_tone(frequency=440, duration=2.0, sample_rate=44100):
    """
    生成模拟小提琴音色的音频
    小提琴有丰富的泛音结构
    """
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # 基频 + 泛音（模拟小提琴的泛音结构）
    # 小提琴特点：奇次泛音较强，偶次泛音也存在
    audio = np.zeros_like(t)
    
    harmonics = [
        (1, 1.0),      # 基频 440Hz
        (2, 0.5),      # 2倍频 880Hz
        (3, 0.35),     # 3倍频 1320Hz
        (4, 0.25),     # 4倍频 1760Hz
        (5, 0.2),      # 5倍频 2200Hz
        (6, 0.15),     # 6倍频
        (7, 0.1),      # 7倍频
        (8, 0.08),     # 8倍频
    ]
    
    for harmonic, amplitude in harmonics:
        audio += amplitude * np.sin(2 * np.pi * frequency * harmonic * t)
    
    # ADSR 包络（模拟弓弦乐器的起音和衰减）
    attack = int(0.1 * sample_rate)
    decay = int(0.1 * sample_rate)
    sustain_level = 0.7
    release = int(0.3 * sample_rate)
    
    envelope = np.ones_like(audio)
    # Attack
    envelope[:attack] = np.linspace(0, 1, attack)
    # Decay
    envelope[attack:attack+decay] = np.linspace(1, sustain_level, decay)
    # Sustain (already at sustain_level)
    envelope[attack+decay:-release] = sustain_level
    # Release
    envelope[-release:] = np.linspace(sustain_level, 0, release)
    
    audio = audio * envelope
    
    # 归一化
    audio = audio / np.max(np.abs(audio)) * 0.8
    
    return audio, sample_rate


def audio_to_wav_bytes(audio, sample_rate):
    """将音频数据转换为 WAV 格式的字节"""
    # 转换为 16-bit PCM
    audio_int16 = (audio * 32767).astype(np.int16)
    
    # 写入 WAV 到内存
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # 单声道
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_int16.tobytes())
    
    return buffer.getvalue()


def create_audio_qa_example():
    """创建 Audio QA 示例数据"""
    
    print("生成小提琴音色音频 (440Hz A4)...")
    audio, sample_rate = generate_violin_tone(frequency=440, duration=2.0)
    wav_bytes = audio_to_wav_bytes(audio, sample_rate)
    print(f"  - 采样率: {sample_rate} Hz")
    print(f"  - 时长: 2.0 秒")
    print(f"  - WAV 大小: {len(wav_bytes)} bytes")
    
    # 构造 Audio QA 消息结构
    messages = [
        {
            "role": "system",
            "content": "You are a helpful music assistant that can analyze and describe audio."
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Please describe this audio. What instrument does it sound like?"
                },
                {
                    "type": "audio",
                    "audio": wav_bytes,
                    "format": "wav",
                    "sample_rate": sample_rate,
                    "duration": 2.0
                }
            ]
        },
        {
            "role": "assistant", 
            "content": "This audio contains a sustained tone at approximately 440 Hz (A4 pitch).\n\nKey characteristics:\n- Instrument: Bowed string instrument (likely violin)\n- Harmonic structure: Rich overtones\n- Attack: Smooth\n- Release: Gradual\n\nThe tone is typical of legato bowing technique."
        }
    ]
    
    example_data = {
        "id": "audio_qa_example_001",
        "type": "audio_chat",
        "messages": messages,
        "metadata": {
            "created_at": "2025-12-17T15:00:00Z",
            "source": "example",
            "description": "Example audio QA conversation with violin-like tone"
        }
    }
    
    return example_data


def main():
    print("=" * 50)
    print("创建 Audio QA 示例 msgpack 文件")
    print("=" * 50)
    
    example_data = create_audio_qa_example()
    
    # 保存为 msgpack
    output_path = "example_audio_qa.msgpack"
    with open(output_path, 'wb') as f:
        f.write(msgspec.msgpack.encode(example_data))
    
    print(f"\n✅ 已保存到: {output_path}")
    
    # 验证
    with open(output_path, 'rb') as f:
        loaded = msgspec.msgpack.decode(f.read())
    
    print(f"\n验证内容:")
    print(f"  - ID: {loaded['id']}")
    print(f"  - Type: {loaded['type']}")
    print(f"  - Messages: {len(loaded['messages'])} 条")
    
    # 找到音频消息
    for msg in loaded['messages']:
        if msg['role'] == 'user' and isinstance(msg['content'], list):
            for item in msg['content']:
                if item.get('type') == 'audio':
                    audio_bytes = item['audio']
                    print(f"  - Audio size: {len(audio_bytes)} bytes")
                    print(f"  - Audio format: {item['format']}")
    
    print("\n完成!")


if __name__ == "__main__":
    main()
