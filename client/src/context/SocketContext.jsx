import { createContext, useEffect, useState, useContext, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { AuthContext, getAccessToken, setAccessToken } from './AuthContext';
import { fetchCsrfToken } from '../api/csrf';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  // Ref for fetchConversations callback — set by ChatContext via refreshConversationsRef
  const onReconnectRef = useRef(null);

  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    let hasAttemptedRefresh = false;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    // Re-sync conversations after a reconnect
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      if (onReconnectRef.current) {
        onReconnectRef.current();
      }
    });

    newSocket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    newSocket.on('mention_notification', (data) => {
      setNotifications((prev) => [data, ...prev].slice(0, 50));
    });

    // Attempt one silent token refresh on connect_error before giving up
    newSocket.on('connect_error', async (err) => {
      console.error('Socket connection error:', err.message);

      if (!hasAttemptedRefresh) {
        hasAttemptedRefresh = true;
        try {
          const { default: api } = await import('../api/axios');
          await fetchCsrfToken();
          const { data } = await api.post('/auth/refresh');
          setAccessToken(data.accessToken);
          // Update socket auth and retry
          newSocket.auth = { token: data.accessToken };
          newSocket.connect();
        } catch {
          // Refresh failed — log the user out
          logout();
        }
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, logout]);

  const joinRoom = useCallback(
    (conversationId) => {
      if (socketRef.current) {
        socketRef.current.emit('join_room', { conversationId });
      }
    },
    []
  );

  const leaveRoom = useCallback(
    (conversationId) => {
      if (socketRef.current) {
        socketRef.current.emit('leave_room', { conversationId });
      }
    },
    []
  );

  const sendMessage = useCallback(
    (data) => {
      if (socketRef.current) {
        socketRef.current.emit('send_message', data);
      }
    },
    []
  );

  const emitTyping = useCallback(
    (conversationId) => {
      if (socketRef.current) {
        socketRef.current.emit('typing', { conversationId });
      }
    },
    []
  );

  const emitStopTyping = useCallback(
    (conversationId) => {
      if (socketRef.current) {
        socketRef.current.emit('stop_typing', { conversationId });
      }
    },
    []
  );

  const markRead = useCallback(
    (conversationId, messageId) => {
      if (socketRef.current) {
        socketRef.current.emit('mark_read', { conversationId, messageId });
      }
    },
    []
  );

  const markConversationRead = useCallback(
    (conversationId) => {
      if (socketRef.current) {
        socketRef.current.emit('mark_conversation_read', { conversationId });
      }
    },
    []
  );

  const clearNotification = useCallback((index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearNotificationByMessageId = useCallback((messageId) => {
    setNotifications((prev) => prev.filter((n) => n.messageId !== messageId));
  }, []);

  const isOnline = useCallback(
    (userId) => onlineUsers.includes(userId),
    [onlineUsers]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        notifications,
        joinRoom,
        leaveRoom,
        sendMessage,
        emitTyping,
        emitStopTyping,
        markRead,
        markConversationRead,
        clearNotification,
        clearNotificationByMessageId,
        isOnline,
        onReconnectRef,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
