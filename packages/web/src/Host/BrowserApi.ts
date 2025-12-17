import { Request, Response, StreamServer } from "@msgpack-audio-viewer/common";
import { WebviewApi } from "vscode-webview";
import { serverPrefix } from "../Utils/logger";

const messageMedium = {
  postMessage: (message: Response) => {
    window.postMessage(message);
  },
};

export class BrowserApi<TStateType = unknown>
  implements WebviewApi<TStateType>
{
  private streamServer?: StreamServer;

  getState(): TStateType | undefined {
    return undefined;
  }

  setState<T extends TStateType | undefined>(newState: T): T {
    return newState;
  }

  postMessage(message: Request) {
    console.debug(serverPrefix, "BrowserApi received", message);

    if (!this.streamServer) {
      throw new Error("Stream server is not set.");
    }

    // simulate event dispatch
    setTimeout(() => {
      this.streamServer?.onDidReceiveMessage(message, messageMedium);
    });
  }

  public setFile(file: File) {
    this.streamServer = new StreamServer(() => file.stream());
  }
}
