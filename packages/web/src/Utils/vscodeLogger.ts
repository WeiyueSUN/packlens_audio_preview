/**
 * 文件名: vscodeLogger.ts
 * 作者: Weiyue Sun
 * 描述: VS Code 输出面板日志工具
 * 
 * ⚠️ 重要：不在这里调用 acquireVsCodeApi()！
 * acquireVsCodeApi() 只能调用一次，已经在 HostApiProvider 中调用了。
 * 这里只是获取一个引用。
 */

// VS Code API 引用（由外部设置）
let vscodeApi: any = null;

/**
 * 设置 VS Code API 引用
 * 应该在 HostApiProvider 中调用
 */
export function setVscodeApi(api: any) {
  vscodeApi = api;
  console.log('[vscodeLogger] VS Code API 已设置');
}

/**
 * 发送日志到 VS Code 输出面板
 */
function sendToOutputChannel(level: 'info' | 'success' | 'warn' | 'error', message: string, data?: any) {
  if (vscodeApi) {
    vscodeApi.postMessage({
      type: 'log',
      level,
      message,
      data,
    });
  }
  
  // 同时输出到浏览器控制台
  const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleMethod(`[${level.toUpperCase()}] ${message}`, data || '');
}

/**
 * VS Code 输出面板日志器
 */
export const vscodeLogger = {
  info: (message: string, data?: any) => sendToOutputChannel('info', message, data),
  success: (message: string, data?: any) => sendToOutputChannel('success', message, data),
  warn: (message: string, data?: any) => sendToOutputChannel('warn', message, data),
  error: (message: string, data?: any) => sendToOutputChannel('error', message, data),
};

