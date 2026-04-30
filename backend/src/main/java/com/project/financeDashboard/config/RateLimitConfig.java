package com.project.financeDashboard.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Duration;

/**
 * Wires the rate-limit interceptors onto specific routes.
 *
 * <p>Rules below are tuned for a free-tier deployment where the LLM
 * provider has a daily request quota and SMTP/HTTP mail has a daily
 * send cap. They protect:
 * <ul>
 *   <li><b>OTP request</b> — sends an email per call. 5/hr/IP keeps
 *       Brevo's 300/day quota safe from a runaway client.</li>
 *   <li><b>OTP verify</b> — brute-force surface. 10 attempts / 15min /
 *       IP, in addition to the 5-attempt account lock-out.</li>
 *   <li><b>Login</b> — same brute-force concern. 10/15min/IP layered
 *       on top of the per-account failed-login counter.</li>
 *   <li><b>Signup</b> — abuse surface (creating disposable accounts).
 *       5/hr/IP.</li>
 *   <li><b>Forgot password</b> — sends an email. 5/hr/IP.</li>
 *   <li><b>Insight generation</b> — burns Gemini quota. 20/hr/USER.</li>
 * </ul>
 */
@Configuration
public class RateLimitConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Auth — IP-scoped
        registry.addInterceptor(new RateLimitInterceptor(
                        RateLimitRule.perIp("auth.request-otp", 5, Duration.ofHours(1))))
                .addPathPatterns("/api/auth/request-otp");

        registry.addInterceptor(new RateLimitInterceptor(
                        RateLimitRule.perIp("auth.verify-otp", 10, Duration.ofMinutes(15))))
                .addPathPatterns("/api/auth/verify-otp");

        registry.addInterceptor(new RateLimitInterceptor(
                        RateLimitRule.perIp("auth.login", 10, Duration.ofMinutes(15))))
                .addPathPatterns("/api/auth/login");

        registry.addInterceptor(new RateLimitInterceptor(
                        RateLimitRule.perIp("auth.signup", 5, Duration.ofHours(1))))
                .addPathPatterns("/api/auth/signup");

        registry.addInterceptor(new RateLimitInterceptor(
                        RateLimitRule.perIp("auth.forgot-password", 5, Duration.ofHours(1))))
                .addPathPatterns("/api/auth/forgot-password");

        // LLM — user-scoped (authenticated). Falls back to IP for any
        // unauthenticated edge case so an anonymous flood is still capped.
        registry.addInterceptor(new RateLimitInterceptor(
                        RateLimitRule.perUser("ai.insights.generate", 20, Duration.ofHours(1))))
                .addPathPatterns("/api/ai/insights/generate");

        // Chat is more chatty by nature — 60 / hour / USER. Still
        // enough headroom for a normal conversation but caps a runaway
        // client that holds Enter. Both the synchronous endpoint and
        // the SSE streaming endpoint share the same bucket — sending
        // is sending, regardless of how the response is delivered.
        registry.addInterceptor(new RateLimitInterceptor(
                        RateLimitRule.perUser("ai.chat", 60, Duration.ofHours(1))))
                .addPathPatterns("/api/ai/chat", "/api/ai/chat/stream");

        // RAG backfill — heavy operation that can spend hundreds of
        // embed calls per invocation. 5 / hour / USER is plenty for the
        // legitimate "I added new transactions, re-index me" case while
        // capping any tight retry loop.
        registry.addInterceptor(new RateLimitInterceptor(
                        RateLimitRule.perUser("ai.rag.backfill", 5, Duration.ofHours(1))))
                .addPathPatterns("/api/ai/rag/backfill");
    }
}
