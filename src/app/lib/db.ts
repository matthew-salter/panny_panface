// src/app/lib/db.ts
import Client from '@replit/database';
import { v4 as uuidv4 } from 'uuid';

// Initialize the database client
const db = new Client();

// Types
export interface TranscriptMetadata {
  conversationId: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'sent' | 'failed';
  zapierAttempts: number;
  lastZapierAttempt: string | null;
  lastZapierResponse?: any;
}

export interface TranscriptContent {
  text: string;
  timestamp: string;
}

export interface Transcript {
  metadata: TranscriptMetadata;
  content: TranscriptContent;
}

/**
 * Save a new transcript to the database
 */
export async function saveTranscript(
  conversationId: string | undefined,
  content: string,
  fileName: string
): Promise<TranscriptMetadata> {
  // Generate ID if not provided
  const id = conversationId || uuidv4();
  const timestamp = new Date().toISOString();

  // Create metadata
  const metadata: TranscriptMetadata = {
    conversationId: id,
    fileName,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: 'pending',
    zapierAttempts: 0,
    lastZapierAttempt: null
  };

  // Create content object
  const contentObj: TranscriptContent = {
    text: content,
    timestamp
  };

  // Store in database
  await db.set(`transcript:${id}:metadata`, metadata);
  await db.set(`transcript:${id}:content`, contentObj);

  // Update indexes
  await updateIndex('all', id);
  await updateIndex('pending', id);

  console.log(`Transcript saved to database: ${id}`);
  return metadata;
}

/**
 * Update transcript status after delivery attempt
 */
export async function updateTranscriptStatus(
  conversationId: string,
  status: 'pending' | 'sent' | 'failed',
  responseDetails?: any
): Promise<TranscriptMetadata | null> {
  try {
    // Get current metadata
    const metadataKey = `transcript:${conversationId}:metadata`;
    const metadata = await db.get(metadataKey) as TranscriptMetadata | null;

    if (!metadata) {
      console.error(`Transcript metadata not found for ID: ${conversationId}`);
      return null;
    }

    // Update metadata
    const updatedMetadata: TranscriptMetadata = {
      ...metadata,
      status,
      updatedAt: new Date().toISOString(),
      zapierAttempts: metadata.zapierAttempts + 1,
      lastZapierAttempt: new Date().toISOString(),
      lastZapierResponse: responseDetails
    };

    // Save updated metadata
    await db.set(metadataKey, updatedMetadata);

    // Update indexes
    if (metadata.status !== status) {
      await removeFromIndex(metadata.status, conversationId);
      await updateIndex(status, conversationId);
    }

    console.log(`Transcript status updated: ${conversationId} -> ${status}`);
    return updatedMetadata;
  } catch (error) {
    console.error('Error updating transcript status:', error);
    return null;
  }
}

/**
 * Get a transcript by ID
 */
export async function getTranscript(conversationId: string): Promise<Transcript | null> {
  try {
    const metadata = await db.get(`transcript:${conversationId}:metadata`) as TranscriptMetadata | null;
    const content = await db.get(`transcript:${conversationId}:content`) as TranscriptContent | null;

    if (!metadata || !content) {
      return null;
    }

    return { metadata, content };
  } catch (error) {
    console.error('Error retrieving transcript:', error);
    return null;
  }
}

/**
 * Get all transcript IDs with a specific status
 */
export async function getTranscriptsByStatus(status: 'pending' | 'sent' | 'failed'): Promise<string[]> {
  try {
    return await db.get(`transcript:index:${status}`) as string[] || [];
  } catch (error) {
    console.error(`Error retrieving ${status} transcripts:`, error);
    return [];
  }
}

/**
 * Clean up transcripts that were successfully sent over 24 hours ago
 */
export async function cleanupOldTranscripts(): Promise<number> {
  try {
    const sentIndex = await db.get("transcript:index:sent") as string[] || [];
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const conversationId of sentIndex) {
      const metadata = await db.get(`transcript:${conversationId}:metadata`) as TranscriptMetadata | null;

      if (metadata && metadata.status === "sent") {
        const sentTime = new Date(metadata.updatedAt).getTime();

        if (now - sentTime > oneDayMs) {
          // Delete transcript data
          await db.delete(`transcript:${conversationId}:metadata`);
          await db.delete(`transcript:${conversationId}:content`);

          // Update indexes
          await removeFromIndex('sent', conversationId);
          await removeFromIndex('all', conversationId);

          console.log(`Cleaned up transcript: ${conversationId}`);
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up old transcripts:', error);
    return 0;
  }
}

/**
 * Helper function to update an index
 */
async function updateIndex(indexName: 'all' | 'pending' | 'sent' | 'failed', conversationId: string): Promise<void> {
  const indexKey = `transcript:index:${indexName}`;
  const currentIndex = await db.get(indexKey) as string[] || [];

  if (!currentIndex.includes(conversationId)) {
    const updatedIndex = [...currentIndex, conversationId];
    await db.set(indexKey, updatedIndex);
  }
}

/**
 * Helper function to remove from an index
 */
async function removeFromIndex(indexName: 'pending' | 'sent' | 'failed' | 'all', conversationId: string): Promise<void> {
  const indexKey = `transcript:index:${indexName}`;
  const currentIndex = await db.get(indexKey) as string[] || [];

  if (currentIndex.includes(conversationId)) {
    const updatedIndex = currentIndex.filter(id => id !== conversationId);
    await db.set(indexKey, updatedIndex);
  }
}

// Export the database client for direct access if needed
export default db;
