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
import {
  Box,
  CircularProgress,
  createTheme,
  Fade,
  ThemeProvider,
} from "@mui/material";
import { SnackbarProvider } from "notistack";
import { useRouter } from "next/router";

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
  setNextTransition?: (transition: { nextURL?: string }) => void;
}>({});

export const usePageTransition = () => {
  const { setNextTransition } = useContext(PageContext);
  const router = useRouter();

  const cb = useCallback(
    async (url: string, timeout = 200) => {
      if (!setNextTransition) {
        router.push(url);
        return;
      }
      router.prefetch(url);
      setNextTransition({ nextURL: url });
      await new Promise((res) => setTimeout(res, timeout));
      await router.push(url);
      setNextTransition({});
    },
    [router, setNextTransition]
  );
  return cb;
};

export const SocketIOContext = createContext<{
  socket?: Socket;
  socketIndex?: number;
}>({});

function MyApp({ Component, pageProps }: AppProps) {
  const [{ nextURL }, setNextTransition] = useState<{
    nextURL?: string;
  }>({});

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
            <Fade in={!!nextURL}>
              <Box
                sx={{
                  width: "100vw",
                  height: "100vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  position: "absolute",
                }}
              >
                <CircularProgress sx={{ color: "white", opacity: 0.5 }} />
              </Box>
            </Fade>
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
