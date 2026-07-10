import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useChat from '../hooks/useChat';
import ChatWindow from '../components/chat/ChatWindow';

const Dashboard = () => {
  const { fetchConversations, activeConversation, conversations, selectConversation, setHighlightMessageId } = useChat();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle deep link for conversation & message
  useEffect(() => {
    const convId = searchParams.get('conv');
    const msgId = searchParams.get('msg');
    
    if (convId && conversations.length > 0) {
      const conv = conversations.find(c => c._id === convId);
      if (conv && (!activeConversation || activeConversation._id !== convId)) {
        selectConversation(conv);
      }
      
      if (msgId) {
        setHighlightMessageId(msgId);
        // Clear params after handling
        searchParams.delete('conv');
        searchParams.delete('msg');
        setSearchParams(searchParams);
      }
    }
  }, [conversations, searchParams, activeConversation, selectConversation, setHighlightMessageId, setSearchParams]);

  return (
    <div className="flex h-full bg-dark-950">
      {/* On mobile, if a conversation is active, we might hide the sidebar using responsive classes in AppLayout, 
          but for simplicity Dashboard just renders the ChatWindow which takes full remaining space */}
      <ChatWindow />
    </div>
  );
};

export default Dashboard;
