import * as vscode from "vscode";
import { Disposable } from "./Disposable";
import {
  Request,
  Response,
  MessageMedium,
  StreamServer,
} from "@msgpack-audio-viewer/common";
import fs from "node:fs/promises";
import { getNonce } from "./util";
import { Readable } from "node:stream";
import { outputChannel } from "./extension";

class MsgPackDocument extends Disposable implements vscode.CustomDocument {
  public readonly uri: vscode.Uri;
  private streamServer: StreamServer;
  private fileHandle: fs.FileHandle;

  public constructor(uri: vscode.Uri, fileHandle: fs.FileHandle) {
    super();
    this.uri = uri;
    this.fileHandle = fileHandle;

    this.streamServer = new StreamServer(() => {
      const readStream = fileHandle.createReadStream({
        autoClose: false,
        emitClose: false,
        start: 0,
      });
      return Readable.toWeb(readStream);
    });
  }

  public static async create(uri: vscode.Uri): Promise<MsgPackDocument> {
    const fileHandle = await fs.open(uri.fsPath);
    return new MsgPackDocument(uri, fileHandle);
  }

  public onDidReceiveMessage(
    message: Request,
    messageMedium: MessageMedium,
  ): void {
    this.streamServer.onDidReceiveMessage(message, messageMedium);
  }

  dispose(): void {
    this.streamServer.dispose();
    this.fileHandle.close();
  }
}

export class PackLensEditorProvider
  implements vscode.CustomEditorProvider<MsgPackDocument>
{
  private static readonly viewType = "msgpack-audio-viewer.msgpack";
  private readonly context: vscode.ExtensionContext;
  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<MsgPackDocument>
  >();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static register(
    context: vscode.ExtensionContext,
  ): vscode.Disposable[] {
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      PackLensEditorProvider.viewType,
      new PackLensEditorProvider(context),
    );

    return [providerRegistration];
  }

  onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  saveCustomDocument(
    document: MsgPackDocument,
    cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return Promise.resolve();
  }
  saveCustomDocumentAs(
    document: MsgPackDocument,
    destination: vscode.Uri,
    cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return Promise.resolve();
  }
  revertCustomDocument(
    document: MsgPackDocument,
    cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return Promise.resolve();
  }
  backupCustomDocument(
    document: MsgPackDocument,
    context: vscode.CustomDocumentBackupContext,
    cancellation: vscode.CancellationToken,
  ): Thenable<vscode.CustomDocumentBackup> {
    return Promise.resolve({ id: "", delete: () => {} });
  }
  openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    token: vscode.CancellationToken,
  ): MsgPackDocument | Thenable<MsgPackDocument> {
    return MsgPackDocument.create(uri);
  }
  resolveCustomEditor(
    document: MsgPackDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): Thenable<void> | void {
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
    
    // 添加日志输出
    outputChannel.appendLine(`\n📂 打开文件: ${document.uri.fsPath}`);
    outputChannel.appendLine('─'.repeat(50));
    
    webviewPanel.webview.onDidReceiveMessage((e) => {
      // 处理日志消息
      if (e.type === 'log') {
        const { level, message, data } = e;
        const timestamp = new Date().toLocaleTimeString();
        const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
        outputChannel.appendLine(`[${timestamp}] ${prefix} ${message}`);
        if (data) {
          outputChannel.appendLine(`  ${JSON.stringify(data, null, 2)}`);
        }
        return;
      }
      
      // 原有的消息处理
      document.onDidReceiveMessage(e, {
        postMessage: (response: Response) => {
          if (!response.body.ok) {
            const error = response.body.error.error;
            const message =
              error !== null && typeof error === "object" && "message" in error
                ? (error.message as string)
                : "Failed to read the file.";

            vscode.window.showErrorMessage(message);
          }
          webviewPanel.webview.postMessage(response);
        },
      });
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const buildUri = (fileName: string) =>
      webview.asWebviewUri(
        vscode.Uri.joinPath(
          this.context.extensionUri,
          "dist",
          "webviews",
          fileName,
        ),
      );

    const scriptUri = buildUri("index.js");
    const styleUri = buildUri("index.css");
    const iconUri = buildUri("codicon.css");

    const nonce = getNonce();

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: blob:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'wasm-unsafe-eval' 'nonce-${nonce}'; font-src ${webview.cspSource}; connect-src ${webview.cspSource} data: blob:;">
            <link rel="stylesheet" href="${iconUri}" id="vscode-codicon-stylesheet">
            <link rel="stylesheet" crossorigin href="${styleUri}">
            <title>Message Pack Lens</title>
        </head>
        <body>
            <div id="root"></div>
            <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
        </body>
        </html>`;
  }
}
