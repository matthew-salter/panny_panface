// File: /home/ubuntu/project_files/LIVE-PANNY-PAN-FACE/src/app/api/save-transcript/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;

  if (!zapierWebhookUrl) {
    console.error("Zapier Webhook URL is not configured in environment variables. Please set ZAPIER_WEBHOOK_URL.");
    return NextResponse.json(
      { error: "Server configuration error: Zapier webhook URL missing." },
      { status: 500 }
    );
  }

  try {
    const requestBody = await request.json();
    const { fileName, content, conversationId, timestamp } = requestBody;

    // Basic validation for required fields
    if (!fileName || typeof fileName !== "string" || !content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Invalid request body: fileName (string) and content (string) are required." },
        { status: 400 }
      );
    }

    // Construct the payload to be sent to the Zapier Webhook.
    // This payload is designed for a Zapier action like "Create File from Text" in Google Drive.
    // The Zapier Zap should be configured to use `textContent` for the file content 
    // and `fileName` for the file name.
    const zapierPayload = {
      fileName: fileName,
      textContent: content,
      conversationId: conversationId, // Optional, pass if useful for Zapier
      eventTimestamp: timestamp,       // Optional, pass if useful for Zapier
      // Add any other fields you want to pass to Zapier here
    };

    console.log(`Forwarding transcript to Zapier: ${fileName}`);
    const zapierResponse = await fetch(zapierWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(zapierPayload),
    });

    if (!zapierResponse.ok) {
      const errorBody = await zapierResponse.text();
      console.error(`Error from Zapier: ${zapierResponse.status} ${zapierResponse.statusText}`, errorBody);
      return NextResponse.json(
        { error: "Failed to forward transcript to Zapier.", details: errorBody },
        { status: zapierResponse.status } 
      );
    }
    
    // Log Zapier's success response if needed
    // const zapierResult = await zapierResponse.json(); 
    // console.log("Successfully forwarded to Zapier:", zapierResult);

    return NextResponse.json(
      { message: "Transcript successfully forwarded to Zapier." },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error processing save-transcript request:", error);
    let errorMessage = "An unexpected error occurred while processing the request.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to process the request.", details: errorMessage },
      { status: 500 }
    );
  }
}

