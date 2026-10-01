package com.example.bookstore.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "bookstore")
public class BookstoreProperties {

    @Valid
    private final Catalog catalog = new Catalog();

    @Valid
    private final Orders orders = new Orders();

    @Valid
    private final Async async = new Async();

    @Valid
    private final Outbox outbox = new Outbox();

    public Catalog getCatalog() {
        return catalog;
    }

    public Orders getOrders() {
        return orders;
    }

    public Async getAsync() {
        return async;
    }

    public Outbox getOutbox() {
        return outbox;
    }

    public static class Catalog {

        @Min(1)
        private int defaultPageSize = 20;

        @Min(1)
        private int maxPageSize = 200;

        @NotBlank
        @Size(min = 3, max = 3)
        private String currency = "EUR";

        public int getDefaultPageSize() {
            return defaultPageSize;
        }

        public void setDefaultPageSize(int defaultPageSize) {
            this.defaultPageSize = defaultPageSize;
        }

        public int getMaxPageSize() {
            return maxPageSize;
        }

        public void setMaxPageSize(int maxPageSize) {
            this.maxPageSize = maxPageSize;
        }

        public String getCurrency() {
            return currency;
        }

        public void setCurrency(String currency) {
            this.currency = currency;
        }
    }

    public static class Orders {

        @Min(0)
        private int lowStockThreshold = 2;

        @Min(500)
        private long outboxRelayDelayMs = 5000L;

        @Min(1)
        private int outboxBatchSize = 50;

        public int getLowStockThreshold() {
            return lowStockThreshold;
        }

        public void setLowStockThreshold(int lowStockThreshold) {
            this.lowStockThreshold = lowStockThreshold;
        }

        public long getOutboxRelayDelayMs() {
            return outboxRelayDelayMs;
        }

        public void setOutboxRelayDelayMs(long outboxRelayDelayMs) {
            this.outboxRelayDelayMs = outboxRelayDelayMs;
        }

        public int getOutboxBatchSize() {
            return outboxBatchSize;
        }

        public void setOutboxBatchSize(int outboxBatchSize) {
            this.outboxBatchSize = outboxBatchSize;
        }
    }

    public static class Async {

        @Min(1)
        private int corePoolSize = 2;

        @Min(1)
        private int maxPoolSize = 8;

        @Min(1)
        private int queueCapacity = 100;

        @Min(1000)
        private long awaitTimeoutMs = 30000L;

        public int getCorePoolSize() {
            return corePoolSize;
        }

        public void setCorePoolSize(int corePoolSize) {
            this.corePoolSize = corePoolSize;
        }

        public int getMaxPoolSize() {
            return maxPoolSize;
        }

        public void setMaxPoolSize(int maxPoolSize) {
            this.maxPoolSize = maxPoolSize;
        }

        public int getQueueCapacity() {
            return queueCapacity;
        }

        public void setQueueCapacity(int queueCapacity) {
            this.queueCapacity = queueCapacity;
        }

        public long getAwaitTimeoutMs() {
            return awaitTimeoutMs;
        }

        public void setAwaitTimeoutMs(long awaitTimeoutMs) {
            this.awaitTimeoutMs = awaitTimeoutMs;
        }
    }

    public static class Outbox {

        private boolean relayEnabled = true;

        public boolean isRelayEnabled() {
            return relayEnabled;
        }

        public void setRelayEnabled(boolean relayEnabled) {
            this.relayEnabled = relayEnabled;
        }
    }
}
