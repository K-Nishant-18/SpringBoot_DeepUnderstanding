package com.example.bookstore.web.dto;

import java.util.List;

public record SettingsView(
        int defaultPageSize,
        int maxPageSize,
        String currency,
        int lowStockThreshold,
        long outboxRelayDelayMs,
        int outboxBatchSize,
        int asyncCorePoolSize,
        int asyncMaxPoolSize,
        int asyncQueueCapacity,
        String relayTopic,
        List<String> resolvedAsyncThreadNames) {
}
