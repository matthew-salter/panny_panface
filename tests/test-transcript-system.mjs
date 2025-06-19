// tests/test-transcript-system.js
/**
 * Test script for the transcript logging system
 * 
 * This script tests all components of the transcript logging system:
 * - Database connectivity
 * - Saving transcripts
 * - Retrieving transcripts
 * - Updating transcript status
 * - Cleaning up old transcripts
 */

// Import required modules
import { v4 as uuidv4 } from 'uuid';
// We'll use dynamic import for fetch

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://panny-pan-face.replit.app/api';
const TEST_TRANSCRIPT = {
  fileName: `Test_Transcript_${new Date( ).toISOString().replace(/[:.]/g, '-')}.txt`,
  content: `User: Hello, this is a test transcript.
Assistant: Hi there! I'm responding to your test message.
User: Can you confirm this test is working?
Assistant: Yes, this test transcript is being properly formatted and saved.
User: Great, thank you!
Assistant: You're welcome! Let me know if you need anything else.`,
  conversationId: uuidv4()
};

// Test functions
async function testSaveTranscript() {
  console.log('\n🧪 Testing Save Transcript Endpoint');
  console.log(`📝 Using fileName: ${TEST_TRANSCRIPT.fileName}`);
  console.log(`🆔 Using conversationId: ${TEST_TRANSCRIPT.conversationId}`);

  try {
    // Dynamically import fetch
    const { default: fetch } = await import('node-fetch');

    const response = await fetch(`${API_BASE_URL}/save-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_TRANSCRIPT)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Transcript saved successfully');
      console.log('📊 Response:', result);
      return result.conversationId || TEST_TRANSCRIPT.conversationId;
    } else {
      console.error('❌ Failed to save transcript');
      console.error('📊 Response:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Error saving transcript:', error.message);
    return null;
  }
}

async function testGetTranscriptStatus(conversationId) {
  console.log('\n🧪 Testing Get Transcript Status Endpoint');

  try {
    // Dynamically import fetch
    const { default: fetch } = await import('node-fetch');

    // Test getting all transcripts first
    let response = await fetch(`${API_BASE_URL}/transcript-status`);
    let result = await response.json();

    console.log('📊 All Transcripts Status:');
    console.log(`📝 Total: ${result.total}`);
    console.log(`⏳ Pending: ${result.pending}`);
    console.log(`✅ Sent: ${result.sent}`);
    console.log(`❌ Failed: ${result.failed}`);

    // Now test getting specific transcript
    if (conversationId) {
      console.log(`\n🔍 Getting status for conversationId: ${conversationId}`);

      response = await fetch(`${API_BASE_URL}/transcript-status?conversationId=${conversationId}`);
      result = await response.json();

      if (response.ok) {
        console.log('✅ Transcript found');
        console.log('📊 Metadata:', result.metadata);
        console.log('📄 Content Preview:', result.content.text.substring(0, 50) + '...');
        return true;
      } else {
        console.error('❌ Failed to get transcript');
        console.error('📊 Response:', result);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error getting transcript status:', error.message);
    return false;
  }
}

async function testRetryTranscript(conversationId) {
  if (!conversationId) {
    console.log('\n⏭️ Skipping Retry Test (no conversationId)');
    return false;
  }

  console.log('\n🧪 Testing Retry Transcript Endpoint');
  console.log(`🔄 Retrying conversationId: ${conversationId}`);

  try {
    // Dynamically import fetch
    const { default: fetch } = await import('node-fetch');

    const response = await fetch(`${API_BASE_URL}/retry-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversationId })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Retry successful');
      console.log('📊 Response:', result);
      return true;
    } else {
      console.error('❌ Retry failed');
      console.error('📊 Response:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Error retrying transcript:', error.message);
    return false;
  }
}

async function testCleanupTranscripts() {
  console.log('\n🧪 Testing Cleanup Transcripts Endpoint');

  try {
    // Dynamically import fetch
    const { default: fetch } = await import('node-fetch');

    const response = await fetch(`${API_BASE_URL}/cleanup-transcripts`, {
      method: 'POST'
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Cleanup successful');
      console.log(`🧹 Cleaned up ${result.count} transcripts`);
      return true;
    } else {
      console.error('❌ Cleanup failed');
      console.error('📊 Response:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Error cleaning up transcripts:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Transcript System Tests');
  console.log('==================================');

  // Test save transcript
  const conversationId = await testSaveTranscript();

  // Test get transcript status
  await testGetTranscriptStatus(conversationId);

  // Test retry transcript (only if save failed)
  if (conversationId) {
    await testRetryTranscript(conversationId);
  }

  // Test cleanup transcripts
  await testCleanupTranscripts();

  console.log('\n==================================');
  console.log('🏁 All tests completed');
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Unhandled error in tests:', error);
});
