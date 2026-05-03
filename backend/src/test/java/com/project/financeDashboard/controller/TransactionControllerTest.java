package com.project.financeDashboard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.financeDashboard.config.JwtAuthFilter;
import com.project.financeDashboard.config.JwtUtil;
import com.project.financeDashboard.config.RateLimitConfig;
import com.project.financeDashboard.config.SecurityConfig;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.TransactionService;
import com.project.financeDashboard.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice tests for the transaction endpoints. We disable the security filter
 * chain (addFilters=false) and rely on @WithMockUser to populate the
 * SecurityContext — the controller reads SecurityContextHolder directly,
 * so this is enough to exercise the auth-ownership branches without
 * spinning up the full SecurityConfig + OAuth wiring.
 *
 * <p>SecurityConfig and JwtAuthFilter are excluded from the slice because
 * they pull in OAuth/JWT beans that aren't relevant to this controller.
 */
@WebMvcTest(
        controllers = TransactionController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {SecurityConfig.class, JwtAuthFilter.class, RateLimitConfig.class}))
@AutoConfigureMockMvc(addFilters = false)
class TransactionControllerTest {

    private static final String AUTH_EMAIL = "alice@example.com";
    private static final Long AUTH_USER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean TransactionService transactionService;
    @MockBean UserService userService;
    @MockBean JwtUtil jwtUtil;

    private User authUser;

    @BeforeEach
    void setUp() {
        authUser = new User("Alice", AUTH_EMAIL, "hashed");
        authUser.setVerified(true);
        // Reflect id since User has no setId — managed entities normally get one from JPA.
        try {
            var idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(authUser, AUTH_USER_ID);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        when(userService.findByEmail(AUTH_EMAIL)).thenReturn(Optional.of(authUser));
    }

    // ------------------------------------------------------------------
    // GET /api/transactions/user/{userId}
    // ------------------------------------------------------------------

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void getTransactionsByUser_happyPath_returnsPage() throws Exception {
        Transaction tx = new Transaction(authUser, new BigDecimal("12.50"), "Food", "expense", "lunch", LocalDate.of(2026, 1, 15));
        Page<Transaction> page = new PageImpl<>(List.of(tx), PageRequest.of(0, 20), 1);
        when(transactionService.getTransactionsPage(eq(AUTH_USER_ID), any())).thenReturn(page);

        mockMvc.perform(get("/api/transactions/user/{userId}", AUTH_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].category").value("Food"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void getTransactionsByUser_otherUserId_returns403() throws Exception {
        mockMvc.perform(get("/api/transactions/user/{userId}", OTHER_USER_ID))
                .andExpect(status().isForbidden());
        verify(transactionService, never()).getTransactionsPage(anyLong(), any());
    }

    // ------------------------------------------------------------------
    // POST /api/transactions/user/{userId}
    // ------------------------------------------------------------------

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void addTransaction_happyPath_savesAndReturns() throws Exception {
        Transaction saved = new Transaction(authUser, new BigDecimal("99.99"), "Food", "expense", "dinner", LocalDate.of(2026, 1, 20));
        when(transactionService.saveTransaction(any())).thenReturn(saved);

        String body = """
                {"amount":99.99,"category":"Food","type":"expense","description":"dinner","transactionDate":"2026-01-20"}
                """;

        mockMvc.perform(post("/api/transactions/user/{userId}", AUTH_USER_ID)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("Food"))
                .andExpect(jsonPath("$.amount").value(99.99));
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void addTransaction_otherUserId_returns403() throws Exception {
        String body = """
                {"amount":99.99,"category":"Food","type":"expense","description":"dinner","transactionDate":"2026-01-20"}
                """;
        mockMvc.perform(post("/api/transactions/user/{userId}", OTHER_USER_ID)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isForbidden());
        verify(transactionService, never()).saveTransaction(any());
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void addTransaction_invalidBody_returns400() throws Exception {
        // Missing required `type` and `amount` <= 0 — both should trigger @Valid failures.
        String body = """
                {"amount":0.00,"category":"Food","description":"dinner","transactionDate":"2026-01-20"}
                """;
        mockMvc.perform(post("/api/transactions/user/{userId}", AUTH_USER_ID)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
        verify(transactionService, never()).saveTransaction(any());
    }

    // ------------------------------------------------------------------
    // POST /api/transactions/user/{userId}/import
    // ------------------------------------------------------------------

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void importTransactions_happyPath_returnsImportedCount() throws Exception {
        when(transactionService.bulkSave(eq(authUser), any())).thenAnswer(inv -> {
            List<Transaction> drafts = inv.getArgument(1);
            return drafts; // pretend they all saved
        });

        String body = """
                {"rows":[
                  {"date":"2026-01-15","description":"coffee","category":"Food","amount":4.50,"type":"expense"},
                  {"date":"2026-01-16","description":"salary","category":"Income","amount":3000.00,"type":"income"}
                ]}
                """;

        mockMvc.perform(post("/api/transactions/user/{userId}/import", AUTH_USER_ID)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(2));
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void importTransactions_otherUserId_returns403() throws Exception {
        String body = """
                {"rows":[{"date":"2026-01-15","description":"coffee","category":"Food","amount":4.50,"type":"expense"}]}
                """;
        mockMvc.perform(post("/api/transactions/user/{userId}/import", OTHER_USER_ID)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isForbidden());
        verify(transactionService, never()).bulkSave(any(), any());
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void importTransactions_emptyRows_returns400() throws Exception {
        // BulkImportRequest is @NotEmpty — empty rows array must fail validation.
        String body = "{\"rows\":[]}";
        mockMvc.perform(post("/api/transactions/user/{userId}/import", AUTH_USER_ID)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
        verify(transactionService, never()).bulkSave(any(), any());
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void importTransactions_invalidRow_returns400() throws Exception {
        // type="random" violates @Pattern(regexp="income|expense") on ImportRow.
        String body = """
                {"rows":[
                  {"date":"2026-01-15","description":"coffee","category":"Food","amount":4.50,"type":"random"}
                ]}
                """;
        mockMvc.perform(post("/api/transactions/user/{userId}/import", AUTH_USER_ID)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
        verify(transactionService, never()).bulkSave(any(), any());
    }

    // ------------------------------------------------------------------
    // POST /api/transactions/user/{userId}/bulk-delete
    // ------------------------------------------------------------------

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void bulkDelete_happyPath_returnsDeletedCount() throws Exception {
        when(transactionService.bulkDelete(eq(AUTH_USER_ID), any())).thenReturn(2);

        String body = "{\"ids\":[10,11,12]}";
        mockMvc.perform(post("/api/transactions/user/{userId}/bulk-delete", AUTH_USER_ID)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(2));
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void bulkDelete_otherUserId_returns403() throws Exception {
        String body = "{\"ids\":[10,11]}";
        mockMvc.perform(post("/api/transactions/user/{userId}/bulk-delete", OTHER_USER_ID)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isForbidden());
        verify(transactionService, never()).bulkDelete(anyLong(), any());
    }

    // ------------------------------------------------------------------
    // DELETE /api/transactions/{id}
    // ------------------------------------------------------------------

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void deleteTransaction_happyPath_returns204() throws Exception {
        Transaction owned = new Transaction(authUser, new BigDecimal("10.00"), "Food", "expense", "x", LocalDate.now());
        when(transactionService.findById(42L)).thenReturn(Optional.of(owned));

        mockMvc.perform(delete("/api/transactions/{id}", 42L))
                .andExpect(status().isNoContent());
        verify(transactionService).deleteTransaction(42L);
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void deleteTransaction_notFound_returns404() throws Exception {
        when(transactionService.findById(99L)).thenReturn(Optional.empty());
        mockMvc.perform(delete("/api/transactions/{id}", 99L))
                .andExpect(status().isNotFound());
        verify(transactionService, never()).deleteTransaction(anyLong());
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void deleteTransaction_ownedByOtherUser_returns403() throws Exception {
        User other = new User("Bob", "bob@example.com", "hashed");
        try {
            var idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(other, OTHER_USER_ID);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        Transaction notMine = new Transaction(other, new BigDecimal("10.00"), "Food", "expense", "x", LocalDate.now());
        when(transactionService.findById(42L)).thenReturn(Optional.of(notMine));

        mockMvc.perform(delete("/api/transactions/{id}", 42L))
                .andExpect(status().isForbidden());
        verify(transactionService, never()).deleteTransaction(anyLong());
    }
}
