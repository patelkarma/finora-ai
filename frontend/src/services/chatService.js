import api from './api';

const STREAM_URL = (() => {
  const base = process.env.REACT_APP_API_URL || 'https://finora-backend-rnd0.onrender.com/api';
  return `${base}/ai/chat/stream`;
})();

/**
 * Conversational chat. Sends the new message plus the running history
 * (capped at 20 turns server-side). Returns the assistant reply.
 */
const chatService = {
  send: async ({ message, history = [] }) => {
    const response = await api.post('/ai/chat', { message, history });
    return response.data; // { reply, provider }
  },

  /**
   * SSE streaming variant. Tokens arrive incrementally via `onToken`.
   * `onDone` fires after the server emits `event: done`. `onError` is
   * called for transport failures, server `event: error` frames, and
   * non-2xx HTTP responses.
   *
   * Implemented with fetch + ReadableStream because axios doesn't
   * surface the response body as a stream. EventSource was rejected
   * because it can't carry an Authorization header (browser API).
   *
   * Returns an AbortController so the caller can cancel mid-stream.
   */
  sendStream: ({ message, history = [], onToken, onDone, onError }) => {
    const controller = new AbortController();
    const token = localStorage.getItem('token');

    (async () => {
      let res;
      try {
        res = await fetch(STREAM_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message, history }),
          signal: controller.signal,
        });
      } catch (err) {
        if (err.name !== 'AbortError') onError?.(err);
        return;
      }

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.response = { status: res.status };
        onError?.(err);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buf = '';
      let finished = false;

      try {
        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // Each SSE event ends with a blank line (\n\n). Pull complete
          // events out of the buffer, leave any partial frame for the
          // next chunk.
          let sep;
          while ((sep = buf.indexOf('\n\n')) >= 0) {
            const raw = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            const evt = parseSseEvent(raw);
            if (!evt) continue;

            if (evt.event === 'done') {
              finished = true;
              onDone?.();
              break;
            } else if (evt.event === 'error') {
              const err = new Error(evt.data || 'stream error');
              err.streamed = true;
              onError?.(err);
              finished = true;
              break;
            } else if (evt.data) {
              onToken?.(evt.data);
            }
          }
        }
        if (!finished) onDone?.();
      } catch (err) {
        if (err.name !== 'AbortError') onError?.(err);
      }
    })();

    return controller;
  },
};

/**
 * Parse a single SSE event block. Returns { event, data } where event
 * defaults to 'message' if not specified. Multi-line `data:` fields are
 * joined with newlines per the SSE spec.
 */
function parseSseEvent(raw) {
  if (!raw) return null;
  const lines = raw.split('\n');
  let event = 'message';
  const dataLines = [];
  for (const line of lines) {
    if (line.startsWith(':')) continue; // comment
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

export default chatService;
