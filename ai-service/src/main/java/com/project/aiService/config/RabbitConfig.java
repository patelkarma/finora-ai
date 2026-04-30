package com.project.aiService.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Mirror of backend's RabbitConfig. Declares the same exchange + queues
 * so this service can boot independently of the backend (and Rabbit
 * idempotently handles re-declarations of identical resources).
 */
@Configuration
public class RabbitConfig {

    public static final String INSIGHT_EXCHANGE = "ai.insights.exchange";
    public static final String INSIGHT_REQUEST_QUEUE = "ai.insights.requests";
    public static final String INSIGHT_REPLY_QUEUE = "ai.insights.replies";
    public static final String INSIGHT_REQUEST_KEY = "insight.request";
    public static final String INSIGHT_REPLY_KEY = "insight.reply";

    @Bean
    public DirectExchange insightExchange() {
        return new DirectExchange(INSIGHT_EXCHANGE, true, false);
    }

    @Bean
    public Queue insightRequestQueue() {
        return new Queue(INSIGHT_REQUEST_QUEUE, true);
    }

    @Bean
    public Queue insightReplyQueue() {
        return new Queue(INSIGHT_REPLY_QUEUE, true);
    }

    @Bean
    public Binding insightRequestBinding(Queue insightRequestQueue, DirectExchange insightExchange) {
        return BindingBuilder.bind(insightRequestQueue)
                .to(insightExchange)
                .with(INSIGHT_REQUEST_KEY);
    }

    @Bean
    public Binding insightReplyBinding(Queue insightReplyQueue, DirectExchange insightExchange) {
        return BindingBuilder.bind(insightReplyQueue)
                .to(insightExchange)
                .with(INSIGHT_REPLY_KEY);
    }

    @Bean
    public MessageConverter rabbitMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        template.setExchange(INSIGHT_EXCHANGE);
        return template;
    }
}
