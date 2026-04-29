package com.project.financeDashboard.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;

// Entity to manage user budgets
@Entity
@Table(name = "budgets")
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnore // Prevent serialization of lazy user
    private User user;

    @NotBlank(message = "Category is required")
    @Size(min = 1, max = 50, message = "Category must be 1-50 characters")
    @Column(length = 50, nullable = false)
    private String category;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @NotBlank(message = "Period is required")
    @Pattern(regexp = "weekly|monthly|yearly", message = "Period must be 'weekly', 'monthly' or 'yearly'")
    @Column(length = 20, nullable = false)
    private String period;

    // Constructors
    public Budget() {
    }

    public Budget(User user, String category, BigDecimal amount, String period) {
        this.user = user;
        this.category = category;
        this.amount = amount;
        this.period = period;
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPeriod() {
        return period;
    }

    public void setPeriod(String period) {
        this.period = period;
    }
}
