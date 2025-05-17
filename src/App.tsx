import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import TBIRAG from "./pages/TBIRAG";
import FullRAG from "./pages/FullRAG";
import AlgoTrade from "./pages/AlgoTrade";
import ChatTBU from "./pages/ChatTBU";
import MModeling from "./pages/MModeling";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rag" element={<TBIRAG />} />
              <Route path="/fullrag" element={<FullRAG />} />
              <Route path="/algotrade" element={<AlgoTrade />} />
              <Route path="/chat" element={<ChatTBU />} />
              <Route path="/modeling" element={<MModeling />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
