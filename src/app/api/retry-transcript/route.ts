// src/app/api/retry-transcript/route.ts
import { NextResponse } from 'next/server';
import { getTranscript, updateTranscriptStatus } from '@/app/lib/db';

export async function POST(request: Request) {
  const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;

  if (!zapierWebhookUrl) {
    return NextResponse.json(
      { error: 'Server configuration error: Zapier webhook URL missing.' },
      { status: 500 }
    );
  }

  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Get transcript from database
    const transcript = await getTranscript(conversationId);

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    // Construct Zapier payload
    const zapierPayload = {
      fileName: transcript.metadata.fileName,
      textContent: transcript.content.text,
      conversationId: conversationId,
      eventTimestamp: new Date().toISOString(),
      isRetry: true,
      previousAttempts: transcript.metadata.zapierAttempts,
      deliveryId: `${conversationId}-${transcript.metadata.zapierAttempts + 1}` // For idempotency
    };

    try {
      // Send to Zapier
      const zapierResponse = await fetch(zapierWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zapierPayload),
      });

      // Capture response for logging
      const responseText = await zapierResponse.text();
      console.log(`Retry response status: ${zapierResponse.status}`);
      console.log(`Retry response body: ${responseText}`);

      if (!zapierResponse.ok) {
        // Update status to failed
        await updateTranscriptStatus(conversationId, 'failed', {
          status: zapierResponse.status,
          statusText: zapierResponse.statusText,
          body: responseText,
          isRetry: true
        });

        return NextResponse.json(
          { error: 'Retry failed', details: responseText },
          { status: zapierResponse.status }
        );
      }

      // Update status to sent
      await updateTranscriptStatus(conversationId, 'sent', {
        status: zapierResponse.status,
        statusText: zapierResponse.statusText,
        isRetry: true
      });

      return NextResponse.json(
        { message: 'Transcript successfully resent to Zapier' },
        { status: 200 }
      );
    } catch (networkError) {
      // Handle network errors
      console.error('Network error during retry:', networkError);

      await updateTranscriptStatus(conversationId, 'failed', {
        errorType: 'NETWORK',
        message: networkError.message,
        isRetry: true
      });

      return NextResponse.json(
        { error: 'Network error during retry', details: networkError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in retry-transcript:', error);
    return NextResponse.json(
      { error: 'Failed to process retry request' },
      { status: 500 }
    );
  }
}
