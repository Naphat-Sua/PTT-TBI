import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import { ThemeProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import MessageLoader from "@/components/ui/message-loader";

// Route-level code splitting: each page loads on demand, keeping the
// initial bundle small (heavy libs like Plotly/Monaco only load on their page).
const TBIRAG = lazy(() => import("./pages/TBIRAG"));
const FullRAG = lazy(() => import("./pages/FullRAG"));
const AlgoTrade = lazy(() => import("./pages/AlgoTrade"));
const ChatTBU = lazy(() => import("./pages/ChatTBU"));
const MModeling = lazy(() => import("./pages/MModeling"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <MessageLoader size="lg" color="primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <ErrorBoundary>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/rag" element={<TBIRAG />} />
                  <Route path="/fullrag" element={<FullRAG />} />
                  <Route path="/algotrade" element={<AlgoTrade />} />
                  <Route path="/chat" element={<ChatTBU />} />
                  <Route path="/modeling" element={<MModeling />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
