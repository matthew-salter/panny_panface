"use client";

import React, { useState } from 'react';
import Link from 'next/link';

interface MicrophonePermissionPaneProps {
  onContinue: () => void;
}

const MicrophonePermissionPane: React.FC<MicrophonePermissionPaneProps> = ({ onContinue }) => {
  // Simplified handler - just dismiss the pane
  const handleAllowClick = () => {
    // Simply dismiss the pane without requesting microphone permission
    onContinue();
    
    // Log the action
    console.log('Permission pane dismissed by user');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-[15px] p-8 max-w-2xl mx-4 shadow-lg">
        <h2 className="text-black text-xl font-semibold mb-4">Microphone Access Required</h2>
        
        <p className="text-black mb-6">
          We need to access your microphone for this session so you can use our new voice assistant. 
          We collect your conversation with this assistant so we can produce your reports accurately. 
          If you would like to learn more, please visit our Policy Centre below, or alternatively 
          you can use our Typeform link if you do not wish to allow us to use your microphone.
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center">
          <a 
            href="https://panelitix.ai/policies" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-[15px] font-medium transition-all duration-200 flex items-center justify-center shadow-sm bg-blue-500 text-white hover:bg-blue-600"
          >
            Policy Centre
          </a>
          
          <a 
            href="https://51jyzk07rjo.typeform.com/to/aGEqo11n" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-[15px] font-medium transition-all duration-200 flex items-center justify-center shadow-sm bg-blue-500 text-white hover:bg-blue-600"
          >
            Typeform
          </a>
          
          <button
            onClick={handleAllowClick}
            className="px-6 py-3 rounded-[15px] font-medium transition-all duration-200 flex items-center justify-center shadow-sm bg-green-500 text-white hover:bg-green-600"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
};

export default MicrophonePermissionPane;
