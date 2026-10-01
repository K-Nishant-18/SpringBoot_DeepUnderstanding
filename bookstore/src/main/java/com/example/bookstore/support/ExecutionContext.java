package com.example.bookstore.support;

import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

public final class ExecutionContext {

    public static final String CORRELATION_ID = "bookstore.correlationId";

    public static final String MDC_KEY = "correlationId";

    private static final ThreadLocal<String> WORKER_CORRELATION_ID = new ThreadLocal<>();

    private ExecutionContext() {
    }

    public static void setWorkerCorrelationId(String correlationId) {
        WORKER_CORRELATION_ID.set(correlationId);
    }

    public static String workerCorrelationId() {
        return WORKER_CORRELATION_ID.get();
    }

    public static void clear() {
        WORKER_CORRELATION_ID.remove();
    }

    public static String requestCorrelationId() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return null;
        }
        Object value = attributes.getAttribute(CORRELATION_ID, RequestAttributes.SCOPE_REQUEST);
        return value == null ? null : value.toString();
    }
}
