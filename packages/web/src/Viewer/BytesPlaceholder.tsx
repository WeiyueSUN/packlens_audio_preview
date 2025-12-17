/**
 * 文件名: BytesPlaceholder.tsx
 * 作者: Weiyue Sun
 * 邮箱: sunweiyue@modelbest.cn
 * 创建日期: 2025-10-21
 * 创建时间: 02:43:20
 * 描述: 字节数据占位符组件，用于显示非音频的二进制数据信息
 * 
 * Copyright (c) 2025 Weiyue Sun
 */

import styled from "@emotion/styled";

const Placeholder = styled.span`
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: var(--vscode-editor-font-size, 12px);
  color: var(--vscode-descriptionForeground, #999);
  font-style: italic;
  padding: 2px 6px;
  background-color: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.1));
  border-radius: 3px;
  white-space: nowrap;
`;

export interface BytesPlaceholderProps {
  /** 字节数据的长度 */
  length: number;
}

/**
 * 字节数据占位符组件
 * 
 * 用于显示无法识别为音频格式的二进制数据，
 * 仅展示数据类型和字节长度信息
 * 
 * @example
 * <BytesPlaceholder length={1024} />
 * // 渲染为: [Bytes: 1024 bytes]
 */
export default function BytesPlaceholder({ length }: BytesPlaceholderProps) {
  return <Placeholder>[Bytes: {length} bytes]</Placeholder>;
}

