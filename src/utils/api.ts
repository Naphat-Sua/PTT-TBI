
import { Message, QueryResult } from '@/types';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyBxgn-xDCNbJSnTK4EWScySmImjef6E4g8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Function to query the Gemini API
export async function queryGemini(prompt: string, context?: string): Promise<string> {
  try {
    const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    
    const systemContext = 'You are ChatTBU, a helpful AI assistant for data analysts and scientists. Provide clear, accurate responses.';
    
    let content = [
      { text: systemContext, role: 'system' },
      { text: prompt, role: 'user' }
    ];
    
    // Add context from RAG if available
    if (context) {
      content.splice(1, 0, { 
        text: `Context information: ${context}. Use this information to inform your response.`, 
        role: 'system' 
      });
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error querying Gemini API:', error);
    return `I encountered an error while processing your request. Please try again. (Error: ${error instanceof Error ? error.message : 'Unknown error'})`;
  }
}

// Function to simulate RAG query (this would connect to the real backend in production)
export async function queryRAG(query: string, documents: string[]): Promise<QueryResult> {
  try {
    // In a real implementation, this would:
    // 1. Convert the query to an embedding
    // 2. Search the vector store for similar document chunks
    // 3. Pass the retrieved chunks and query to an LLM
    // 4. Return the response with sources
    
    // For now we'll simulate this process
    const simulatedResponse = await queryGemini(
      `Query: ${query}\n\nBased on the following context, please provide a detailed answer:\n${documents.join('\n\n')}`,
    );
    
    return {
      answer: simulatedResponse,
      sources: [
        { documentId: '1', documentName: 'Sample Document 1', excerpt: documents[0]?.substring(0, 100) + '...' },
      ]
    };
  } catch (error) {
    console.error('Error in RAG query:', error);
    throw error;
  }
}

// Function to handle file processing
export async function processFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    if (file.type === 'application/pdf') {
      // For PDF files, we'd use a PDF parsing library
      // For demo purposes, we're just reading as text
      reader.readAsText(file);
    } else if (file.type === 'text/csv') {
      // For CSV files
      reader.readAsText(file);
    } else {
      // Default text reading
      reader.readAsText(file);
    }
  });
}

// Function to chunk text
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  
  if (text.length <= chunkSize) {
    chunks.push(text);
    return chunks;
  }
  
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    if (endIndex < text.length) {
      // Try to find a natural break point (sentence or paragraph)
      const breakPoints = ['. ', '.\n', '\n\n', '\n', ' '];
      
      for (const bp of breakPoints) {
        const naturalBreak = text.lastIndexOf(bp, endIndex);
        
        if (naturalBreak > startIndex && naturalBreak < endIndex) {
          endIndex = naturalBreak + bp.length;
          break;
        }
      }
    } else {
      endIndex = text.length;
    }
    
    chunks.push(text.substring(startIndex, endIndex));
    startIndex = endIndex - overlap;
  }
  
  return chunks;
}
