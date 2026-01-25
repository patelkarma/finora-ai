package com.project.financeDashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// DTO to send/receive transaction info
public class TransactionDTO {

    private Long id;
    private BigDecimal amount;
    private String category;
    private String type;
    private String description;
    private LocalDate transactionDate;

    // default constructor
    public TransactionDTO() {
    }

    // constructor with parameters
    public TransactionDTO(Long id, BigDecimal amount, String category, String type, String description,
            LocalDate transactionDate) {
        this.id = id;
        this.amount = amount;
        this.category = category;
        this.type = type;
        this.description = description;
        this.transactionDate = transactionDate;
    }

    // getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDate transactionDate) {
        this.transactionDate = transactionDate;
    }
}