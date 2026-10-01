package com.example.bookstore.web.dto;

import java.util.List;

public record TransactionReport(
        Long orderId,
        Long outboxEventId,
        String mode,
        int adviceApplied,
        int selfInvocationsBypassed,
        boolean transactionActiveInsideOuterMethod,
        boolean innerFailureCaught,
        List<String> advisedMethods,
        List<String> bypassedMethods) {
}
