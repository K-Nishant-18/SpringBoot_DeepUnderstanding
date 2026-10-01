package com.example.bookstore.web.dto;

public record AsyncReceiptView(
        String submittedFromThread,
        String correlationIdOnCaller,
        String correlationIdOnWorker,
        String mdcCorrelationIdOnWorker,
        boolean contextPropagated,
        String taskDecoratorApplied) {
}
