package com.project.financeDashboard.controller;

import com.project.financeDashboard.model.Budget;
import com.project.financeDashboard.model.Insight;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.*;
import com.project.financeDashboard.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * GDPR-style data-subject endpoints, scoped to the authenticated user.
 *
 * <ul>
 *   <li>{@code GET  /api/users/me/export} — returns a JSON dump of every
 *       row the user owns: profile, transactions, budgets, insights,
 *       login history. Suggested filename via Content-Disposition so a
 *       browser saves it directly</li>
 *   <li>{@code DELETE /api/users/me} — wipes the user's account and all
 *       cascading data. Idempotent at the user-id level: a second call
 *       just 404s</li>
 * </ul>
 *
 * <p>Both are auth-scoped via {@link SecurityContextHolder} — there's no
 * "delete any user by id" surface, intentionally.
 */
@RestController
@RequestMapping("/api/users/me")
@Tag(name = "User Data",
        description = "GDPR data-subject rights: export and delete the authenticated user's data")
public class UserDataController {

    private static final Logger log = LoggerFactory.getLogger(UserDataController.class);

    private final UserService userService;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final InsightRepository insightRepository;
    private final LoginHistoryRepository loginHistoryRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    public UserDataController(UserService userService,
                              UserRepository userRepository,
                              TransactionRepository transactionRepository,
                              BudgetRepository budgetRepository,
                              InsightRepository insightRepository,
                              LoginHistoryRepository loginHistoryRepository,
                              PasswordResetTokenRepository passwordResetTokenRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.budgetRepository = budgetRepository;
        this.insightRepository = insightRepository;
        this.loginHistoryRepository = loginHistoryRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    /**
     * Full data export. Returns JSON with every owned record. Sized for
     * a personal-finance account (low thousands of rows); a hypothetical
     * heavy user would still fit in single-digit MB.
     *
     * <p>We avoid streaming because (a) the dataset is small and (b) a
     * downloaded JSON file is the format users expect. If we grow to
     * datasets that don't fit in memory comfortably, switch to a
     * streaming JSON writer.
     */
    @GetMapping("/export")
    public ResponseEntity<?> exportMyData() {
        Optional<User> userOpt = currentUser();
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "not authenticated"));
        }
        User user = userOpt.get();

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getId());
        profile.put("name", user.getName());
        profile.put("email", user.getEmail());
        profile.put("phone", user.getPhone());
        profile.put("salary", user.getSalary());
        profile.put("verified", user.isVerified());
        profile.put("oauthUser", user.isOauthUser());
        profile.put("provider", user.getProvider());

        List<Transaction> txs = transactionRepository.findByUser(user);
        List<Budget> budgets = budgetRepository.findByUser(user);
        List<Insight> insights = insightRepository.findByUserOrderByCreatedAtDesc(user);
        var logins = loginHistoryRepository.findByUserIdOrderByTimestampDesc(user.getId());

        Map<String, Object> dump = new LinkedHashMap<>();
        dump.put("exportedAt", LocalDateTime.now().toString());
        dump.put("schema", "finora-user-export-v1");
        dump.put("profile", profile);
        dump.put("transactions", txs);
        dump.put("budgets", budgets);
        dump.put("insights", insights);
        dump.put("loginHistory", logins);

        log.info("User-data export: user={} txs={} budgets={} insights={} logins={}",
                user.getId(), txs.size(), budgets.size(), insights.size(), logins.size());

        String filename = "finora-export-" + user.getId() + "-"
                + LocalDateTime.now().toLocalDate() + ".json";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"")
                .body(dump);
    }

    /**
     * Hard-delete the authenticated user and all their owned rows.
     *
     * <p>Order matters: we delete the rows that have FK back to {@code users}
     * before deleting the user itself. Some tables ({@code transactions},
     * {@code transaction_embeddings}) have ON DELETE CASCADE on their
     * user FK, so technically deleting the user row alone would cover
     * them — but doing it explicitly here makes the intent visible and
     * keeps this independent of future schema-level cascade choices.
     */
    @DeleteMapping
    @Transactional
    public ResponseEntity<?> deleteMyAccount() {
        Optional<User> userOpt = currentUser();
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "not authenticated"));
        }
        User user = userOpt.get();
        long userId = user.getId();
        String email = user.getEmail();

        // Owned-row sweep before the user row goes. Each deleteAll(...)
        // is a single bulk DELETE — fine at our row counts.
        passwordResetTokenRepository.deleteAllByUser(user);
        insightRepository.deleteAll(insightRepository.findByUserId(userId));
        budgetRepository.deleteAll(budgetRepository.findByUser(user));
        transactionRepository.deleteAll(transactionRepository.findByUser(user));
        // login_history is keyed by user_id (no FK relationship object),
        // so use the list-based delete.
        loginHistoryRepository.deleteAll(
                loginHistoryRepository.findByUserIdOrderByTimestampDesc(userId));

        userRepository.delete(user);

        log.info("User-data delete: user={} email={} done", userId, email);

        return ResponseEntity.ok(Map.of(
                "deleted", true,
                "userId", userId,
                "message", "Your account and all associated data have been permanently deleted."
        ));
    }

    private Optional<User> currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Optional.empty();
        return userService.findByEmail(auth.getName());
    }
}
