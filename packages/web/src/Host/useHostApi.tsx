import { useContext, useMemo } from "react";
import {
  RequestInitRead,
  RequestLoadPage,
  requestTypes,
} from "@msgpack-audio-viewer/common";
import { clientPrefix } from "../Utils/logger";
import { HostApiContext } from "./HostApiContext";

export function useHostApi() {
  const context = useContext(HostApiContext);
  return useMemo(
    () => ({
      ...context,
      initRead: (pageSize: number, parserScript?: string) => {
        console.debug(clientPrefix, "requesting init read", {
          pageSize,
          parserScript,
        });
        context.hostApi.postMessage({
          type: requestTypes.init_read,
          id: getId(),
          body: { parserScript, pageSize },
        } as RequestInitRead);
      },
      loadPage: (pageNumber: number) => {
        console.debug(clientPrefix, "requesting load page", { pageNumber });
        context.hostApi.postMessage({
          type: requestTypes.load_page,
          id: getId(),
          body: { pageNumber },
        } as RequestLoadPage);
      },
    }),
    [context],
  );
}

function getId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36);
}
