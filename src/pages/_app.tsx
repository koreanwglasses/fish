import "../styles/globals.css";
import type { AppProps } from "next/app";
import { io, Socket } from "socket.io-client";
import React, {
  useEffect,
  useState,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { post } from "../lib/fetchers";
import { createTheme, Fade, ThemeProvider } from "@mui/material";
import { SnackbarProvider } from "notistack";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#0097a7",
    },
    secondary: {
      main: "#e91e63",
    },
  },
});

const PageContext = createContext<{
  setNextTransition?: (transition: {
    nextURL?: string;
    timeout?: number;
  }) => void;
}>({});

export const usePageTransition = () => {
  const { setNextTransition } = useContext(PageContext);

  const cb = useCallback(
    (url: string, timeout?: number) => {
      if (!setNextTransition) {
        window.location.href = url;
        return;
      }
      setNextTransition({ nextURL: url, timeout });
    },
    [setNextTransition]
  );
  return cb;
};

export const SocketIOContext = createContext<{
  socket?: Socket;
  socketIndex?: number;
}>({});

function MyApp({ Component, pageProps }: AppProps) {
  const [{ nextURL, timeout }, setNextTransition] = useState<{
    nextURL?: string;
    timeout?: number;
  }>({});

  useEffect(() => {
    if (nextURL) {
      setTimeout(() => {
        window.location.href = nextURL;
      }, timeout ?? 300);
    }
  }, [nextURL, timeout]);

  const pageContext = useMemo(() => ({ setNextTransition }), []);

  // We only want one socket per client instance, so we
  // provide it at the root component level.

  const [context, setContext] = useState<{
    socket?: Socket;
    socketIndex?: number;
  }>({});

  useEffect(() => {
    const socket = io({ path: "/api/socket/io" });
    setContext({ socket });

    socket.on("connect", async () => {
      const { socketIndex } = await post("/api/socket/session/link", {
        socketId: socket.id,
      });
      setContext({ socket, socketIndex });
    });

    socket.on("disconnect", () => {
      setContext({});
    });

    return () => {
      setContext({});
      socket.disconnect();
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <PageContext.Provider value={pageContext}>
        <SocketIOContext.Provider value={context}>
          <SnackbarProvider maxSnack={3}>
            <Fade in={!nextURL}>
              <span>
                <Component {...pageProps} />
              </span>
            </Fade>
          </SnackbarProvider>
        </SocketIOContext.Provider>
      </PageContext.Provider>
    </ThemeProvider>
  );
}

export default MyApp;
