import api from './api';

/**
 * Conversational chat. Sends the new message plus the running history
 * (capped at 20 turns server-side). Returns the assistant reply.
 */
const chatService = {
  send: async ({ message, history = [] }) => {
    const response = await api.post('/ai/chat', { message, history });
    return response.data; // { reply, provider }
  },
};

export default chatService;
