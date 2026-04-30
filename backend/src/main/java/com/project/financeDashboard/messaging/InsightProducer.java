package com.project.financeDashboard.messaging;

import com.project.financeDashboard.config.RabbitConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Async request / reply over RabbitMQ.
 *
 * <p>Why not {@link RabbitTemplate#convertSendAndReceive}? That uses
 * Direct Reply-To, a per-connection pseudo-queue that's invisible to
 * RabbitMQ's management UI. This explicit map-based pattern is more
 * code, but it:
 * <ul>
 *   <li>Surfaces both queues in {@code rabbitmq-management} so an
 *       operator can see the depth and dead letters of each side</li>
 *   <li>Lets backend restart without losing in-flight replies — the
 *       reply queue is durable, so any answer that arrives after a
 *       restart simply has no awaiting future and is discarded</li>
 *   <li>Mirrors how a real production async-RPC integration usually
 *       looks, which is the demonstrative point of this phase</li>
 * </ul>
 *
 * <p>Conditional on {@code messaging.enabled=true} — local dev without
 * RabbitMQ skips wiring this bean and the controller falls back to
 * the in-process path.
 */
@Component
@ConditionalOnProperty(name = "messaging.enabled", havingValue = "true")
public class InsightProducer {

    private static final Logger log = LoggerFactory.getLogger(InsightProducer.class);

    /** Per-correlationId waiter. The reply listener completes the future. */
    private final ConcurrentHashMap<String, CompletableFuture<InsightResponse>> waiters
            = new ConcurrentHashMap<>();

    private final RabbitTemplate rabbitTemplate;

    public InsightProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Publish an {@link InsightRequest}, block up to {@code timeoutSeconds}
     * waiting for the matching {@link InsightResponse}.
     *
     * @throws TimeoutException if no reply arrives within the timeout —
     *                          caller decides whether to surface a 504,
     *                          fall back to a stub message, or retry
     */
    public InsightResponse requestAndWait(long userId, String prompt, int timeoutSeconds)
            throws TimeoutException {
        String correlationId = UUID.randomUUID().toString();
        CompletableFuture<InsightResponse> future = new CompletableFuture<>();
        waiters.put(correlationId, future);

        try {
            InsightRequest req = new InsightRequest(correlationId, userId, prompt);
            rabbitTemplate.convertAndSend(
                    RabbitConfig.INSIGHT_EXCHANGE,
                    RabbitConfig.INSIGHT_REQUEST_KEY,
                    req);

            log.debug("Published InsightRequest correlationId={} userId={}", correlationId, userId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException te) {
            log.warn("Timed out waiting for InsightResponse correlationId={} after {}s",
                    correlationId, timeoutSeconds);
            throw te;
        } catch (Exception e) {
            throw new RuntimeException("Insight request failed: " + e.getMessage(), e);
        } finally {
            waiters.remove(correlationId);
        }
    }

    /**
     * Called by {@link InsightReplyListener} when a reply lands on the
     * queue. Looks up the awaiting future and completes it. If no waiter
     * exists (backend restarted between publish and reply), the message
     * is logged and dropped.
     */
    void completeReply(InsightResponse response) {
        if (response == null || response.correlationId() == null) {
            log.warn("Received malformed reply (null or missing correlationId)");
            return;
        }
        CompletableFuture<InsightResponse> future = waiters.remove(response.correlationId());
        if (future == null) {
            log.info("Received reply for unknown correlationId={} (waiter timed out or lost)",
                    response.correlationId());
            return;
        }
        future.complete(response);
    }
}
