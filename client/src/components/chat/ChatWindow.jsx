import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Users, Search, Sparkles, ChevronLeft, UserPlus, Info, Bell, BellOff, ArrowDown } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useChat from '../../hooks/useChat';
import useSocket from '../../hooks/useSocket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import SearchMessages from './SearchMessages';
import SummaryPanel from '../summary/SummaryPanel';
import Avatar from '../common/Avatar';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import { addMember, removeMember, toggleMute } from '../../api/conversations';
import { getUsers } from '../../api/users';
import { formatDate } from '../../utils/formatDate';

const ChatWindow = () => {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    loadingMessages,
    addMessage,
    loadMoreMessages,
    pagination,
    updateMessageTranscription,
    fetchConversations,
    highlightMessageId,
    setHighlightMessageId,
    updateMessage,
    removeMessage,
  } = useChat();
  const { socket, joinRoom, leaveRoom, isOnline } = useSocket();
  const navigate = useNavigate();

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLength = useRef(0);

  // Join/leave room on conversation change
  useEffect(() => {
    if (!activeConversation) return;
    joinRoom(activeConversation._id);
    return () => leaveRoom(activeConversation._id);
  }, [activeConversation?._id, joinRoom, leaveRoom]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.conversation === activeConversation?._id) {
        addMessage(message);
      }
    };

    const handleMessageEdited = (message) => {
      if (message.conversation === activeConversation?._id) {
        updateMessage(message);
      }
    };

    const handleMessageDeleted = ({ messageId, conversationId }) => {
      if (conversationId === activeConversation?._id) {
        removeMessage(messageId);
      }
    };

    const handleTyping = ({ userId, username, conversationId }) => {
      if (conversationId !== activeConversation?._id) return;
      if (userId === user?._id) return;
      setTypingUsers((prev) => {
        if (prev.some((t) => t.userId === userId)) return prev;
        return [...prev, { userId, username }];
      });
    };

    const handleStopTyping = ({ userId }) => {
      setTypingUsers((prev) => prev.filter((t) => t.userId !== userId));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, activeConversation?._id, addMessage, updateMessage, removeMessage, user?._id]);

  // Clear typing indicators after timeout
  useEffect(() => {
    if (typingUsers.length === 0) return;
    const timer = setTimeout(() => setTypingUsers([]), 3000);
    return () => clearTimeout(timer);
  }, [typingUsers]);

  // Handle Highlight Message Auto-scroll
  useEffect(() => {
    if (highlightMessageId && messages.length > 0) {
      const el = document.getElementById(`msg-${highlightMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Clear the highlight after 3 seconds
        const timer = setTimeout(() => setHighlightMessageId(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightMessageId, messages, setHighlightMessageId]);

  // Auto-scroll to bottom on new messages (only if no highlight)
  useEffect(() => {
    if (highlightMessageId) return;

    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (messages.length > prevMessagesLength.current) {
      const newMsgsCount = messages.length - prevMessagesLength.current;
      const newMsg = messages[messages.length - 1];
      if (newMsg?.sender?._id === user?._id) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setIsAtBottom(true);
      } else {
        setUnreadCount((prev) => prev + newMsgsCount);
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, highlightMessageId, isAtBottom, user?._id]);

  // Scroll handler
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    
    if (scrollTop === 0 && pagination?.page < pagination?.pages) {
      loadMoreMessages();
    }

    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadCount(0);
    }
  };

  const handleSearchMembers = async (q) => {
    setMemberSearch(q);
    if (q.length < 2) {
      setMemberResults([]);
      return;
    }
    try {
      const { data } = await getUsers(q);
      // Filter out existing members
      const existingIds = activeConversation.participants.map((p) => p._id);
      setMemberResults(data.filter((u) => !existingIds.includes(u._id)));
    } catch {
      setMemberResults([]);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await addMember(activeConversation._id, userId);
      await fetchConversations();
      setShowAddMember(false);
      setMemberSearch('');
      setMemberResults([]);
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await removeMember(activeConversation._id, memberId);
      await fetchConversations();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleToggleMute = async () => {
    try {
      await toggleMute(activeConversation._id);
      await fetchConversations(); // Re-fetch to update activeConversation.mutedBy
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-950 text-dark-500">
        <div className="w-20 h-20 rounded-2xl bg-dark-800/60 flex items-center justify-center mb-4">
          <Hash size={36} className="text-primary-500/50" />
        </div>
        <h2 className="text-xl font-semibold text-dark-300 mb-2">Welcome to SyncTalk</h2>
        <p className="text-sm text-dark-500 max-w-sm text-center">
          Select a conversation or start a new chat to begin collaborating with your team.
        </p>
      </div>
    );
  }

  const isGroup = activeConversation.type === 'group';
  const otherUser = !isGroup
    ? activeConversation.participants?.find((p) => p._id !== user?._id)
    : null;
  const chatName = isGroup ? activeConversation.name : otherUser?.username || 'Unknown';

  return (
    <div className="flex-1 flex flex-col bg-dark-950 relative">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-3.5 glass border-b border-dark-700/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              selectConversation(null);
              navigate('/dashboard');
            }}
            className="md:hidden p-1.5 rounded-lg hover:bg-dark-700 text-dark-400"
          >
            <ChevronLeft size={20} />
          </button>

          {isGroup ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600
              flex items-center justify-center text-white font-semibold ring-2 ring-dark-700">
              <Hash size={18} />
            </div>
          ) : (
            <Avatar
              name={chatName}
              src={otherUser?.avatar}
              size="md"
              online={otherUser ? isOnline(otherUser._id) : false}
            />
          )}

          <div>
            <h2 className="font-semibold text-dark-100 text-sm">{chatName}</h2>
            <p className="text-xs text-dark-400">
              {isGroup
                ? `${activeConversation.participants?.length} members`
                : otherUser && isOnline(otherUser._id)
                ? 'Online'
                : otherUser?.lastSeen
                ? `Last seen: ${formatDate(otherUser.lastSeen)}`
                : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-primary-600/20 text-primary-400' : 'text-dark-400 hover:bg-dark-700/60 hover:text-dark-200'}`}
            title="Search messages"
          >
            <Search size={18} />
          </button>
          
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-lg transition-colors text-dark-400 hover:bg-dark-700/60 hover:text-dark-200"
            title={activeConversation.mutedBy?.includes(user?._id) ? "Unmute Notifications" : "Mute Notifications"}
          >
            {activeConversation.mutedBy?.includes(user?._id) ? <BellOff size={18} /> : <Bell size={18} />}
          </button>

          {isGroup && (
            <>
              <button
                onClick={() => setShowSummary(!showSummary)}
                className={`p-2 rounded-lg transition-colors ${showSummary ? 'bg-primary-600/20 text-primary-400' : 'text-dark-400 hover:bg-dark-700/60 hover:text-dark-200'}`}
                title="AI Summary"
              >
                <Sparkles size={18} />
              </button>
              <button
                onClick={() => setShowMembers(!showMembers)}
                className={`p-2 rounded-lg transition-colors ${showMembers ? 'bg-primary-600/20 text-primary-400' : 'text-dark-400 hover:bg-dark-700/60 hover:text-dark-200'}`}
                title="Members"
              >
                <Users size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 flex flex-col relative">
          {showSearch && (
            <SearchMessages
              conversationId={activeConversation._id}
              onClose={() => setShowSearch(false)}
            />
          )}

          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-1 scroll-smooth"
          >
            {loadingMessages ? (
              <Loader text="Loading messages..." />
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-dark-500">
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showAvatar =
                  !prevMsg ||
                  prevMsg.sender?._id !== msg.sender?._id ||
                  new Date(msg.createdAt) - new Date(prevMsg.createdAt) > 300000;

                return (
                  <MessageBubble
                    key={msg._id}
                    message={msg}
                    isOwn={msg.sender?._id === user?._id}
                    showAvatar={showAvatar}
                    onTranscriptionUpdate={updateMessageTranscription}
                    isHighlighted={msg._id === highlightMessageId}
                  />
                );
              })
            )}
            <TypingIndicator users={typingUsers} />
            <div ref={messagesEndRef} />
          </div>

          {!isAtBottom && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  setUnreadCount(0);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-primary-400 text-sm font-medium rounded-full shadow-lg border border-dark-700/50 hover:bg-dark-700 transition-colors"
              >
                <ArrowDown size={16} />
                {unreadCount > 0 ? `${unreadCount} New Message${unreadCount > 1 ? 's' : ''}` : 'Scroll to Bottom'}
              </button>
            </div>
          )}

          <MessageInput />
        </div>

        {/* Summary panel */}
        {showSummary && isGroup && (
          <SummaryPanel
            conversationId={activeConversation._id}
            onClose={() => setShowSummary(false)}
          />
        )}

        {/* Members panel */}
        {showMembers && isGroup && (
          <div className="w-72 border-l border-dark-700/50 glass overflow-y-auto">
            <div className="p-4 border-b border-dark-700/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-dark-200">
                Members ({activeConversation.participants?.length})
              </h3>
              <button
                onClick={() => setShowAddMember(true)}
                className="p-1.5 rounded-lg hover:bg-dark-700 text-primary-400"
                title="Add member"
              >
                <UserPlus size={16} />
              </button>
            </div>
            <div className="p-2">
              {activeConversation.participants?.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-dark-700/40"
                >
                  <Avatar
                    name={member.username}
                    src={member.avatar}
                    size="sm"
                    online={isOnline(member._id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-200 truncate">
                      {member.username}
                      {member._id === user?._id && (
                        <span className="text-dark-500 ml-1">(you)</span>
                      )}
                    </p>
                    <p className="text-[11px] text-dark-500 truncate">{member.status}</p>
                  </div>
                  {activeConversation.createdBy === user?._id &&
                    member._id !== user?._id && (
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        className="text-xs text-dark-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  {member._id === user?._id && (
                    <button
                      onClick={async () => {
                        await handleRemoveMember(user._id);
                        navigate('/dashboard');
                      }}
                      className="text-xs text-red-500/80 hover:text-red-400 font-medium transition-colors"
                    >
                      Leave
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add member modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Add Member"
      >
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search users..."
            value={memberSearch}
            onChange={(e) => handleSearchMembers(e.target.value)}
            className="input-field text-sm"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {memberResults.map((u) => (
              <button
                key={u._id}
                onClick={() => handleAddMember(u._id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-700/60 transition-colors"
              >
                <Avatar name={u.username} size="sm" />
                <p className="text-sm text-dark-200">{u.username}</p>
                <span className="ml-auto text-xs text-primary-400">+ Add</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChatWindow;
