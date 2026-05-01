package com.project.financeDashboard.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public class BulkImportRequest {

    @NotEmpty(message = "Rows cannot be empty")
    @Size(max = 1000, message = "Cannot import more than 1000 rows at once")
    @Valid
    private List<ImportRow> rows;

    public List<ImportRow> getRows() { return rows; }
    public void setRows(List<ImportRow> rows) { this.rows = rows; }
}
