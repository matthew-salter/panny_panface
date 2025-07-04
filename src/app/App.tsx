"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import Image from "next/image";

// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import ConversationActiveCircle from "./components/ConversationActiveCircle";

// Types
import { AgentConfig, SessionStatus } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";

// Utilities
import { createRealtimeConnection } from "./lib/realtimeConnection";
import { formatTranscriptAsPlainText, generateTranscriptFilename } from "./lib/transcriptFormatter";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";

const CONVERSATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const TIMEOUT_WARNING_MS = 1 * 60 * 1000; // 1 minute before timeout
const REFRESH_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

function App() {
  const searchParams = useSearchParams();

  const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } =
    useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] =
    useState<AgentConfig[] | null>(null);

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(false); 
  const [userText, setUserText] = useState<string>("");
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] =
    useState<boolean>(true); 
  const [textPreview, setTextPreview] = useState<string>("");
  const [isTranscriptMinimized, setIsTranscriptMinimized] = useState<boolean>(true);

  const [conversationStartTime, setConversationStartTime] = useState<number | null>(null);
  const [isConversationTimedOut, setIsConversationTimedOut] = useState<boolean>(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState<boolean>(false);
  const conversationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isRefreshPeriodActive, setIsRefreshPeriodActive] = useState<boolean>(false);
  const [refreshEndTime, setRefreshEndTime] = useState<number | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [remainingRefreshTime, setRemainingRefreshTime] = useState<number>(0);

  const [isPaused, setIsPaused] = useState<boolean>(false); // State for pause
  const [bubbleActive, setBubbleActive] = useState<boolean>(false); // State for dynamic bubble
  const [isSendingTranscript, setIsSendingTranscript] = useState<boolean>(false); // State for transcript sending

  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  // Function to handle transcript sending on window close
  function setupWindowCloseHandler() {
    const handleBeforeUnload = (event) => {
      if (transcriptItems && transcriptItems.length > 0) {
        try {
          const formattedTranscript = formatTranscriptAsPlainText(transcriptItems);
          const fileName = generateTranscriptFilename(
            conversationStartTime ? `session-${conversationStartTime}` : undefined
          );

          const payload = {
            fileName,
            content: formattedTranscript,
            conversationId: conversationStartTime ? `session-${conversationStartTime}` : `session-${Date.now()}`,
            timestamp: new Date().toISOString()
          };

          // Use sendBeacon for more reliable delivery during page unload
          navigator.sendBeacon('/api/save-transcript', JSON.stringify(payload));
          console.log('Transcript beacon sent on window close');
        } catch (error) {
          console.error('Error sending transcript beacon:', error);
        }
      }
    };

    // Attach the event handler
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }

  // Function to handle ending conversation and saving transcript
  const handleEndConversation = async () => {
    if (!isConnected || isPaused || isSendingTranscript) return;
    
    setIsSendingTranscript(true);
    
    if (transcriptItems && transcriptItems.length > 0) {
      try {
        const formattedTranscript = formatTranscriptAsPlainText(transcriptItems);
        const fileName = generateTranscriptFilename(
          conversationStartTime ? `session-${conversationStartTime}` : undefined
        );

        const payload = {
          fileName,
          content: formattedTranscript,
          conversationId: conversationStartTime ? `session-${conversationStartTime}` : `session-${Date.now()}`,
          timestamp: new Date().toISOString(),
          saveType: 'explicit'
        };

        logClientEvent({ type: 'transcript.save.explicit' }, 'end_conversation_button');

        // Use fetch to send the transcript
        const response = await fetch('/api/save-transcript', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          console.log('Transcript sent successfully via End Conversation button');
          addTranscriptBreadcrumb("Conversation ended and transcript saved.");
          
          // Disconnect from realtime after saving
          disconnectFromRealtime();
        } else {
          console.error('Error sending transcript:', await response.text());
          addTranscriptBreadcrumb("Failed to save transcript. Please try again.");
        }
      } catch (error) {
        console.error('Error in handleEndConversation:', error);
        addTranscriptBreadcrumb("An error occurred while ending the conversation.");
      } finally {
        setIsSendingTranscript(false);
      }
    } else {
      // No transcript to save
      disconnectFromRealtime();
      setIsSendingTranscript(false);
    }
  };

  // Setup transcript sender on window close
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const cleanup = setupWindowCloseHandler();
      return cleanup;
    }
  }, [transcriptItems, conversationStartTime]);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      console.error(
        "Failed to send message - no data channel available",
        eventObj
      );
    }
  };

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
  });

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED" && !isRefreshPeriodActive && !isConversationTimedOut) {
      connectToRealtime();
    }
  }, [selectedAgentName, sessionStatus, isRefreshPeriodActive, isConversationTimedOut]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(
        `Agent: ${selectedAgentName}`,
        currentAgent
      );
      updateSession(true);
      setConversationStartTime(Date.now());
      setIsConversationTimedOut(false);
      setShowTimeoutWarning(false);
      setIsRefreshPeriodActive(false);
      setRefreshEndTime(null);
      if(refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      setIsPaused(false); // Reset pause state on new connection
      setBubbleActive(true); // Activate the dynamic bubble when conversation starts
    } else {
      setBubbleActive(false); // Deactivate the bubble when not connected
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (conversationTimerRef.current) {
      clearInterval(conversationTimerRef.current);
    }

    if (sessionStatus === "CONNECTED" && conversationStartTime && !isConversationTimedOut) {
      conversationTimerRef.current = setInterval(() => {
        const elapsedTime = Date.now() - conversationStartTime;
        if (elapsedTime >= CONVERSATION_TIMEOUT_MS) {
          addTranscriptBreadcrumb("Conversation timed out after 10 minutes. Please wait 2 minutes to refresh.");
          disconnectFromRealtime();
          setIsConversationTimedOut(true);
          setShowTimeoutWarning(false);
          setConversationStartTime(null);
          setIsRefreshPeriodActive(true);
          const rEndTime = Date.now() + REFRESH_TIMEOUT_MS;
          setRefreshEndTime(rEndTime);
          setRemainingRefreshTime(REFRESH_TIMEOUT_MS);
          if (conversationTimerRef.current) clearInterval(conversationTimerRef.current);
        } else if (elapsedTime >= CONVERSATION_TIMEOUT_MS - TIMEOUT_WARNING_MS && !showTimeoutWarning) {
          setShowTimeoutWarning(true);
          addTranscriptBreadcrumb("Conversation will time out in 1 minute.");
        }
      }, 1000);
    }

    return () => {
      if (conversationTimerRef.current) {
        clearInterval(conversationTimerRef.current);
      }
    };
  }, [sessionStatus, conversationStartTime, showTimeoutWarning, isConversationTimedOut]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    if (isRefreshPeriodActive && refreshEndTime) {
      refreshTimerRef.current = setInterval(() => {
        const timeNow = Date.now();
        const timeLeft = refreshEndTime - timeNow;
        setRemainingRefreshTime(timeLeft > 0 ? timeLeft : 0);

        if (timeLeft <= 0) {
          addTranscriptBreadcrumb("Refresh period ended. You can now start a new conversation.");
          setIsRefreshPeriodActive(false);
          setRefreshEndTime(null);
          setIsConversationTimedOut(false);
          setRemainingRefreshTime(0);
          if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
        }
      }, 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [isRefreshPeriodActive, refreshEndTime]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED" || (isConversationTimedOut && isRefreshPeriodActive)) return;
    if (isConversationTimedOut && !isRefreshPeriodActive) {
        setIsConversationTimedOut(false);
    }
    setSessionStatus("CONNECTING");
    setIsPaused(false); // Ensure not paused when trying to connect

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        setSessionStatus("DISCONNECTED");
        return;
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;

      const { pc, dc } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef
      );
      pcRef.current = pc;
      dcRef.current = dc;

      // Enable microphone track by default when connection is established
      const senders = pcRef.current.getSenders();
      senders.forEach((sender) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = true;
        }
      });

      dc.addEventListener("open", () => {
        logClientEvent({}, "data_channel.open");
      });
      dc.addEventListener("close", () => {
        logClientEvent({}, "data_channel.close");
        if (!isConversationTimedOut && sessionStatus !== "DISCONNECTED") {
            setSessionStatus("DISCONNECTED");
            setIsPaused(false); // Reset pause on disconnect
        }
      });
      dc.addEventListener("error", (err: any) => {
        logClientEvent({ error: err }, "data_channel.error");
        setSessionStatus("DISCONNECTED");
        setIsPaused(false); // Reset pause on error
      });
      dc.addEventListener("message", (e: MessageEvent) => {
        handleServerEventRef.current(JSON.parse(e.data));

        const data = JSON.parse(e.data);
        if (data.type === "conversation.item.update" && data.item.role === "assistant") {
          if (data.item.content && data.item.content[0] && data.item.content[0].text) {
            setTextPreview(data.item.content[0].text);
          }
        }
      });

      setDataChannel(dc);
    } catch (err) {
      console.error("Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
      setIsPaused(false); // Reset pause on error
    }
  };

  const disconnectFromRealtime = () => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");
    setTextPreview("");
    setIsPaused(false); // Reset pause state on disconnect
    setBubbleActive(false); // Deactivate the bubble when disconnected

    if (conversationTimerRef.current) {
      clearInterval(conversationTimerRef.current);
    }
    logClientEvent({}, "disconnected");
  };

  // Toggle connection handler - Added to fix ReferenceError
  const onToggleConnection = () => {
    if (isConnecting || isRefreshPeriodActive) return; // Don't do anything if connecting or in refresh period
    
    if (isConnected) {
      disconnectFromRealtime();
    } else {
      connectToRealtime();
    }
  };

  // Toggle pause handler
  const onTogglePause = () => {
    if (!isConnected) return; // Only toggle pause if connected
    
    setIsPaused(!isPaused);
    
    // Toggle microphone track
    if (pcRef.current) {
      const senders = pcRef.current.getSenders();
      senders.forEach((sender) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = isPaused; // If currently paused, enable it (unpause)
        }
      });
    }
    
    // Log the event
    logClientEvent({ isPaused: !isPaused }, isPaused ? "microphone.resume" : "microphone.pause");
  };

  const sendSimulatedUserMessage = (text: string) => {
    if (isConversationTimedOut || isRefreshPeriodActive || isPaused) return; // Don't send if paused
    const id = uuidv4().slice(0, 32);
    
    // Add a local message directly to the transcript for immediate display
    addTranscriptMessage(id, "user", text, false);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    if (isConversationTimedOut || isRefreshPeriodActive || isPaused) return; // Don't update if paused
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    const turnDetection = {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 200,
      create_response: true,
    };

    const instructions = currentAgent?.instructions || "";
    const tools = currentAgent?.tools || [];

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "coral",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
      },
    };

    sendClientEvent(sessionUpdateEvent);

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage("hi");
    }
  };

  const cancelAssistantSpeech = async () => {
    if (isConversationTimedOut || isRefreshPeriodActive || isPaused) return; // Don't cancel if paused
    const mostRecentAssistantMessage = [...transcriptItems]
      .reverse()
      .find((item) => item.role === "assistant");

    if (!mostRecentAssistantMessage) {
      console.warn("can\\'t cancel, no recent assistant message found");
      return;
    }
    if (mostRecentAssistantMessage.status === "DONE") {
      console.log("No truncation needed, message is DONE");
      return;
    }

    sendClientEvent({
      type: "conversation.item.truncate",
      item_id: mostRecentAssistantMessage?.itemId,
      content_index: 0,
      audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
    });
    
    sendClientEvent({
      type: "response.create",
    });
  };

  // Updated to accept a string parameter and include robust validation
  const handleSendTextMessage = (text: string) => {
    // Basic validation checks
    if (!isConnected || isConversationTimedOut || isRefreshPeriodActive || isPaused) return;
    
    // Robust type checking and validation
    if (typeof text !== 'string') {
      console.error('handleSendTextMessage: text is not a string', typeof text, text);
      return;
    }
    
    // Ensure text is not empty after trimming
    const trimmedText = text.trim();
    if (!trimmedText) {
      console.log('handleSendTextMessage: text is empty after trimming');
      return;
    }

    const id = uuidv4().slice(0, 32);
    
    // Add a local message directly to the transcript for immediate display
    // This ensures the message appears in the UI right away
    addTranscriptMessage(id, "user", trimmedText, false);
    
    // Debug output to verify message was added
    console.log('Added user message to transcript:', id, trimmedText);
    console.log('Current transcript items:', transcriptItems);

    // Then send the message to the server
    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: trimmedText }],
        },
      },
      "user text message"
    );

    sendClientEvent(
      { type: "response.create" },
      "trigger response after user text message"
    );

    setUserText("");
  };

  const handleAgentChange = (newAgentConfig: string) => {
    if (isConnected) {
      disconnectFromRealtime();
    }
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", newAgentConfig);
    window.location.replace(url.toString());
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Gradient background */}
      <div className="gradient-background"></div>
      
      <header className="header-container py-4 px-6 flex flex-col items-center justify-center">
        {/* Logo at top center */}
        <div className="mb-2">
          <Image
            src="/assets/images/panelitix-logo.png"
            alt="Panelitix Logo"
            width={200}
            height={50}
            className="h-auto"
          />
        </div>
        
        {/* Centered title and subtitle */}
        <div className="text-center">
          <h1 className="text-xl font-semibold text-black">
            Food Commodity Reporter
          </h1>
          <div className="text-black mt-1">
            Navigate commodity markets with personalised insight.
          </div>
        </div>
      </header>

      <main className="flex-1 flex">
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isEventsPaneExpanded ? "w-1/2 border-r border-neutral-200" : "w-0"
          }`}
        >
          {isEventsPaneExpanded && <Events />}
        </div>

        <div
          className={`transition-all duration-300 ease-in-out ${
            isEventsPaneExpanded ? "w-1/2" : "w-full"
          } flex flex-col items-center justify-between p-6 relative`}
        >
          {/* Timeout Warning */}
          {showTimeoutWarning && (
            <div className="absolute top-4 left-4 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-md text-sm">
              ⚠️ Conversation will time out in 1 minute
            </div>
          )}

          {/* Refresh Period Countdown */}
          {isRefreshPeriodActive && (
            <div className="absolute top-4 left-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md text-sm">
              ⏱️ Refresh available in {Math.ceil(remainingRefreshTime / 1000)}s
            </div>
          )}

          {/* Pause Indicator */}
          {isPaused && (
            <div className="absolute top-16 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
              🔇 Microphone Paused
            </div>
          )}

          {/* Top Section with Profile Image */}
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center mb-auto mt-12"> {/* Adjusted for even spacing */}
            {/* Profile Image with Dynamic Bubble - INCREASED SIZE */}
            <div className="mb-8 profile-image-container">
              {/* Dynamic morphing bubble - only visible when conversation is active - INCREASED SIZE */}
              <div 
                className={`dynamic-bubble ${bubbleActive ? 'active' : ''}`} 
                style={{
                  width: '240px',  /* Increased from 180px */
                  height: '240px', /* Increased from 180px */
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              ></div>
              
              {/* Larger profile image - UPDATED IMAGE */}
              <Image
                src="/assets/Panelitix_Voice_Assistant_profile_picture.png"
                alt="Panelitix Voice Assistant profile picture"
                width={160}
                height={160}
                className="rounded-full relative z-10"
                style={{
                  animation: "morphProfilePicture 8s infinite ease-in-out",
                  borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%"
                }}
              />
            </div>
          </div>
          
          {/* Bottom Section with Chat Interface */}
          <div className="w-full max-w-2xl mx-auto mt-auto">
            {/* Reconnect, Pause, and End Conversation Buttons - UPDATED WITH END CONVERSATION BUTTON */}
            <div className="flex gap-4 justify-center mb-4">
              <button
                onClick={onToggleConnection}
                disabled={isPaused}
                className={`px-6 py-3 rounded-[15px] font-medium transition-all duration-200 flex items-center justify-center shadow-sm ${
                  isPaused ? "opacity-50 cursor-not-allowed" :
                  isConnected || isConnecting
                    ? "restart-button bg-red-500 text-white hover:bg-red-600"
                    : "primary-button bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {isConnected || isConnecting ? "Restart" : "Start"}
              </button>

              {/* Pause button */}
              <button
                onClick={onTogglePause}
                disabled={!isConnected}
                className={`px-6 py-3 rounded-[15px] font-medium transition-all duration-200 flex items-center justify-center shadow-sm ${
                  !isConnected ? "opacity-50 cursor-not-allowed bg-neutral-300" :
                  isPaused
                    ? "primary-button bg-green-500 text-white hover:bg-green-600"
                    : "pause-button bg-yellow-500 text-white hover:bg-yellow-600"
                }`}
              >
                {isPaused ? "Resume" : "Pause"}
              </button>
              
              {/* End Conversation button */}
              <button
                onClick={handleEndConversation}
                disabled={!isConnected || isPaused || isSendingTranscript}
                className={`px-6 py-3 rounded-[15px] font-medium transition-all duration-200 flex items-center justify-center shadow-sm ${
                  !isConnected || isPaused || isSendingTranscript ? "opacity-50 cursor-not-allowed bg-neutral-300" :
                  "end-conversation-button bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {isSendingTranscript ? "Saving..." : "End Conversation"}
              </button>
            </div>
            
            <div className="chat-interface-container">
              <Transcript
                userText={userText}
                setUserText={setUserText}
                onSendMessage={handleSendTextMessage}
                canSend={isConnected && !isConversationTimedOut && !isRefreshPeriodActive}
                isTranscriptMinimized={isTranscriptMinimized}
                setIsTranscriptMinimized={setIsTranscriptMinimized}
              />
              
              {/* Connection Status Indicator - MOVED BELOW CHAT BAR WITH WHITE TEXT */}
              <div className="flex items-center justify-center space-x-2 mt-4 max-w-md mx-auto text-center">
                <ConversationActiveCircle isActive={isConnected} />
                <span className="text-sm font-medium text-white">
                  {isConnected
                    ? "Connected - Please check the conversation to make sure details are correct as this is a prototype."
                    : isConnecting
                    ? "Connecting..."
                    : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer-container py-3 px-6 text-center text-white text-sm">
        <p>Copyright Panelitix LTD <span style={{color: 'white'}}>©</span> 2025, All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default App;
