import React from "react";
import { SessionStatus } from "@/app/types";

interface BottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (val: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
  isConversationTimedOut?: boolean; // Optional for now, make required if always passed
  isRefreshPeriodActive?: boolean; // Optional for now, make required if always passed
  remainingRefreshTime?: number;
}

function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  isConversationTimedOut = false,
  isRefreshPeriodActive = false,
  remainingRefreshTime = 0,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  function getConnectionButtonLabel() {
    if (isRefreshPeriodActive) return `Refreshing (${Math.ceil(remainingRefreshTime / 1000)}s)`;
    if (isConversationTimedOut && !isRefreshPeriodActive) return "Start New Conversation";
    if (isConnected) return "Stop";
    if (isConnecting) return "Connecting...";
    return "Start";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "btn rounded-full px-8 py-3 font-medium transition-all duration-200 flex items-center justify-center shadow-sm";

    if (isConnecting || isRefreshPeriodActive) {
      return `${baseClasses} bg-neutral-300 text-neutral-500 cursor-not-allowed`;
    }

    if (isConnected) {
      return `${baseClasses} bg-danger text-white hover:bg-opacity-90 focus:ring-2 focus:ring-danger focus:ring-opacity-50`;
    }
    // Disconnected (including after timeout and refresh period ended) -> label "Start" or "Start New Conversation" -> green
    return `${baseClasses} bg-accent text-white hover:bg-opacity-90 focus:ring-2 focus:ring-accent focus:ring-opacity-50`;
  }

  function getConnectionButtonIcon() {
    if (isRefreshPeriodActive) {
        return (
            <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        );
    }
    if (isConnected) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
        </svg>
      );
    }
    if (isConnecting) {
      return (
        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    // Start or Start New Conversation
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
      </svg>
    );
  }

  const controlsDisabled = isConnecting || isRefreshPeriodActive || (isConversationTimedOut && !isRefreshPeriodActive && sessionStatus !== "CONNECTED");

  return (
    <div className="p-6 flex flex-row items-center justify-between bg-white shadow-sm border-t border-neutral-200">
      <div className="flex items-center">
        <button
          onClick={onToggleConnection}
          className={getConnectionButtonClasses()}
          disabled={isConnecting || isRefreshPeriodActive}
        >
          {getConnectionButtonIcon()}
          {getConnectionButtonLabel()}
        </button>
      </div>

      <div className="flex flex-row items-center gap-6">
        <div className="flex items-center gap-2">
          <input
            id="audio-playback"
            type="checkbox"
            checked={isAudioPlaybackEnabled}
            onChange={e => setIsAudioPlaybackEnabled(e.target.checked)}
            disabled={!isConnected || controlsDisabled}
            className="w-4 h-4 accent-primary disabled:opacity-50"
          />
          <label htmlFor="audio-playback" className={`flex items-center text-neutral-700 ${(!isConnected || controlsDisabled) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
            Audio
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="logs"
            type="checkbox"
            checked={isEventsPaneExpanded}
            onChange={e => setIsEventsPaneExpanded(e.target.checked)}
            disabled={controlsDisabled && sessionStatus !== "CONNECTED"} // Logs can be viewed even if timed out but not during refresh or initial connection phase
            className="w-4 h-4 accent-primary disabled:opacity-50"
          />
          <label htmlFor="logs" className={`flex items-center text-neutral-700 ${(controlsDisabled && sessionStatus !== "CONNECTED") ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
            Logs
          </label>
        </div>
      </div>
    </div>
  );
}

export default BottomToolbar;

