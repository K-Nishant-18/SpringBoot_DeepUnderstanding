package com.example.bookstore.web.dto;

public record OutboxView(
        Long id,
        String aggregateType,
        String aggregateId,
        String eventType,
        boolean published,
        int attempts) {
}
