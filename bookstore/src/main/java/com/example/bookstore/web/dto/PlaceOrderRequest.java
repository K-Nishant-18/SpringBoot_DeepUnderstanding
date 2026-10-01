package com.example.bookstore.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PlaceOrderRequest(
        @NotNull(message = "userId is required")
        @Positive(message = "userId must be positive")
        Long userId,
        @NotEmpty(message = "an order needs at least one line")
        @Size(max = 50, message = "an order cannot exceed 50 lines")
        List<@Valid OrderLineRequest> lines,
        @NotBlank(message = "paymentReference is required")
        @Size(max = 80, message = "paymentReference must be at most 80 characters")
        String paymentReference) {
}
