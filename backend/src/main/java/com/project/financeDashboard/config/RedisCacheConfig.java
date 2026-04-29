package com.project.financeDashboard.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

/**
 * Redis cache wiring.
 *
 * <p>Per-cache TTLs are tuned for write/read frequency:
 * <ul>
 *   <li>{@code transactions:user} / {@code budgets:user} / {@code insights:user}
 *       — 5 minutes. Short enough that stale lists self-heal quickly even if
 *       a write happens to miss the eviction (e.g. background updates).</li>
 *   <li>{@code llm:response} — 1 hour. LLM responses for an identical prompt
 *       are deterministic, and cache hits avoid burning the Gemini free-tier
 *       quota (1500 req/day).</li>
 * </ul>
 *
 * <p>Values are serialized as JSON (not Java native) so they remain readable
 * via {@code redis-cli} and survive a JVM upgrade.
 *
 * <p>{@code @ConditionalOnProperty(spring.cache.type=redis)} keeps the test
 * profile (which sets {@code spring.cache.type=none}) from instantiating
 * a Redis-backed cache manager.
 */
@Configuration
@EnableCaching
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis", matchIfMissing = true)
public class RedisCacheConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheConfig.class);

    public static final String CACHE_TRANSACTIONS = "transactions:user";
    public static final String CACHE_BUDGETS = "budgets:user";
    public static final String CACHE_INSIGHTS = "insights:user";
    public static final String CACHE_LLM = "llm:response";

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaults = baseConfig(Duration.ofMinutes(5));

        Map<String, RedisCacheConfiguration> perCache = Map.of(
                CACHE_TRANSACTIONS, baseConfig(Duration.ofMinutes(5)),
                CACHE_BUDGETS,      baseConfig(Duration.ofMinutes(5)),
                CACHE_INSIGHTS,     baseConfig(Duration.ofMinutes(5)),
                CACHE_LLM,          baseConfig(Duration.ofHours(1))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults)
                .withInitialCacheConfigurations(perCache)
                // Cache-miss (i.e. transient Redis outage) must not crash a request.
                // The error handler logs and falls through to the underlying call.
                .transactionAware()
                .build();
    }

    private RedisCacheConfiguration baseConfig(Duration ttl) {
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(ttl)
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(jacksonSerializer()));
    }

    /**
     * Cache failures (Redis down, network blip, serialization error) MUST NOT
     * propagate to the user. The cache is an optimization, not a source of
     * truth — a miss is always cheaper than a 500. This handler logs the
     * failure and lets Spring fall through to the underlying method, exactly
     * as if the cache weren't there.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException ex, Cache cache, Object key) {
                log.warn("Cache GET error on cache={} key={}: {}", cache.getName(), key, ex.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException ex, Cache cache, Object key, Object value) {
                log.warn("Cache PUT error on cache={} key={}: {}", cache.getName(), key, ex.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException ex, Cache cache, Object key) {
                log.warn("Cache EVICT error on cache={} key={}: {}", cache.getName(), key, ex.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException ex, Cache cache) {
                log.warn("Cache CLEAR error on cache={}: {}", cache.getName(), ex.getMessage());
            }
        };
    }

    private GenericJackson2JsonRedisSerializer jacksonSerializer() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        // Enable polymorphic type info so a List<Transaction> round-trips
        // back to the same concrete element type. Validator restricts which
        // classes can be deserialized — this is the recommended modern
        // alternative to enableDefaultTyping(), avoiding RCE-class issues.
        mapper.activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder()
                        .allowIfBaseType(Object.class)
                        .build(),
                ObjectMapper.DefaultTyping.NON_FINAL
        );
        return new GenericJackson2JsonRedisSerializer(mapper);
    }
}
