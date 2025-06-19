// File: /home/ubuntu/project_files/LIVE-PANNY-PAN-FACE/src/app/lib/transcriptFormatter.ts

import { TranscriptItem } from "@/app/types"; // Assuming TranscriptItem type is defined in types.ts

/**
 * Formats an array of transcript items into a single plain text string.
 * Each message is on a new line, prefixed by the role (User or Assistant).
 * Breadcrumbs or other event types can be included or excluded based on requirements.
 *
 * @param items - Array of TranscriptItem objects.
 * @returns A string representing the formatted plain text transcript.
 */
export const formatTranscriptAsPlainText = (items: TranscriptItem[]): string => {
  if (!items || items.length === 0) {
    return "";
  }

  return items
    .map((item) => {
      let prefix = "";
      let text = item.text || ""; // Ensure text is not undefined

      switch (item.role) {
        case "user":
          prefix = "User:";
          break;
        case "assistant":
          prefix = "Assistant:";
          break;
        case "breadcrumb":
          // Option 1: Include breadcrumbs with a specific prefix
          // prefix = `[INFO: ${new Date(item.createdAtMs || Date.now()).toLocaleTimeString()}]:`;
          // Option 2: Exclude breadcrumbs from the main transcript text
          return null; // Returning null to filter it out later
        default:
          // Option 1: Include unknown roles with a generic prefix
          // prefix = `[${item.role || "Event"}]:`; 
          // Option 2: Exclude unknown roles
          return null; // Returning null to filter it out later
      }
      return `${prefix} ${text.trim()}`;
    })
    .filter(line => line !== null) // Remove items that were marked for exclusion
    .join("\n");
};

/**
 * Generates a dynamic filename for the transcript.
 * Example: transcript_2025-05-14T10-30-00Z_session123.txt
 *
 * @param sessionId - (Optional) A unique identifier for the session.
 * @returns A string representing the generated filename.
 */
export const generateTranscriptFilename = (sessionId?: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); // Sanitize timestamp
  if (sessionId) {
    return `transcript_${sessionId}_${timestamp}.txt`;
  }
  return `transcript_${timestamp}.txt`;
};

