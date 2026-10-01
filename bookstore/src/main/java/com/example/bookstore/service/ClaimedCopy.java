package com.example.bookstore.service;

import java.math.BigDecimal;

public record ClaimedCopy(
        Long bookItemId,
        Long bookId,
        BigDecimal unitPrice) {
}
