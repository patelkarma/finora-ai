package com.project.financeDashboard.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Async work executor. Currently used by the RAG indexer to embed
 * newly-saved transactions in the background — the user's HTTP save
 * returns instantly while Gemini does its 200-500ms embed and we
 * write the vector to pgvector.
 *
 * <p>Sized for Render's free-tier 0.5 CPU / 512MB box: small core,
 * bounded queue, caller-runs rejection so a flood eventually applies
 * back-pressure to the request thread instead of OOMing.
 *
 * <p>Conditional on {@code rag.enabled=true} so the test profile
 * doesn't pay the executor lifecycle cost.
 */
@Configuration
@EnableAsync
@ConditionalOnProperty(name = "rag.enabled", havingValue = "true")
public class AsyncConfig {

    public static final String EMBEDDING_EXECUTOR = "embeddingTaskExecutor";
    public static final String BACKFILL_EXECUTOR = "ragBackfillTaskExecutor";

    @Bean(name = EMBEDDING_EXECUTOR)
    public TaskExecutor embeddingTaskExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(2);
        exec.setMaxPoolSize(4);
        exec.setQueueCapacity(50);
        exec.setThreadNamePrefix("embed-");
        // If queue fills (sustained burst > 50 unembedded txs), the calling
        // thread runs the task. Slows down writes but never drops embeds.
        exec.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        exec.setWaitForTasksToCompleteOnShutdown(true);
        exec.setAwaitTerminationSeconds(10);
        exec.initialize();
        return exec;
    }

    /**
     * Dedicated single-thread executor for RAG backfill. Kept separate
     * from the live-save embedding pool on purpose — a backfill of 500
     * transactions must not starve a user's "save → embed" pipeline.
     * Sequential by design: the backfill task paces itself with a small
     * sleep between Gemini calls to stay under quota.
     */
    @Bean(name = BACKFILL_EXECUTOR)
    public TaskExecutor ragBackfillTaskExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(1);
        exec.setMaxPoolSize(1);
        // Bigger queue — many users could each enqueue a backfill while
        // the worker is busy with an earlier one.
        exec.setQueueCapacity(20);
        exec.setThreadNamePrefix("rag-backfill-");
        exec.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.AbortPolicy());
        exec.setWaitForTasksToCompleteOnShutdown(true);
        exec.setAwaitTerminationSeconds(10);
        exec.initialize();
        return exec;
    }
}
