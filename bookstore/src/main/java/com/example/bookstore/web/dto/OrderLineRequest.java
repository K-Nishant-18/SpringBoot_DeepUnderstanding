package com.example.bookstore.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record OrderLineRequest(
        @NotNull(message = "bookItemId is required")
        @Positive(message = "bookItemId must be positive")
        Long bookItemId,
        @Min(value = 1, message = "quantity must be at least 1")
        int quantity) {
}
