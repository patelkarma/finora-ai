package com.project.financeDashboard.event;

import com.project.financeDashboard.model.Transaction;

/**
 * Published by {@code TransactionService} after a transaction is
 * persisted. The RAG indexer listens for this and embeds the row
 * asynchronously after the surrounding DB transaction commits.
 *
 * <p>POJO-style event (not extending ApplicationEvent) — Spring 4.2+
 * supports any object as an event payload.
 */
public record TransactionSavedEvent(Transaction transaction) {}
