import { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Send, Mic, Smile, X, Loader2 } from 'lucide-react';
import useChat from '../../hooks/useChat';
import useSocket from '../../hooks/useSocket';
import useAuth from '../../hooks/useAuth';
import VoiceRecorder from '../voice/VoiceRecorder';
import { uploadAttachment } from '../../api/messages';

// Grouped emoji set — common ones a college student would actually use
const EMOJI_DATA = {
  'Smileys': ['😀','😂','🥲','😊','😎','🤩','😍','🥳','😤','😭','🤣','😅','🤔','🫡','🤗','😴','🙄','😬','🤯','🥺','😈','💀','🤡','👻','😶‍🌫️'],
  'Hands': ['👍','👎','👋','🤝','🙌','👏','✌️','🤞','🫶','💪','🫰','🤙','👊','✋','🖐️'],
  'Hearts': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❤️‍🔥','💕','💖','💗'],
  'Objects': ['🔥','⭐','✨','🎉','🎊','💯','🏆','🎯','💡','📌','🚀','⚡','🛠️','📦','🧪'],
  'Reactions': ['✅','❌','⚠️','❓','💬','👀','🫣','🤫','🤐','😶','🙊','🙈','🙉'],
};

const EmojiPicker = ({ onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState('Smileys');
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 right-0 w-72 bg-dark-800 border border-dark-700/60 rounded-xl shadow-xl z-50 overflow-hidden"
    >
      {/* Category tabs */}
      <div className="flex gap-1 px-2 pt-2 pb-1 border-b border-dark-700/40 overflow-x-auto">
        {Object.keys(EMOJI_DATA).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors
              ${activeTab === cat
                ? 'bg-primary-500/20 text-primary-300 font-medium'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 h-44 overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI_DATA[activeTab].map((emoji, i) => (
            <button
              key={i}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg rounded-md
                hover:bg-dark-700/60 transition-colors cursor-pointer"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const MessageInput = () => {
  const { activeConversation } = useChat();
  const { sendMessage, emitTyping, emitStopTyping } = useSocket();
  const { user } = useAuth();

  const [text, setText] = useState('');
  const [showRecorder, setShowRecorder] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const typingTimeout = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Clear typing debounce on unmount to prevent stale stop_typing events
  useEffect(() => {
    return () => clearTimeout(typingTimeout.current);
  }, []);

  const handleEmojiSelect = useCallback((emoji) => {
    setText((prev) => prev + emoji);
    // Keep focus on textarea after picking
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    if (!text.trim() || !activeConversation) return;

    // Parse @mentions from text
    const mentionRegex = /@(\w+)/g;
    const mentionedUsernames = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentionedUsernames.push(match[1]);
    }

    // Find matching participant IDs
    const validMentionedUsernames = [];
    const mentions = activeConversation.participants
      ?.filter((p) => {
        if (mentionedUsernames.includes(p.username)) {
          validMentionedUsernames.push(p.username);
          return true;
        }
        return false;
      })
      .map((p) => p._id) || [];

    // Strip valid mentions from the text
    let finalContent = text.trim();
    validMentionedUsernames.forEach(username => {
      // Remove @username and optional trailing space
      const regex = new RegExp(`@${username}\\b\\s?`, 'gi');
      finalContent = finalContent.replace(regex, '');
    });
    finalContent = finalContent.trim();

    // If there's no text left (and it's a text message), we shouldn't send it unless it's just a poke/ping?
    // Actually, sending an empty message with mentions is fine for a "ping" but let's allow it if there are mentions.
    if (!finalContent && mentions.length === 0) return;

    sendMessage({
      conversationId: activeConversation._id,
      content: finalContent,
      type: 'text',
      mentions,
    });

    setText('');
    setShowEmojiPicker(false);
    emitStopTyping(activeConversation._id);
  }, [text, activeConversation, sendMessage, emitStopTyping]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    try {
      setIsUploading(true);
      const res = await uploadAttachment(file);
      const attachment = res.data;

      sendMessage({
        conversationId: activeConversation._id,
        content: '',
        type: 'text',
        attachments: [attachment]
      });
    } catch (error) {
      console.error('Failed to upload attachment:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredMentions = activeConversation?.participants
    ?.filter((p) => p._id !== user?._id && p.username.toLowerCase().includes((mentionQuery || '').toLowerCase())) || [];

  const insertMention = useCallback((username) => {
    const cursor = textareaRef.current.selectionStart;
    const textBefore = text.slice(0, cursor);
    const textAfter = text.slice(cursor);
    const newTextBefore = textBefore.replace(/(?:^|\s)@\w*$/, (m) => m.replace(/@\w*$/, `@${username} `));
    
    setText(newTextBefore + textAfter);
    setMentionQuery(null);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newTextBefore.length;
        textareaRef.current.selectionEnd = newTextBefore.length;
      }
    }, 0);
  }, [text]);

  const handleKeyDown = (e) => {
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:^|\s)@(\w*)$/);
    
    // Only show autocomplete for group chats
    if (match && activeConversation?.type === 'group') {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }

    if (!activeConversation) return;

    // Typing indicator logic
    emitTyping(activeConversation._id);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      emitStopTyping(activeConversation._id);
    }, 2000);
  };

  const handleVoiceSent = (voiceUrl) => {
    if (!activeConversation) return;
    sendMessage({
      conversationId: activeConversation._id,
      content: '',
      type: 'voice',
      voiceUrl,
    });
    setShowRecorder(false);
  };

  if (!activeConversation) return null;

  return (
    <div className="px-6 py-4 glass border-t border-dark-700/50">
      {showRecorder ? (
        <VoiceRecorder
          onSend={handleVoiceSent}
          onCancel={() => setShowRecorder(false)}
        />
      ) : (
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
              <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onClick={handleChange}
              onKeyUp={handleChange}
              placeholder="Type a message... (@ to mention)"
              rows={1}
              className="w-full bg-dark-800/80 border border-dark-700/50 text-dark-100
                px-4 py-3 rounded-xl resize-none
                placeholder:text-dark-500
                focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40
                transition-all duration-200 text-sm leading-relaxed
                max-h-32 overflow-y-auto"
              style={{ minHeight: '46px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
            {/* Mention Autocomplete */}
            {mentionQuery !== null && filteredMentions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-dark-800 border border-dark-700/60 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredMentions.map((user, idx) => (
                    <button
                      key={user._id}
                      onClick={() => insertMention(user.username)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm
                        ${idx === mentionIndex ? 'bg-primary-500/20 text-primary-300' : 'hover:bg-dark-700/60 text-dark-200'}`}
                    >
                      <span className="font-medium text-dark-100">{user.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachment button */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-dark-400
              hover:text-primary-400 hover:border-primary-500/30 transition-all duration-200 disabled:opacity-50"
            title="Attach file"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>

          {/* Emoji button */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`p-3 rounded-xl border transition-all duration-200
                ${showEmojiPicker
                  ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                  : 'bg-dark-800/80 border-dark-700/50 text-dark-400 hover:text-primary-400 hover:border-primary-500/30'
                }`}
              title="Emoji"
            >
              <Smile size={18} />
            </button>

            {showEmojiPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>

          {/* Voice button */}
          <button
            onClick={() => setShowRecorder(true)}
            className="p-3 rounded-xl bg-dark-800/80 border border-dark-700/50 text-dark-400
              hover:text-primary-400 hover:border-primary-500/30 transition-all duration-200"
            title="Record voice"
          >
            <Mic size={18} />
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="p-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white
              hover:from-primary-500 hover:to-primary-400 disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200 shadow-lg shadow-primary-600/20"
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
