// src/app/api/transcript-status/route.ts
import { NextResponse } from 'next/server';
import { getTranscript, getTranscriptsByStatus } from '@/app/lib/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');

    // If conversationId is provided, get specific transcript
    if (conversationId) {
      const transcript = await getTranscript(conversationId);

      if (!transcript) {
        return NextResponse.json(
          { error: 'Transcript not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(transcript, { status: 200 });
    }

    // Otherwise, get summary of all transcripts
    const pending = await getTranscriptsByStatus('pending');
    const failed = await getTranscriptsByStatus('failed');
    const sent = await getTranscriptsByStatus('sent');

    return NextResponse.json({
      pending: pending.length,
      failed: failed.length,
      sent: sent.length,
      total: pending.length + failed.length + sent.length,
      pendingIds: pending,
      failedIds: failed,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('Error in transcript-status:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve transcript status' },
      { status: 500 }
    );
  }
}
