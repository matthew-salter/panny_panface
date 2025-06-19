// src/app/api/cleanup-transcripts/route.ts
import { NextResponse } from 'next/server';
import { cleanupOldTranscripts } from '@/app/lib/db';

export async function POST() {
  try {
    const cleanedCount = await cleanupOldTranscripts();

    return NextResponse.json({
      message: `Successfully cleaned up ${cleanedCount} old transcripts`,
      count: cleanedCount
    }, { status: 200 });
  } catch (error) {
    console.error('Error cleaning up transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to clean up transcripts' },
      { status: 500 }
    );
  }
}
