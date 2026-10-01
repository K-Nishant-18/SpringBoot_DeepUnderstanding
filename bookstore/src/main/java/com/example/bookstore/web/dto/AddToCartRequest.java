package com.example.bookstore.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AddToCartRequest(
        @NotNull(message = "bookId is required")
        @Positive(message = "bookId must be positive")
        Long bookId,
        @Min(value = 1, message = "quantity must be at least 1")
        int quantity) {
}
