package com.example.bookstore.config;

import org.slf4j.MDC;
import org.springframework.core.task.TaskDecorator;
import com.example.bookstore.support.ExecutionContext;

public class CorrelationTaskDecorator implements TaskDecorator {

    @Override
    public Runnable decorate(Runnable runnable) {
        String correlationId = ExecutionContext.requestCorrelationId();
        return () -> {
            ExecutionContext.setWorkerCorrelationId(correlationId);
            if (correlationId != null) {
                MDC.put(ExecutionContext.MDC_KEY, correlationId);
            }
            try {
                runnable.run();
            } finally {
                ExecutionContext.clear();
                MDC.remove(ExecutionContext.MDC_KEY);
            }
        };
    }
}
