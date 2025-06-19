import React from 'react';

const ConversationActiveCircle: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
  );
};

export default ConversationActiveCircle;
