package com.example.bookstore.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderView(
        Long orderId,
        Long userId,
        String status,
        Instant placedAt,
        BigDecimal total,
        String currency,
        List<OrderLineView> lines,
        PaymentView payment,
        OutboxView outbox) {
}
