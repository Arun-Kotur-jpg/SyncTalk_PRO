import api from './axios';

export const createConversation = (data) => api.post('/conversations', data);

export const getConversations = () => api.get('/conversations');

export const getConversation = (id) => api.get(`/conversations/${id}`);

export const updateConversation = (id, data) => api.put(`/conversations/${id}`, data);

export const addMember = (conversationId, userId) =>
  api.post(`/conversations/${conversationId}/members`, { userId });

export const removeMember = (conversationId, userId) =>
  api.delete(`/conversations/${conversationId}/members/${userId}`);

export const markConversationRead = (conversationId) =>
  api.post(`/conversations/${conversationId}/read`);

export const toggleMute = (conversationId) =>
  api.post(`/conversations/${conversationId}/mute`);
