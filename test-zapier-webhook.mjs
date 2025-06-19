// test-zapier-webhook.mjs
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Zapier webhook URL from environment variables
const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

if (!ZAPIER_WEBHOOK_URL) {
  console.error('Error: ZAPIER_WEBHOOK_URL environment variable is not set.');
  console.error('Please make sure it is properly configured in your Replit secrets.');
  process.exit(1);
}

// Test payload with both text and simulated audio reference
const testPayload = {
  fileName: `Test_File_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`,
  textContent: "This is a test transcript.\nLine 1: User message\nLine 2: Assistant response\nLine 3: Another user message",
  audioFileName: `Test_Audio_${new Date().toISOString().replace(/[:.]/g, '-')}.mp3`,
  audioReference: "This would be a URL or base64 data for audio in a real scenario",
  conversationId: `test-${Date.now()}`,
  eventTimestamp: new Date().toISOString(),
  isTest: true
};

async function testZapierWebhook() {
  console.log('Sending test payload to Zapier webhook...');
  console.log('Payload:', JSON.stringify(testPayload, null, 2));

  try {
    // Dynamically import fetch
    const { default: fetch } = await import('node-fetch');

    const response = await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();

    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${responseText}`);

    if (response.ok) {
      console.log('✅ Test successful! Zapier received the payload.');
    } else {
      console.log('❌ Test failed! Zapier returned an error.');
    }
  } catch (error) {
    console.error('❌ Error sending test to Zapier:', error.message);
  }
}

testZapierWebhook();
