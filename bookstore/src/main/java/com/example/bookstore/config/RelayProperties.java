package com.example.bookstore.config;

import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "bookstore.relay")
public class RelayProperties {

    @NotNull
    private String topic = "orders";

    private int maxAttempts = 5;

    private Map<String, String> headers = new LinkedHashMap<>();

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public Map<String, String> getHeaders() {
        return headers;
    }

    public void setHeaders(Map<String, String> headers) {
        this.headers = headers;
    }

    public String correlationId() {
        return MDC.get("correlationId") == null ? UUID.nameUUIDFromBytes(new byte[0]).toString() : MDC.get("correlationId");
    }
}
