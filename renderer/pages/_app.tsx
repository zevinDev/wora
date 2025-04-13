import "@/styles/globals.css";
import Actions from "@/components/ui/actions";
import Navbar from "@/components/main/navbar";
import Player from "@/components/main/player";
import { PlayerProvider } from "@/context/playerContext";
import { useRouter } from "next/router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/themeProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState, useRef } from "react";
import { PageTransition } from "@/components/ui/page-transition";

// Pages that use special layout without navigation and player
const SPECIAL_LAYOUTS = ["/setup"];

// Pages that should have scrolling disabled
const NO_SCROLL_PAGES = ["/albums", "/songs"];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isFirstNav = useRef(true);
  const transitionTimer = useRef<NodeJS.Timeout | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  // Check if current route uses special layout
  const isSpecialLayout = SPECIAL_LAYOUTS.includes(router.pathname);

  // Check if current page should have scrolling disabled
  const isNoScrollPage = NO_SCROLL_PAGES.includes(router.pathname);

  // Trigger initial fade-in animation
  useEffect(() => {
    const initialFadeTimer = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(initialFadeTimer);
  }, []);

  // Handle page transition effects
  useEffect(() => {
    const handleRouteChangeStart = () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      setFadeIn(false);
      setIsLoading(true);
    };

    const handleRouteChangeComplete = () => {
      // Sequence the transitions with optimized timing
      transitionTimer.current = setTimeout(() => {
        setIsLoading(false);

        transitionTimer.current = setTimeout(() => {
          setFadeIn(true);

          // Skip scroll reset on first navigation
          if (isFirstNav.current) {
            isFirstNav.current = false;
          }
        }, 30);
      }, 100);
    };

    const handleRouteChangeError = () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      setIsLoading(false);
      setFadeIn(true);
    };

    // Set up router event listeners
    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);
    router.events.on("routeChangeError", handleRouteChangeError);

    // Clean up event listeners
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
      router.events.off("routeChangeError", handleRouteChangeError);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, [router]);

  // Preload essential data for better UX
  useEffect(() => {
    if (!isSpecialLayout) {
      // Load critical data in parallel
      Promise.all([
        window.ipc
          .invoke("getSettings")
          .catch((err) => console.error("Error loading settings:", err)),
        window.ipc
          .invoke("getRandomLibraryItems")
          .catch((err) => console.error("Error loading library items:", err)),
      ]).catch((err) => console.error("Error in data preloading:", err));
    }
  }, [isSpecialLayout, router.pathname]);

  // Special layout for setup page
  if (isSpecialLayout) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <main className="select-none bg-white text-xs text-black antialiased dark:bg-black dark:text-white">
          <Component {...pageProps} />
        </main>
      </ThemeProvider>
    );
  }

  // Main application layout
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <div className="draggable-region"></div>
      <PlayerProvider>
        <main className="select-none bg-white text-xs text-black antialiased dark:bg-black dark:text-white">
          <div className="h-dvh w-dvw">
            <Actions />
            <Toaster position="top-right" />

            <div className="flex gap-8">
              {/* Navigation sidebar */}
              <div className="sticky top-0 z-50 h-dvh p-8 pr-0 pt-12">
                <Navbar />
              </div>

              {/* Main content area */}
              <div className="h-dvh flex-grow p-8 pl-0 pt-12">
                <div className="wora-transition relative flex h-full w-full flex-col">
                  {isNoScrollPage ? (
                    /* No scroll container for albums and songs pages */
                    <div className="h-full w-full overflow-hidden">
                      <div
                        className={`transition-all duration-200 ease-out ${
                          fadeIn
                            ? "translate-y-0 opacity-100"
                            : "translate-y-2 opacity-0"
                        }`}
                        style={{ willChange: "transform, opacity" }}
                      >
                        <PageTransition isLoading={isLoading}>
                          <Component key={router.pathname} {...pageProps} />
                        </PageTransition>
                      </div>
                    </div>
                  ) : (
                    /* Normal scroll behavior for other pages */
                    <ScrollArea
                      ref={scrollAreaRef}
                      className="h-full w-full gradient-mask-b-70"
                    >
                      {/* Page content with transition effects */}
                      <div
                        className={`transition-all duration-200 ease-out ${
                          fadeIn
                            ? "translate-y-0 opacity-100"
                            : "translate-y-2 opacity-0"
                        }`}
                        style={{ willChange: "transform, opacity" }}
                      >
                        <PageTransition isLoading={isLoading}>
                          <Component key={router.pathname} {...pageProps} />
                        </PageTransition>
                      </div>

                      {/* Bottom spacing for player */}
                      <div className="h-[20vh] w-full" />
                    </ScrollArea>
                  )}

                  {/* Player always visible at bottom */}
                  <Player />
                </div>
              </div>
            </div>
          </div>
        </main>
      </PlayerProvider>
    </ThemeProvider>
  );
}
