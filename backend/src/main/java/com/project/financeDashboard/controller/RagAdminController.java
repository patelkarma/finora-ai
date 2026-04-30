package com.project.financeDashboard.controller;

import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.UserService;
import com.project.financeDashboard.service.rag.EmbeddingService;
import com.project.financeDashboard.service.rag.RagBackfillService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

/**
 * RAG operational endpoints — scoped to the authenticated user, so a
 * user can only backfill / inspect their OWN embedding state. No global
 * "embed everything" surface, intentionally.
 *
 * <p>Bean is conditional: a build with {@code rag.enabled=false} (test
 * profile, or prod with RAG temporarily off) doesn't expose these
 * routes at all.
 */
@RestController
@RequestMapping("/api/ai/rag")
@Tag(name = "AI RAG", description = "Retrieval-augmented generation: embedding status + backfill")
public class RagAdminController {

    private static final Logger log = LoggerFactory.getLogger(RagAdminController.class);

    /** Optional — only present when rag.enabled=true. */
    private final RagBackfillService backfillService;
    private final EmbeddingService embeddingService;
    private final UserService userService;

    public RagAdminController(@Autowired(required = false) RagBackfillService backfillService,
                              @Autowired(required = false) EmbeddingService embeddingService,
                              UserService userService) {
        this.backfillService = backfillService;
        this.embeddingService = embeddingService;
        this.userService = userService;
    }

    /**
     * "How many of my transactions are embedded?" — useful for a UI
     * progress badge and for verifying that backfill made progress.
     */
    @GetMapping("/status")
    public ResponseEntity<?> status() {
        if (backfillService == null) {
            return ResponseEntity.ok(Map.of(
                    "enabled", false,
                    "message", "RAG is disabled in this build"));
        }

        Optional<User> userOpt = currentUser();
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "not authenticated"));
        }

        var st = backfillService.status(userOpt.get().getId());
        return ResponseEntity.ok(Map.of(
                "enabled", true,
                "total", st.total(),
                "indexed", st.indexed(),
                "pending", st.pending()));
    }

    /**
     * Trigger a backfill for the caller.
     *
     * <p>To avoid the silent-failure trap where the async loop fails on
     * every embed and the user just sees the badge stuck at 0/N, we
     * run ONE embed synchronously up front as a smoke test. If that
     * succeeds, we know the Gemini key + endpoint + dao are working and
     * we can dispatch the bulk work async. If it fails, return 502
     * with the actual provider error so the UI can show a useful
     * message instead of pretending the work was queued.
     */
    @PostMapping("/backfill")
    public ResponseEntity<?> backfill() {
        if (backfillService == null || embeddingService == null) {
            return ResponseEntity.status(503).body(Map.of(
                    "message", "RAG is disabled in this build"));
        }

        Optional<User> userOpt = currentUser();
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "not authenticated"));
        }
        long userId = userOpt.get().getId();

        var st = backfillService.status(userId);
        log.info("RAG backfill requested: user={} total={} indexed={} pending={}",
                userId, st.total(), st.indexed(), st.pending());

        if (st.pending() == 0) {
            return ResponseEntity.ok(Map.of(
                    "queued", 0,
                    "alreadyIndexed", st.indexed(),
                    "total", st.total(),
                    "message", "All transactions already indexed"));
        }

        // Smoke test: prove the embedding path is healthy before kicking
        // off N async calls that might all fail silently.
        try {
            embeddingService.embedDocument("Finora RAG smoke test");
        } catch (Exception e) {
            log.warn("RAG backfill smoke-test failed for user={}: {}", userId, e.toString());
            return ResponseEntity.status(502).body(Map.of(
                    "message", "Embedding service is unavailable",
                    "detail", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }

        backfillService.backfillForUser(userId);

        return ResponseEntity.accepted().body(Map.of(
                "queued", st.pending(),
                "alreadyIndexed", st.indexed(),
                "total", st.total()));
    }

    private Optional<User> currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Optional.empty();
        return userService.findByEmail(auth.getName());
    }
}
