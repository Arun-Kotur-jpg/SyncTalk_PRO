import { createContext, useState, useCallback, useEffect, useContext } from 'react';
import * as conversationsApi from '../api/conversations';
import * as messagesApi from '../api/messages';
import { SocketContext } from './SocketContext';

export const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [lastError, setLastError] = useState(null);

  const clearError = useCallback(() => setLastError(null), []);

  // Wire up reconnect refresh via SocketContext's onReconnectRef
  const socketCtx = useContext(SocketContext);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const { data } = await conversationsApi.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setLastError('Failed to fetch conversations. Please try again.');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Set reconnect callback so SocketContext can trigger conversation refresh
  useEffect(() => {
    if (socketCtx?.onReconnectRef) {
      socketCtx.onReconnectRef.current = fetchConversations;
    }
  }, [socketCtx, fetchConversations]);

  const selectConversation = useCallback(async (conversation) => {
    setActiveConversation(conversation);
    setMessages([]);
    setLoadingMessages(true);

    // Optimistically clear unread count locally
    setConversations((prev) => 
      prev.map(c => c._id === conversation._id ? { ...c, unreadCount: 0 } : c)
    );
    // Tell server via socket (or could use API)
    if (socketCtx?.markConversationRead) {
      socketCtx.markConversationRead(conversation._id);
    }
    try {
      const { data } = await messagesApi.getMessages(conversation._id);
      setMessages(data.messages);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setLastError('Failed to load messages. Please try again.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      // Prevent duplicates
      if (prev.some((m) => m._id === message._id)) return prev;
      return [...prev, message];
    });
  }, []);

  const updateMessage = useCallback((updatedMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === updatedMessage._id ? { ...m, ...updatedMessage } : m))
    );
  }, []);

  const removeMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!activeConversation || !pagination || pagination.page >= pagination.pages) return;

    try {
      const { data } = await messagesApi.getMessages(
        activeConversation._id,
        pagination.page + 1
      );
      setMessages((prev) => [...data.messages, ...prev]);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load more messages:', error);
      setLastError('Failed to load older messages.');
    }
  }, [activeConversation, pagination]);

  const createConversation = useCallback(async (conversationData) => {
    const { data } = await conversationsApi.createConversation(conversationData);
    setConversations((prev) => {
      if (prev.some((c) => c._id === data._id)) return prev;
      return [data, ...prev];
    });
    return data;
  }, []);

  const updateMessageTranscription = useCallback((messageId, transcription) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === messageId ? { ...m, transcription } : m))
    );
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loadingConversations,
        loadingMessages,
        pagination,
        fetchConversations,
        selectConversation,
        setActiveConversation,
        addMessage,
        updateMessage,
        removeMessage,
        loadMoreMessages,
        createConversation,
        setConversations,
        updateMessageTranscription,
        highlightMessageId,
        setHighlightMessageId,
        lastError,
        clearError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
