/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Gemini API key used by the chat/RAG features. */
  readonly VITE_GEMINI_API_KEY?: string;
  /** Gemini model id (defaults to gemini-2.0-flash). */
  readonly VITE_GEMINI_MODEL?: string;
  /** Optional remote backtest service URL; local engine is used when unset. */
  readonly VITE_BACKTEST_API_URL?: string;
  /** Data-modeling API base URL (defaults to http://localhost:5000/api). */
  readonly VITE_DATA_API_URL?: string;
  /** EmailJS credentials for the contact form. */
  readonly VITE_EMAILJS_PUBLIC_KEY?: string;
  readonly VITE_EMAILJS_SERVICE_ID?: string;
  readonly VITE_EMAILJS_TEMPLATE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'plotly.js-finance-dist-min' {
  import * as Plotly from 'plotly.js';
  export default Plotly;
}
