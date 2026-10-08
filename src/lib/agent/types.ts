import { ExtractedClaim } from '../verification/types';

export interface AgentConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export type ExtractorSource = 'ai_agent' | 'fallback_heuristic';

export interface AgentExtractionResult {
  extracted: ExtractedClaim;
  extractorSource: ExtractorSource;
  modelUsed?: string;
  modelRequested?: string;
  fallbackReason?: string;
}

export interface ImageExtractionResult {
  success: boolean;
  extractedText: string;
  suggestedTicker?: string | null;
  confidence: 'high' | 'medium' | 'low';
  message?: string;
  extractorSource: 'ai_vision' | 'fallback';
  modelUsed?: string;
  modelRequested?: string;
  fallbackReason?: string;
}
