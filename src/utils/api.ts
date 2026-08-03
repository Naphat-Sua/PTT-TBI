import { QueryResult, BacktestRequest, BacktestResult, DocumentSource } from '@/types';
import emailjs from '@emailjs/browser';
import { retrieveRelevantChunks } from '@/utils/embeddings';
import { runLocalBacktest } from '@/utils/backtestEngine';
import { csvToReadableTable } from '@/utils/csv';
import { chunkText } from '@/utils/text';

// Re-export for existing consumers that import it from here
export { chunkText };

// ---------------------------------------------------------------------------
// Configuration (set these in a `.env.local` file — see `.env.example`)
// ---------------------------------------------------------------------------

const GEMINI_API_KEY: string = import.meta.env.VITE_GEMINI_API_KEY ?? '';

/** Default model, overridable per request and via VITE_GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL: string =
  import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-2.0-flash';

/** Build the generateContent endpoint for a given model. */
function geminiEndpoint(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;
}

/** Optional remote backtest service; when unset, backtests run locally. */
const BACKTEST_API_URL: string = import.meta.env.VITE_BACKTEST_API_URL ?? '';

const EMAILJS_PUBLIC_KEY: string = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? 'au_DHVVtrIxXGP7-6';
const EMAILJS_SERVICE_ID: string = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? 'service_9zkd18y';
const EMAILJS_TEMPLATE_ID: string = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? 'template_e5m53qp';

/** Default timeout for LLM requests (ms). */
const REQUEST_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

/**
 * Query the Gemini API, optionally prefixing RAG context.
 * @param model - Gemini model id to use; defaults to DEFAULT_GEMINI_MODEL.
 */
export async function queryGemini(
  prompt: string,
  context?: string,
  model: string = DEFAULT_GEMINI_MODEL
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return (
      'The AI service is not configured yet. Please set VITE_GEMINI_API_KEY in your ' +
      '.env.local file (see .env.example) and restart the dev server.'
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const text = context ? `${context}\n\nUser query: ${prompt}` : prompt;

    const response = await fetch(`${geminiEndpoint(model)}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API error: ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof answer !== 'string') {
      throw new Error('Unexpected response shape from the Gemini API');
    }
    return answer;
  } catch (error) {
    console.error('Error querying Gemini API:', error);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'The request timed out. Please try again.';
    }
    return `I encountered an error while processing your request. Please try again. (Error: ${
      error instanceof Error ? error.message : 'Unknown error'
    })`;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Oil data Q&A
// ---------------------------------------------------------------------------

/** Answer oil-market questions directly against Oildata-current.txt. */
export async function queryOilData(query: string): Promise<QueryResult> {
  try {
    const response = await fetch('/Oildata-current.txt');
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Oildata-current.txt: ${response.status} ${response.statusText}`
      );
    }

    const oilDataText = await response.text();
    const formattedOilData = formatCsvForAnalysis(oilDataText);

    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const contextPrompt = `Today is ${today}.

You are an oil market analyst assistant. You have the following WTI Crude Oil price data:

${formattedOilData}

Answer the following question with factual information from the data provided. Include specific prices and dates from the data when relevant. If asked about trends, analyze the price movement pattern over the given date range.

User question: ${query}`;

    const answer = await queryGemini(query, contextPrompt);

    const sources: DocumentSource[] = [
      {
        documentId: 'oil-data-current',
        documentName: 'finance.yahoo.com/quote/CL=F/',
        excerpt: oilDataText.substring(0, 200) + '...',
      },
    ];

    return { query, answer, sources };
  } catch (error) {
    console.error('Error querying oil data:', error);
    throw error;
  }
}

/** Format OHLCV CSV text into an aligned table plus a short trend summary. */
function formatCsvForAnalysis(csvData: string): string {
  try {
    const lines = csvData.trim().split('\n');
    const data = lines.slice(1).map((line) => line.split(','));

    // Sort data by date (newest first)
    data.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

    let formattedData = 'WTI Crude Oil Price Data:\n\n';
    formattedData +=
      'Date'.padEnd(12) +
      'Close'.padEnd(10) +
      'Open'.padEnd(10) +
      'High'.padEnd(10) +
      'Low'.padEnd(10) +
      'Volume\n';
    formattedData += '-'.repeat(60) + '\n';

    for (const row of data) {
      const date = new Date(row[0]);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      formattedData +=
        formattedDate.padEnd(12) +
        `$${parseFloat(row[4]).toFixed(2)}`.padEnd(10) +
        `$${parseFloat(row[1]).toFixed(2)}`.padEnd(10) +
        `$${parseFloat(row[2]).toFixed(2)}`.padEnd(10) +
        `$${parseFloat(row[3]).toFixed(2)}`.padEnd(10) +
        row[5] +
        '\n';
    }

    formattedData += '\nMarket Analysis:\n';

    const newest = data[0];
    const oldest = data[data.length - 1];
    const newestClose = parseFloat(newest[4]);
    const oldestClose = parseFloat(oldest[4]);
    const priceDiff = newestClose - oldestClose;
    const percentChange = ((priceDiff / oldestClose) * 100).toFixed(2);

    formattedData += `- From ${new Date(oldest[0]).toLocaleDateString()} to ${new Date(
      newest[0]
    ).toLocaleDateString()}, `;
    formattedData += `WTI crude oil prices have ${priceDiff >= 0 ? 'increased' : 'decreased'} by `;
    formattedData += `$${Math.abs(priceDiff).toFixed(2)} (${priceDiff >= 0 ? '+' : ''}${percentChange}%).\n`;

    const recentData = data.slice(0, 5);
    if (recentData.length >= 3) {
      const latestClose = parseFloat(recentData[0][4]);
      const prevClose = parseFloat(recentData[recentData.length - 1][4]);
      formattedData += `- In the last ${recentData.length} trading days, the price has ${
        latestClose > prevClose ? 'risen' : 'fallen'
      } `;
      formattedData += `from $${prevClose.toFixed(2)} to $${latestClose.toFixed(2)}.\n`;
    }

    return formattedData;
  } catch (error) {
    console.error('Error formatting CSV data:', error);
    return csvData;
  }
}

// ---------------------------------------------------------------------------
// RAG pipeline
// ---------------------------------------------------------------------------

/** Number of most-relevant chunks passed to the LLM per query. */
const RAG_TOP_K = 4;

/**
 * Retrieval-augmented query over the user's documents.
 *
 * Documents are split into overlapping chunks, embedded locally, and
 * ranked by cosine similarity against the query — only the most relevant
 * chunks are sent to the LLM, and sources point at the exact excerpts used.
 */
export async function queryRAG(
  query: string,
  documents: string[],
  documentNames?: string[],
  model: string = DEFAULT_GEMINI_MODEL
): Promise<QueryResult> {
  try {
    // Fall back to bundled oil price data when no documents are provided
    let workingDocuments = documents;
    let workingNames = documentNames;

    if (documents.length === 0) {
      const oilPriceData = await loadFallbackOilData();
      workingDocuments = [oilPriceData];
      workingNames = ['Oil Price Data'];
    }

    // Chunk every document, remembering which document each chunk came from
    const chunkTexts: string[] = [];
    const chunkOrigins: number[] = [];
    workingDocuments.forEach((doc, docIndex) => {
      for (const chunk of chunkText(doc)) {
        chunkTexts.push(chunk);
        chunkOrigins.push(docIndex);
      }
    });

    // Rank chunks against the query with local embeddings
    const retrieved = retrieveRelevantChunks(query, chunkTexts, RAG_TOP_K);

    const contextData = retrieved.map((chunk) => chunk.text).join('\n\n---\n\n');

    const answer = await queryGemini(
      `Query: ${query}\n\nBased on the following context, please provide a detailed answer:\n${contextData}`,
      undefined,
      model
    );

    // Build sources from the actual retrieved chunks
    const sources: DocumentSource[] = retrieved.map((chunk) => {
      const docIndex = chunkOrigins[chunk.index];
      return {
        documentId: `doc-${docIndex + 1}`,
        documentName: workingNames?.[docIndex] ?? `Document ${docIndex + 1}`,
        chunkIndex: chunk.index,
        excerpt: chunk.text.substring(0, 150) + (chunk.text.length > 150 ? '...' : ''),
      };
    });

    return { answer, sources };
  } catch (error) {
    console.error('Error in RAG query:', error);
    throw error;
  }
}

/** Load the bundled oil dataset used when the user has no documents. */
async function loadFallbackOilData(): Promise<string> {
  try {
    const response = await fetch('/Oildata.txt');
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.error('Error loading oil data:', error);
  }
  return `WTI Oil Price Data (April 2025)

Date        Price(USD)   Change
04/23/2025  64.08       -0.25%
04/22/2025  64.24       +2.93%
04/21/2025  62.41       -2.50%
04/17/2025  64.01       +3.53%
04/16/2025  61.83       +1.78%
04/15/2025  60.75       -0.49%`;
}

/** Generate a concise LLM summary of an uploaded document. */
export async function generateDocumentSummary(
  content: string,
  documentName: string
): Promise<string> {
  try {
    const prompt = `Please provide a concise summary of the following document titled "${documentName}":\n\n${content}

    The summary should:
    1. Identify the main topics covered in the document
    2. Extract key facts, figures, and insights
    3. Be no more than 3-4 paragraphs in length
    4. Highlight any particularly important information
    `;

    return await queryGemini(prompt);
  } catch (error) {
    console.error('Error generating document summary:', error);
    return 'Failed to generate summary. Please try again later.';
  }
}

// ---------------------------------------------------------------------------
// File processing
// ---------------------------------------------------------------------------

/** Read an uploaded file as text; CSV files are rendered as aligned tables. */
export async function processFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const content = reader.result as string;

          if (file.name.toLowerCase().endsWith('.csv')) {
            resolve(csvToReadableTable(content));
          } else {
            resolve(content);
          }
        } catch (error) {
          console.error('Error processing file content:', error);
          resolve((reader.result as string) || '');
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error in file processing:', error);
      reject(error);
    }
  });
}

// ---------------------------------------------------------------------------
// AlgoTrade backtesting
// ---------------------------------------------------------------------------

/**
 * Run a backtest. If VITE_BACKTEST_API_URL is configured the request is sent
 * to that service; otherwise the deterministic local engine is used, so the
 * same parameters always produce the same result.
 */
export async function runBacktest(request: BacktestRequest): Promise<BacktestResult> {
  if (BACKTEST_API_URL) {
    try {
      const response = await fetch(BACKTEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Remote backtest failed, falling back to local engine:', error);
    }
  }

  return runLocalBacktest(request);
}

/** Popular tickers for the AlgoTrade dropdown. */
export async function fetchAvailableTickers(): Promise<string[]> {
  return [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
    'TSLA', 'NVDA', 'JPM', 'BAC', 'WMT',
    'PFE', 'KO', 'DIS', 'NFLX', 'CSCO',
    'INTC', 'ORCL', 'CRM', 'IBM', 'UBER',
    'AMD', 'PYPL', 'SBUX', 'QCOM', 'GS',
  ];
}

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

/**
 * Send a user's message to the admin via EmailJS.
 * @returns true when the message was accepted.
 */
export async function sendMessageToAdmin(
  userName: string,
  userEmail: string,
  message: string
): Promise<boolean> {
  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);

    const fullMessage = `From: ${userName} (${userEmail})\n\n${message}`;
    const templateParams = {
      from_name: userName,
      name: userName,
      from_email: userEmail,
      email: userEmail,
      subject: `Contact form message from ${userName} (${userEmail})`,
      message: fullMessage,
      content: fullMessage,
      to_name: 'Admin',
      reply_to: userEmail,
    };

    const response = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

    if (response.status === 200) {
      return true;
    }
    throw new Error(`Failed to send message: Status code ${response.status}`);
  } catch (error) {
    console.error('Error sending message to admin:', error);
    throw error;
  }
}
