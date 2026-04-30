package com.project.financeDashboard.controller;

import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.TransactionRepository;
import com.project.financeDashboard.service.TransactionService;
import com.project.financeDashboard.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Demo data seeder. Creates a realistic 90-day transaction history
 * for the authenticated user so the new dashboard cards (subscriptions,
 * anomalies, forecast) actually render with data.
 *
 * <p>Every seeded row is prefixed {@code [DEMO]} in its description so
 * the matching {@code DELETE} endpoint can wipe them cleanly without
 * touching the user's real entries.
 *
 * <p>Authenticated, user-scoped — there's no global "seed everything"
 * surface. Intended for demo and dev use only.
 */
@RestController
@RequestMapping("/api/admin/seed-demo")
@Tag(name = "Demo Seed", description = "Generate / clear demo transactions for the authenticated user")
public class DemoSeedController {

    private static final Logger log = LoggerFactory.getLogger(DemoSeedController.class);
    private static final String DEMO_PREFIX = "[DEMO] ";

    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;
    private final UserService userService;

    public DemoSeedController(TransactionService transactionService,
                              TransactionRepository transactionRepository,
                              UserService userService) {
        this.transactionService = transactionService;
        this.transactionRepository = transactionRepository;
        this.userService = userService;
    }

    /**
     * Inserts ~30 transactions spanning the last 90 days. Crafted to
     * trigger every dashboard insight:
     * <ul>
     *   <li>3 monthly salaries → income side of forecast.</li>
     *   <li>Netflix + Spotify monthly charges → subscription detector.</li>
     *   <li>Weekly groceries with one outlier → anomaly (moderate).</li>
     *   <li>Dining with one severe outlier → anomaly (severe).</li>
     *   <li>Daily coffee / lunch → discretionary baseline for forecast.</li>
     * </ul>
     */
    @PostMapping
    public ResponseEntity<?> seed() {
        Optional<User> userOpt = currentUser();
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "not authenticated"));
        }
        User user = userOpt.get();
        LocalDate today = LocalDate.now();

        // Idempotency: wipe any prior demo rows for this user before seeding
        // fresh. A second click in DevTools shouldn't double the dataset and
        // make every anomaly / subscription appear twice.
        int wiped = 0;
        for (Transaction t : transactionRepository.findByUser(user)) {
            if (t.getDescription() != null && t.getDescription().startsWith(DEMO_PREFIX)) {
                transactionService.deleteTransaction(t.getId());
                wiped++;
            }
        }
        if (wiped > 0) {
            log.info("Demo seed: user={} wiped {} prior demo rows before re-seed", user.getId(), wiped);
        }

        int created = 0;

        // ---- Income: 3 monthly salaries (today, -30d, -60d) ----
        for (int monthsBack : new int[] {0, 1, 2}) {
            LocalDate d = today.minusMonths(monthsBack).withDayOfMonth(1);
            save(user, "70000", "Salary", "income", "Monthly salary", d);
            created++;
        }

        // ---- Recurring subscriptions ----
        for (int monthsBack : new int[] {0, 1, 2}) {
            LocalDate netflix = today.minusMonths(monthsBack).withDayOfMonth(5);
            save(user, "499", "Subscriptions", "expense", "Netflix", netflix);
            LocalDate spotify = today.minusMonths(monthsBack).withDayOfMonth(12);
            save(user, "119", "Subscriptions", "expense", "Spotify Premium", spotify);
            created += 2;
        }

        // ---- Weekly groceries with one outlier (moderate anomaly) ----
        // Normal: ₹1800-₹2400. Outlier on -25d: ₹6500.
        int[] groceryAmounts = {1850, 2100, 2050, 1950, 6500, 2200, 2000, 2300, 1900, 2150, 2050, 2100};
        for (int i = 0; i < groceryAmounts.length; i++) {
            LocalDate d = today.minusDays(i * 7L + 2);
            save(user, String.valueOf(groceryAmounts[i]), "Groceries", "expense",
                    "Weekly groceries", d);
            created++;
        }

        // ---- Dining: 8 normal-ish + 1 severe outlier ----
        int[] foodAmounts = {350, 480, 520, 410, 600, 15000, 450, 550, 380};
        for (int i = 0; i < foodAmounts.length; i++) {
            LocalDate d = today.minusDays(i * 9L + 4);
            String desc = i == 5 ? "Birthday dinner" : "Lunch";
            save(user, String.valueOf(foodAmounts[i]), "Food", "expense", desc, d);
            created++;
        }

        // ---- Daily coffees (small noise for the forecast baseline) ----
        for (int i = 0; i < 8; i++) {
            LocalDate d = today.minusDays(i * 4L + 1);
            int amt = 120 + (i * 13) % 60;  // 120-179 spread
            save(user, String.valueOf(amt), "Coffee", "expense", "Coffee", d);
            created++;
        }

        log.info("Demo seed: user={} created={} transactions", user.getId(), created);
        return ResponseEntity.ok(Map.of(
                "created", created,
                "message", "Demo data seeded. Reload the dashboard to see it."));
    }

    /**
     * Removes every transaction whose description starts with the DEMO
     * prefix. The cascading FK on transaction_embeddings will drop their
     * vectors at the same time, so RAG self-cleans.
     */
    @DeleteMapping
    public ResponseEntity<?> clear() {
        Optional<User> userOpt = currentUser();
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "not authenticated"));
        }
        User user = userOpt.get();

        // Find all of the user's transactions, filter to demo-prefixed ones,
        // delete via the service so cache evictions fire.
        List<Transaction> all = transactionRepository.findByUser(user);
        int deleted = 0;
        for (Transaction t : all) {
            if (t.getDescription() != null && t.getDescription().startsWith(DEMO_PREFIX)) {
                transactionService.deleteTransaction(t.getId());
                deleted++;
            }
        }

        log.info("Demo clear: user={} removed={} transactions", user.getId(), deleted);
        return ResponseEntity.ok(Map.of(
                "removed", deleted,
                "message", "Demo data cleared."));
    }

    private void save(User user, String amount, String category, String type,
                      String description, LocalDate date) {
        Transaction t = new Transaction();
        t.setUser(user);
        t.setAmount(new BigDecimal(amount));
        t.setCategory(category);
        t.setType(type);
        t.setDescription(DEMO_PREFIX + description);
        t.setTransactionDate(date);
        transactionService.saveTransaction(t);
    }

    private Optional<User> currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Optional.empty();
        return userService.findByEmail(auth.getName());
    }
}
