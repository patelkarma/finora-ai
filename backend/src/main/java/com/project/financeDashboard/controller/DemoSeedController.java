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
     * Inserts ~90 transactions spanning the last 90 days. Crafted to
     * trigger every dashboard insight while reading like a real wallet:
     * <ul>
     *   <li>3 monthly salaries + 1 freelance bonus → income side of forecast,
     *       with a non-trivial spike the model has to handle.</li>
     *   <li>6 distinct monthly subscriptions (Netflix, Spotify, Jio Fiber,
     *       Electricity, Google One, Rent) → subscription detector cards.</li>
     *   <li>Weekly groceries across 3 vendors with one ₹6,500 outlier →
     *       anomaly (moderate).</li>
     *   <li>Dining across Swiggy / Zomato / cafes with one ₹15,000 birthday
     *       dinner → anomaly (severe).</li>
     *   <li>Weekly transport (Uber / Ola / petrol) with one ₹2,800 airport
     *       ride → anomaly (severe).</li>
     *   <li>Frequent coffee / shopping rows → discretionary baseline so the
     *       forecast line has signal to fit.</li>
     * </ul>
     *
     * <p>Vendor names rotate deterministically — no RNG — so the demo looks
     * the same on every seed and the screenshots stay reproducible.
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

        // ---- Income: 3 monthly salaries + 1 freelance bonus ----
        for (int monthsBack : new int[] {0, 1, 2}) {
            LocalDate d = today.minusMonths(monthsBack).withDayOfMonth(1);
            save(user, "70000", "Salary", "income", "Monthly salary", d);
            created++;
        }
        // Freelance bonus 45 days ago — gives the forecast a non-flat income line.
        save(user, "18500", "Freelance", "income", "Freelance project payment",
                today.minusDays(45));
        created++;

        // ---- Recurring monthly subscriptions (6 distinct, each × 3 months) ----
        // Same day-of-month each month so the subscription detector locks onto
        // the cadence with high confidence.
        Object[][] subscriptions = {
                {"Rent — apartment",        "Housing",       "15500",  1},
                {"Netflix",                 "Subscriptions", "499",    5},
                {"Spotify Premium",         "Subscriptions", "119",    12},
                {"Jio Fiber broadband",     "Utilities",     "999",    8},
                {"Electricity bill",        "Utilities",     "2150",   18},
                {"Google One — 200GB",      "Subscriptions", "210",    22},
        };
        for (Object[] s : subscriptions) {
            String desc = (String) s[0];
            String cat = (String) s[1];
            String amt = (String) s[2];
            int dayOfMonth = (int) s[3];
            for (int monthsBack : new int[] {0, 1, 2}) {
                LocalDate d = today.minusMonths(monthsBack).withDayOfMonth(dayOfMonth);
                if (d.isAfter(today)) continue; // current-month day not yet reached
                save(user, amt, cat, "expense", desc, d);
                created++;
            }
        }

        // ---- Weekly groceries across 3 rotating vendors, one outlier ----
        // Normal range ~₹1,800-₹2,400. Index 4 is the ₹6,500 outlier so the
        // anomaly detector flags one moderate event.
        int[] groceryAmounts = {1850, 2100, 2050, 1950, 6500, 2200, 2000, 2300, 1900, 2150, 2050, 2100};
        String[] groceryVendors = {"DMart weekly run", "BigBasket order", "Local kirana store"};
        for (int i = 0; i < groceryAmounts.length; i++) {
            LocalDate d = today.minusDays(i * 7L + 2);
            String desc = i == 4 ? "DMart — bulk monthly run" : groceryVendors[i % groceryVendors.length];
            save(user, String.valueOf(groceryAmounts[i]), "Groceries", "expense", desc, d);
            created++;
        }

        // ---- Dining: varied vendors + one severe outlier (birthday dinner) ----
        int[] foodAmounts = {320, 480, 520, 410, 600, 15000, 450, 550, 380, 290, 510, 460};
        String[] foodVendors = {
                "Swiggy — lunch", "Zomato dinner", "Cafe Coffee Day", "Domino's pizza",
                "Office canteen", "Birthday dinner — Olive Bistro", "McDonald's",
                "Swiggy — lunch", "Local dhaba", "Starbucks pastry", "Zomato dinner", "KFC bucket"
        };
        for (int i = 0; i < foodAmounts.length; i++) {
            LocalDate d = today.minusDays(i * 7L + 4);
            save(user, String.valueOf(foodAmounts[i]), "Food", "expense", foodVendors[i], d);
            created++;
        }

        // ---- Transport: weekly Uber/Ola/petrol + one airport-ride outlier ----
        int[] transportAmounts = {180, 220, 350, 195, 240, 2800, 210, 270, 320, 200, 260, 230};
        String[] transportVendors = {
                "Uber to office", "Ola — evening", "Petrol — Indian Oil", "Uber to mall",
                "Auto — late night", "Uber — airport drop", "Metro recharge",
                "Ola — meeting", "Petrol top-up", "Uber to dinner", "Auto rickshaw", "Ola — weekend"
        };
        for (int i = 0; i < transportAmounts.length; i++) {
            LocalDate d = today.minusDays(i * 7L + 1);
            save(user, String.valueOf(transportAmounts[i]), "Transport", "expense",
                    transportVendors[i], d);
            created++;
        }

        // ---- Daily coffees (forecast baseline noise) ----
        String[] coffeeVendors = {"Starbucks", "Blue Tokai", "Third Wave Coffee", "Office cafe"};
        for (int i = 0; i < 18; i++) {
            LocalDate d = today.minusDays(i * 5L + 1);
            int amt = 140 + (i * 17) % 80; // 140-219 spread
            save(user, String.valueOf(amt), "Coffee", "expense",
                    coffeeVendors[i % coffeeVendors.length], d);
            created++;
        }

        // ---- Shopping / personal care (small recurring discretionary) ----
        Object[][] shopping = {
                {"Amazon — books",         "Shopping",       "1240", 8},
                {"Myntra — t-shirt",       "Shopping",       "899",  20},
                {"Nykaa — skincare",       "Personal Care",  "1450", 32},
                {"Decathlon — shoes",      "Shopping",       "3200", 55},
                {"Zudio — basics",         "Shopping",       "740",  68},
                {"Pharmacy — refill",      "Health",         "560",  12},
                {"Dr. Lal PathLabs — test","Health",         "1800", 50},
        };
        for (Object[] s : shopping) {
            String desc = (String) s[0];
            String cat = (String) s[1];
            String amt = (String) s[2];
            int daysBack = (int) s[3];
            save(user, amt, cat, "expense", desc, today.minusDays(daysBack));
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
