import { useState } from 'react';
import Avatar from '../common/Avatar';
import VoicePlayer from '../voice/VoicePlayer';
import { formatTime } from '../../utils/formatDate';
import { transcribeVoice } from '../../api/voice';
import { editMessage, deleteMessage, toggleReaction, togglePin } from '../../api/messages';
import { FileText, Reply, Check, CheckCheck, MoreVertical, Edit2, Trash2, X, Check as CheckIcon, SmilePlus, Pin, Link, Download } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const MessageBubble = ({ message, isOwn, showAvatar, onTranscriptionUpdate, isHighlighted }) => {
  const { user } = useAuth();
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '👀'];

  const handleTranscribe = async () => {
    setTranscribing(true);
    setTranscribeError('');
    try {
      const { data } = await transcribeVoice(message._id);
      if (onTranscriptionUpdate) onTranscriptionUpdate(message._id, data.transcription);
    } catch (err) {
      setTranscribeError(err.response?.data?.message || 'Transcription failed');
    } finally {
      setTranscribing(false);
    }
  };

  const submitEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }
    try {
      await editMessage(message._id, editContent);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMessage(message._id, true);
      setShowMenu(false);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const startEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleReaction = async (emoji) => {
    try {
      await toggleReaction(message._id, emoji);
      setShowMenu(false);
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePin(message._id);
      setShowMenu(false);
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('conv', message.conversation);
      url.searchParams.set('msg', message._id);
      await navigator.clipboard.writeText(url.toString());
      setShowMenu(false);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const fifteenMins = 15 * 60 * 1000;
  const canModify = isOwn && (Date.now() - new Date(message.createdAt).getTime() < fifteenMins) && message.type === 'text';

  if (message?.type === 'system') {
    return (
      <div id={`msg-${message._id}`} className="flex justify-center py-2">
        <span className="text-xs text-dark-500 bg-dark-800/40 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  if (message?.type === 'summary') {
    return (
      <div id={`msg-${message._id}`} className={`flex justify-center py-3 ${isHighlighted ? 'ring-2 ring-primary-500 rounded-xl' : ''}`}>
        <div className="bg-primary-600/10 border border-primary-500/20 rounded-xl px-4 py-3 max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-primary-400" />
            <span className="text-xs font-medium text-primary-400">AI Summary</span>
          </div>
          <p className="text-sm text-dark-200 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`msg-${message._id}`}
      className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : 'mt-0.5'}
        animate-fade-in relative group ${isHighlighted ? 'bg-primary-500/10 rounded-xl p-2 -mx-2 ring-1 ring-primary-500/50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
    >
      {/* Avatar */}
      <div className="w-8 flex-shrink-0">
        {showAvatar && !isOwn && (
          <Avatar name={message.sender?.username} src={message.sender?.avatar} size="sm" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showAvatar && !isOwn && (
          <p className="text-xs font-medium text-primary-400 mb-1 ml-1">
            {message.sender?.username}
          </p>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div className={`flex items-center gap-1.5 mb-1 ${isOwn ? 'justify-end' : ''}`}>
            <Reply size={12} className="text-dark-500" />
            <span className="text-xs text-dark-500 truncate max-w-[200px]">
              {message.replyTo.content}
            </span>
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 relative ${
            isOwn
              ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-tr-md'
              : 'bg-dark-800/80 text-dark-100 rounded-tl-md border border-dark-700/40'
          }`}
        >
          {/* Options Menu */}
          {isHovered && !isEditing && (
            <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-10' : '-right-10'} z-10 flex flex-col items-center gap-1`}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-full bg-dark-800/80 text-dark-400 hover:text-dark-200 shadow-sm border border-dark-700/50"
              >
                <MoreVertical size={14} />
              </button>
              {showMenu && (
                <div className={`absolute top-full mt-1 ${isOwn ? 'right-0' : 'left-0'} w-max bg-dark-800 border border-dark-700/60 rounded-xl shadow-xl overflow-hidden py-1`}>
                  <div className="flex items-center gap-1 px-2 py-1.5 border-b border-dark-700/40">
                    {QUICK_REACTIONS.map((emoji) => (
                      <button key={emoji} onClick={() => handleReaction(emoji)} className="p-1 hover:bg-dark-700/60 rounded text-lg transition-transform hover:scale-110">
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleTogglePin} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-200 hover:bg-dark-700/60">
                    <Pin size={12} className={message.isPinned ? 'fill-current text-amber-500' : ''} /> {message.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button onClick={handleCopyLink} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-200 hover:bg-dark-700/60">
                    <Link size={12} /> Copy Link
                  </button>
                  {canModify && (
                    <>
                      <button onClick={startEdit} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-200 hover:bg-dark-700/60">
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-dark-700/60">
                        <Trash2 size={12} /> Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Pinned label */}
          {message.isPinned && (
            <div className={`flex items-center gap-1 text-[10px] text-amber-500/80 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <Pin size={10} className="fill-amber-500/20" /> Pinned
            </div>
          )}

          {/* Attachments */}
          {message.attachments?.length > 0 && (
            <div className="flex flex-col gap-2 mb-2">
              {message.attachments.map((attachment, idx) => (
                <div key={idx}>
                  {attachment.fileType === 'image' ? (
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={attachment.url} 
                        alt={attachment.name || 'Image attachment'} 
                        className="max-w-full rounded-lg border border-dark-700/50 max-h-64 object-cover" 
                      />
                    </a>
                  ) : (
                    <a 
                      href={attachment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isOwn 
                          ? 'bg-primary-700/50 border-primary-500/30 hover:bg-primary-600/50 text-white' 
                          : 'bg-dark-900/50 border-dark-700/50 hover:bg-dark-700/50 text-dark-200'
                      }`}
                    >
                      <div className={`p-2 rounded ${isOwn ? 'bg-primary-500' : 'bg-dark-800'}`}>
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                        <p className="text-xs opacity-70">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Download size={16} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text content */}
          {message.content && !isEditing && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {isEditing && (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-dark-900/50 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="p-1 rounded bg-dark-700/50 hover:bg-dark-600/50 text-dark-200">
                  <X size={12} />
                </button>
                <button onClick={submitEdit} className="p-1 rounded bg-primary-500 hover:bg-primary-400 text-white">
                  <CheckIcon size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Voice message */}
          {message.type === 'voice' && message.voiceUrl && (
            <div className="mt-1">
              <VoicePlayer src={message.voiceUrl} />

              {/* Transcription */}
              {message.transcription ? (
                <div className="mt-2 pt-2 border-t border-dark-600/30">
                  <p className="text-xs text-dark-400 mb-0.5">Transcription:</p>
                  <p className="text-sm text-dark-200">{message.transcription}</p>
                </div>
              ) : (
                <button
                  onClick={handleTranscribe}
                  disabled={transcribing}
                  className={`mt-2 text-xs font-medium flex items-center gap-1.5 transition-colors
                    ${isOwn ? 'text-primary-200 hover:text-white' : 'text-primary-400 hover:text-primary-300'}
                    disabled:opacity-50`}
                >
                  <FileText size={12} />
                  {transcribing ? 'Transcribing...' : 'Transcribe'}
                </button>
              )}

              {transcribeError && (
                <p className="text-xs text-red-400 mt-1">{transcribeError}</p>
              )}
            </div>
          )}

          {/* Mentions */}
          {message.mentions?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {message.mentions.map((m) => (
                <span
                  key={m._id || m}
                  className="text-xs bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded"
                >
                  @{m.username || m}
                </span>
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions?.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {message.reactions.map((r) => {
                const hasReacted = r.users.includes(user?._id);
                return (
                  <button
                    key={r.emoji}
                    onClick={() => handleReaction(r.emoji)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors
                      ${hasReacted 
                        ? 'bg-primary-500/20 border-primary-500/30 text-primary-300' 
                        : 'bg-dark-800/40 border-dark-700/50 text-dark-300 hover:bg-dark-700/60'}`}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-medium">{r.users.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Timestamp + read status */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            {message.edited && !isEditing && (
              <span className={`text-[10px] italic mr-1 ${isOwn ? 'text-primary-200/60' : 'text-dark-500'}`}>
                (edited)
              </span>
            )}
            <span className={`text-[10px] ${isOwn ? 'text-primary-200/60' : 'text-dark-500'}`}>
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <span className="text-primary-200/60">
                {message.readBy?.length > 1 ? <CheckCheck size={12} /> : <Check size={12} />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
