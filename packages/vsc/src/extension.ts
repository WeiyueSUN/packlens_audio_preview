import * as vscode from "vscode";
import { variables } from "./variables";
import { PackLensEditorProvider } from "./PackLensEditorProvider";

// 创建全局输出通道
export const outputChannel = vscode.window.createOutputChannel("PackLens");

export function activate(context: vscode.ExtensionContext) {
  variables.extensionMode = context.extensionMode;
  
  // 显示输出通道
  outputChannel.show(true); // true = 保留焦点在编辑器
  outputChannel.appendLine('🎵 PackLens 已激活');
  outputChannel.appendLine('═'.repeat(50));
  
  context.subscriptions.push(
    outputChannel,
    ...PackLensEditorProvider.register(context)
  );
}

export function deactivate() {
  outputChannel.appendLine('PackLens 已停用');
  outputChannel.dispose();
}
