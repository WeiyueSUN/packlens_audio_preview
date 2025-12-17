import React, { useEffect } from "react";
import { useHostApi } from "./Host/useHostApi";
import BrowserContent from "./BrowserContent";
import Viewer from "./Viewer";
import { HostApiProvider } from "./Host/HostApiProvider";
import { HostThemeProvider } from "./Host/HostThemeProvider";
import { vscodeLogger } from "./Utils/vscodeLogger";
import "./index.css";

const App: React.FC = () => {
  useEffect(() => {
    vscodeLogger.info('[App] App 组件已挂载');
  }, []);

  return (
    <HostApiProvider>
      <HostThemeProvider>
        <Content />
      </HostThemeProvider>
    </HostApiProvider>
  );
};

function Content() {
  const { isBrowserEnv } = useHostApi();
  
  useEffect(() => {
    vscodeLogger.info(`[Content] Content 组件已挂载, isBrowserEnv=${isBrowserEnv}`);
  }, [isBrowserEnv]);
  
  return isBrowserEnv ? <BrowserContent /> : <Viewer />;
}

export default App;
