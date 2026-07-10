import api from './axios';

export const getMessages = (conversationId, page = 1, limit = 50) =>
  api.get(`/messages/${conversationId}?page=${page}&limit=${limit}`);

export const searchMessages = (conversationId, q) =>
  api.get(`/messages/${conversationId}/search?q=${encodeURIComponent(q)}`);

export const getMentions = () => api.get('/messages/user/mentions');

export const clearMention = (messageId) => api.delete(`/messages/${messageId}/mentions`);

export const editMessage = (id, content) =>
  api.put(`/messages/${id}`, { content });

export const deleteMessage = (id, soft = false) =>
  api.delete(`/messages/${id}?soft=${soft}`);

export const toggleReaction = (id, emoji) =>
  api.post(`/messages/${id}/react`, { emoji });

export const togglePin = (id) =>
  api.post(`/messages/${id}/pin`);

export const uploadAttachment = (file) => {
  const formData = new FormData();
  formData.append('attachment', file);
  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
