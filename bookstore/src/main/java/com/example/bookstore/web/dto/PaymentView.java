package com.example.bookstore.web.dto;

import java.math.BigDecimal;

public record PaymentView(
        Long id,
        BigDecimal amount,
        String status,
        String reference) {
}
