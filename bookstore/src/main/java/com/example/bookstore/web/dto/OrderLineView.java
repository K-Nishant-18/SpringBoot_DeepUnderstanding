package com.example.bookstore.web.dto;

import java.math.BigDecimal;

public record OrderLineView(
        Long bookId,
        String title,
        Long bookItemId,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        String copyStatus) {
}
