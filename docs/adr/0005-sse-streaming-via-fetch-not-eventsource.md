# ADR 0005 — SSE streaming via `fetch + ReadableStream` (not `EventSource`)

**Status:** Accepted
**Date:** 2026-04 (Phase 3.1.5)

## Context

Phase 3.1.5 added Server-Sent Events to the chat: `/api/ai/chat/stream`
returns `text/event-stream`, the frontend renders tokens as they arrive
("ChatGPT-style typing effect").

The browser exposes two ways to consume SSE:

1. **`EventSource`** — built-in, auto-reconnect, cleanest semantics
2. **`fetch()` + `ReadableStream`** — manual SSE parsing, but full control

The decisive constraint: **`EventSource` cannot send custom headers.** Our API
requires `Authorization: Bearer <jwt>` on every protected request. There is
no browser API to add headers to an `EventSource` connection — the spec
deliberately doesn't allow it.

Workarounds for `EventSource`:
- Pass JWT in the URL query string → leaks into server logs and browser history
- Use cookie auth → would require migrating the entire auth surface from JWT to cookies
- Open the SSE without auth and gate by a separate session lookup → a whole new auth flavour just for one endpoint

None of those are worth the cost.

## Decision

Use `fetch()` for the request and consume the response body as a
`ReadableStream`:

```js
const res = await fetch(STREAM_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ message, history }),
  signal: controller.signal,
});

const reader = res.body.getReader();
const decoder = new TextDecoder('utf-8');
let buf = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  // parse SSE frames: "event: <name>\ndata: <payload>\n\n"
  ...
}
```

We hand-rolled a small SSE parser (`parseSseEvent`) — ~25 lines — that handles
multi-line `data:` fields per the spec.

`fetch()` also gives us `AbortController` for free, so navigating away from
the chat page mid-reply cancels the upstream Gemini stream cleanly instead
of leaking the connection.

## Consequences

**Good**
- JWT auth works without any server-side restructuring
- POST request body carries the full `{ message, history }` payload — no URL
  encoding contortions
- `AbortController` propagates cancellation all the way to Gemini, so a user
  who navigates away mid-reply doesn't waste quota
- The same path is used by `/chat/stream` and could be reused for any future
  streaming endpoint

**Less good**
- We re-implement what `EventSource` would give us for free: parsing,
  reconnect-on-error, last-event-id tracking. We didn't need reconnect or
  last-event-id for a chat reply (it's a one-shot stream), but they would
  need adding for, say, a long-lived notifications channel
- The parser has to handle TextDecoder streaming-mode boundary cases (a chunk
  may end mid-frame), which is the kind of subtle bug we'd rather not write
  ourselves long-term

If we ever add a notifications channel that benefits from `EventSource`'s
reconnect, we'll cookie-auth that one endpoint specifically and keep the
rest of the API on JWT.

## Related

- [`frontend/src/services/chatService.js`](../../frontend/src/services/chatService.js) — `sendStream` implementation
- [`backend/src/main/java/com/project/financeDashboard/controller/AIChatController.java`](../../backend/src/main/java/com/project/financeDashboard/controller/AIChatController.java) — `chatStream` SseEmitter producer
