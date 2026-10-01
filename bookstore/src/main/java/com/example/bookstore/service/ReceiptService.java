package com.example.bookstore.service;

import com.example.bookstore.support.ExecutionContext;
import com.example.bookstore.web.dto.AsyncReceiptView;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class ReceiptService {

    private static final Logger LOG = LoggerFactory.getLogger(ReceiptService.class);

    @Async("bookstoreTaskExecutor")
    public CompletableFuture<AsyncReceiptView> issueReceipt(Long orderId, String callerThread, String callerCorrelationId) {
        String workerThread = Thread.currentThread().getName();
        String workerCorrelationId = ExecutionContext.workerCorrelationId();
        String mdcCorrelationId = MDC.get(ExecutionContext.MDC_KEY);
        LOG.info("receipt for order {} is being produced on {}", orderId, workerThread);
        return CompletableFuture.completedFuture(new AsyncReceiptView(
                callerThread,
                callerCorrelationId,
                workerThread,
                mdcCorrelationId,
                Objects.equals(callerCorrelationId, workerCorrelationId),
                "CorrelationTaskDecorator"));
    }

    @Async("bookstoreTaskExecutor")
    public void issueReceiptSilently(Long orderId) {
        throw new IllegalStateException("receipt gateway refused order " + orderId);
    }
}
