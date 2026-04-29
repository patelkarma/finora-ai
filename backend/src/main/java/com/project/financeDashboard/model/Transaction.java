package com.project.financeDashboard.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnore;

// Entity for storing individual transactions
@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnore // Prevent serialization of lazy user
    private User user;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Size(max = 50, message = "Category must be at most 50 characters")
    @Column(length = 50)
    private String category;

    @NotBlank(message = "Type is required")
    @Pattern(regexp = "income|expense", message = "Type must be either 'income' or 'expense'")
    @Column(length = 10, nullable = false)
    private String type;

    @Size(max = 255, message = "Description must be at most 255 characters")
    @Column(length = 255)
    private String description;

    @NotNull(message = "Transaction date is required")
    @Column(name = "transaction_date", nullable = false)
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate transactionDate;

    // Constructors
    public Transaction() {
    }

    public Transaction(User user, BigDecimal amount, String category, String type, String description,
            LocalDate transactionDate) {
        this.user = user;
        this.amount = amount;
        this.category = category;
        this.type = type;
        this.description = description;
        this.transactionDate = transactionDate;
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