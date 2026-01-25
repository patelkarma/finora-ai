package com.project.financeDashboard.dto;

import java.math.BigDecimal;

// Data transfer object for Budget
public class BudgetDTO {

    private Long id;
    private String category;
    private BigDecimal amount;
    private String period;

    // default constructor
    public BudgetDTO() {
    }

    // constructor with parameters (optional)
    public BudgetDTO(Long id, String category, BigDecimal amount, String period) {
        this.id = id;
        this.category = category;
        this.amount = amount;
        this.period = period;
    }

    // getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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