package com.project.aiService.messaging;

import com.project.aiService.config.RabbitConfig;
import com.project.aiService.llm.GeminiClient;
import com.project.aiService.llm.LlmUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * The actual work the ai-service does: pull a request off the
 * insight-request queue, call Gemini, push the response onto the
 * reply queue. RabbitListener acks on successful return; an unhandled
 * exception requeues by default. We swallow {@link LlmUnavailableException}
 * inside this method and translate to an InsightResponse with {@code error}
 * set — the upstream LLM being sick is not a "retry forever" condition.
 */
@Component
public class InsightRequestListener {

    private static final Logger log = LoggerFactory.getLogger(InsightRequestListener.class);

    private final GeminiClient geminiClient;
    private final RabbitTemplate rabbitTemplate;

    public InsightRequestListener(GeminiClient geminiClient, RabbitTemplate rabbitTemplate) {
        this.geminiClient = geminiClient;
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = RabbitConfig.INSIGHT_REQUEST_QUEUE)
    public void onInsightRequest(InsightRequest req) {
        log.info("ai-service received InsightRequest correlationId={} userId={} promptLen={}",
                req.correlationId(), req.userId(),
                req.prompt() == null ? 0 : req.prompt().length());

        InsightResponse reply;
        try {
            String text = geminiClient.generate(req.prompt());
            reply = new InsightResponse(
                    req.correlationId(), req.userId(), text, geminiClient.name(), null);
        } catch (LlmUnavailableException e) {
            log.warn("Gemini failed for correlationId={}: {}", req.correlationId(), e.getMessage());
            reply = new InsightResponse(
                    req.correlationId(), req.userId(), null, geminiClient.name(),
                    e.getMessage() == null ? "llm unavailable" : e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected failure for correlationId={}", req.correlationId(), e);
            reply = new InsightResponse(
                    req.correlationId(), req.userId(), null, geminiClient.name(),
                    "internal error");
        }

        rabbitTemplate.convertAndSend(
                RabbitConfig.INSIGHT_EXCHANGE,
                RabbitConfig.INSIGHT_REPLY_KEY,
                reply);
    }
}
