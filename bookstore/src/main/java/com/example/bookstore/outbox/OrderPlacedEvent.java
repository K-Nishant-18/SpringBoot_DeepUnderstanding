package com.example.bookstore.outbox;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderPlacedEvent(
        Long orderId,
        Long userId,
        BigDecimal total,
        String currency,
        List<Long> bookItemIds,
        Instant occurredAt) {
}
