import { ReactNode, useMemo, useEffect } from "react";
import { HostApiContextType, HostApiContext } from "./HostApiContext";
import { BrowserApi } from "./BrowserApi";
import { setVscodeApi } from "../Utils/vscodeLogger";

// VS Code API 类型声明
declare function acquireVsCodeApi(): any;

export function HostApiProvider({ children }: { children: ReactNode }) {
  const value = useMemo<HostApiContextType>(() => {
    const isVSCode = typeof acquireVsCodeApi !== "undefined";
    console.log(`[HostApiProvider] 环境检测: isVSCode=${isVSCode}`);
    
    try {
      if (isVSCode) {
        const api = acquireVsCodeApi();
        console.log(`[HostApiProvider] VS Code API 已获取`);
        
        // ✅ 设置到 vscodeLogger，让它可以发送日志到输出面板
        setVscodeApi(api);
        
        return { isBrowserEnv: false, hostApi: api };
      } else {
        console.log(`[HostApiProvider] 使用浏览器 API`);
        return { isBrowserEnv: true, hostApi: new BrowserApi() };
      }
    } catch (err) {
      console.error(`[HostApiProvider] 初始化失败:`, err);
      throw err;
    }
  }, []);
  
  useEffect(() => {
    console.log(`[HostApiProvider] Provider 已挂载, isBrowserEnv=${value.isBrowserEnv}`);
  }, [value]);

  return (
    <HostApiContext.Provider value={value}>{children}</HostApiContext.Provider>
  );
}
