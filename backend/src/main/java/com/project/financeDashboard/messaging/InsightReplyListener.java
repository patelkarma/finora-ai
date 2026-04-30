package com.project.financeDashboard.messaging;

import com.project.financeDashboard.config.RabbitConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Listens on the reply queue and dispatches each {@link InsightResponse}
 * to the awaiting {@link InsightProducer} future. The listener is the
 * only place that resolves a waiter — the producer never blocks-and-polls.
 */
@Component
@ConditionalOnProperty(name = "messaging.enabled", havingValue = "true")
public class InsightReplyListener {

    private final InsightProducer producer;

    public InsightReplyListener(InsightProducer producer) {
        this.producer = producer;
    }

    @RabbitListener(queues = RabbitConfig.INSIGHT_REPLY_QUEUE)
    public void onReply(InsightResponse response) {
        producer.completeReply(response);
    }
}
