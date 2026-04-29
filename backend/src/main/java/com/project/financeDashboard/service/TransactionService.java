package com.project.financeDashboard.service;

import com.project.financeDashboard.config.RedisCacheConfig;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.TransactionRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Cache strategy:
 *   - Per-user transaction list is cached under {@link RedisCacheConfig#CACHE_TRANSACTIONS}
 *     with the user id as the key. TTL is 5 minutes.
 *   - Any write (save / delete) evicts ALL entries in the cache. Writes are
 *     user-initiated and infrequent compared to reads, so the cost of evicting
 *     other users' lists is negligible vs the bookkeeping needed to evict only
 *     the affected user (which would require a repository lookup before delete).
 */
@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @Cacheable(value = RedisCacheConfig.CACHE_TRANSACTIONS, key = "#user.id")
    public List<Transaction> getTransactionsByUser(User user) {
        return transactionRepository.findByUser(user);
    }

    @Cacheable(value = RedisCacheConfig.CACHE_TRANSACTIONS, key = "#userId")
    public List<Transaction> getTransactionsByUserId(Long userId) {
        return transactionRepository.findByUserId(userId);
    }

    @CacheEvict(value = RedisCacheConfig.CACHE_TRANSACTIONS, allEntries = true)
    public Transaction saveTransaction(@NonNull Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    public Optional<Transaction> findById(@NonNull Long id) {
        return transactionRepository.findById(id);
    }

    @CacheEvict(value = RedisCacheConfig.CACHE_TRANSACTIONS, allEntries = true)
    public void deleteTransaction(@NonNull Long id) {
        transactionRepository.deleteById(id);
    }
}
