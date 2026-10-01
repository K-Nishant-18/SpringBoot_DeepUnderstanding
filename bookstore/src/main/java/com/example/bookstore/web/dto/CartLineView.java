package com.example.bookstore.web.dto;

import java.math.BigDecimal;

public record CartLineView(
        Long bookId,
        String title,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal) {
}
