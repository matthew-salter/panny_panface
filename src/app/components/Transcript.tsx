"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import Image from "next/image";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: (text: string) => void; // Updated to accept a string parameter
  canSend: boolean;
  isTranscriptMinimized: boolean;
  setIsTranscriptMinimized: (val: boolean) => void;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  isTranscriptMinimized,
  setIsTranscriptMinimized,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const toggleButtonText = isTranscriptMinimized ? "View Chat" : "Minimise Chat";

  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    if (!isTranscriptMinimized && transcriptRef.current) {
      const hasNewMessage = transcriptItems.length > prevLogs.length;
      const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
        const oldItem = prevLogs[index];
        return (
          oldItem &&
          (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
        );
      });

      if (hasNewMessage || hasUpdatedMessage) {
        scrollToBottom();
      }
    }
    setPrevLogs(transcriptItems);
  }, [transcriptItems, prevLogs, isTranscriptMinimized]);

  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  // Function to handle sending a message
  const handleSendClick = () => {
    if (canSend && userText && userText.trim()) {
      onSendMessage(userText);
    }
  };

  // Function to determine if a breadcrumb should be hidden
  const shouldHideBreadcrumb = (title: string) => {
    // Hide agent details and session information
    return (
      title.startsWith("Agent:") || 
      title.includes("session") || 
      title.includes("Session") ||
      title.includes("agent") ||
      title.includes("Agent")
    );
  };

  const commonInputBar = (
    <div
      className={`p-4 flex flex-col sm:flex-row items-center gap-x-3 gap-y-3 flex-shrink-0 ${
        isTranscriptMinimized
          ? "bg-white rounded-[15px] shadow-md border border-neutral-200"
          : "border-t border-neutral-200"
      }`}
    >
      <button
        onClick={() => setIsTranscriptMinimized(!isTranscriptMinimized)}
        className="btn px-6 py-3 font-medium transition-all duration-200 flex items-center justify-center shadow-sm bg-accent text-white hover:bg-opacity-90 focus:ring-2 focus:ring-accent focus:ring-opacity-50 w-full sm:w-auto whitespace-nowrap"
        style={{ height: "calc(3rem + 2px)", borderRadius: "15px" }}
      >
        {toggleButtonText}
      </button>
      <div className="flex w-full gap-x-3">
        <input
          ref={inputRef}
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend && userText && userText.trim()) {
              onSendMessage(userText); // Pass userText as argument
            }
          }}
          className="input flex-1 px-5 py-3 focus:outline-none"
          style={{ borderRadius: "15px" }}
          placeholder="Type a message..."
        />
        <button
          onClick={handleSendClick} // Use the new handler
          disabled={!canSend || !userText || !userText.trim()}
          className="bg-primary text-white p-3 disabled:opacity-50 transition-opacity duration-200 hover:bg-opacity-90"
          style={{ borderRadius: "15px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );

  if (!isTranscriptMinimized) {
    // MAXIMIZED STATE
    return (
      <div className="flex flex-col bg-white rounded-[15px] shadow-lg max-h-[50vh] w-full max-w-2xl overflow-hidden">
        <div className="relative flex-1 min-h-0 overflow-auto p-6 transcript-expanded">
          <button
            onClick={handleCopyTranscript}
            className="absolute top-3 right-3 z-10 text-sm px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 transition-colors duration-200 text-neutral-700 flex items-center"
            style={{ borderRadius: "15px" }}
          >
            {justCopied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-accent" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy
              </>
            )}
          </button>
          <div
            ref={transcriptRef}
            className="flex flex-col gap-y-4 h-full"
          >
            {transcriptItems.map((item) => {
              const { itemId, type, role, data, expanded, timestamp, title = "", isHidden } = item;
              
              // Skip hidden items
              if (isHidden) return null;
              
              // Handle message items
              if (type === "MESSAGE") {
                const isUser = role === "user";
                const containerClasses = `flex justify-end flex-col fade-in ${isUser ? "items-end" : "items-start"}`;
                const bubbleBase = `max-w-lg p-4 rounded-2xl shadow-sm ${isUser ? "bg-primary text-white" : "bg-neutral-100 text-neutral-900"}`;
                const isBracketedMessage = title.startsWith("[") && title.endsWith("]");
                const messageStyle = isBracketedMessage ? "italic text-neutral-400" : "";
                const displayTitle = isBracketedMessage ? title.slice(1, -1) : title;
                return (
                  <div key={itemId} className={containerClasses}>
                    <div className={bubbleBase}>
                      {isTranscriptMinimized && <div className={`text-xs ${isUser ? "text-neutral-200" : "text-neutral-500"} font-mono mb-1`}>{timestamp}</div>}
                      <div className={`whitespace-pre-wrap ${messageStyle}`}><ReactMarkdown>{displayTitle}</ReactMarkdown></div>
                    </div>
                  </div>
                );
              } 
              // Handle breadcrumb items - hide agent/session details
              else if (type === "BREADCRUMB") {
                // Skip breadcrumbs with agent or session information
                if (shouldHideBreadcrumb(title)) return null;
                
                return (
                  <div key={itemId} className="flex flex-col justify-start items-start text-neutral-500 text-sm fade-in">
                    {isTranscriptMinimized && <span className="text-xs font-mono">{timestamp}</span>}
                    <div className={`whitespace-pre-wrap flex items-center font-mono text-sm text-neutral-700 ${data ? "cursor-pointer" : ""}`} onClick={() => data && toggleTranscriptItemExpand(itemId)}>
                      {data && <span className={`text-neutral-400 mr-1 transform transition-transform duration-200 select-none font-mono ${expanded ? "rotate-90" : "rotate-0"}`}>▶</span>}
                      {title}
                    </div>
                    {expanded && data && <div className="text-neutral-700 text-left"><pre className="border-l-2 ml-1 border-neutral-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">{JSON.stringify(data, null, 2)}</pre></div>}
                  </div>
                );
              } else {
                return <div key={itemId} className="flex justify-center text-neutral-500 text-sm italic font-mono fade-in">Unknown item type: {type} {isTranscriptMinimized && <span className="ml-2 text-xs">{timestamp}</span>}</div>;
              }
            })}
          </div>
        </div>
        {commonInputBar}
      </div>
    );
  } else {
    // MINIMIZED STATE
    return commonInputBar;
  }
}

export default Transcript;
