package com.example.bookstore.service;

import com.example.bookstore.outbox.OrderPlacedEvent;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class OutboxPayload {

    private OutboxPayload() {
    }

    public static String encode(OrderPlacedEvent event) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("orderId", String.valueOf(event.orderId()));
        fields.put("userId", String.valueOf(event.userId()));
        fields.put("total", event.total().toPlainString());
        fields.put("currency", event.currency());
        fields.put("bookItemIds", join(event.bookItemIds()));
        fields.put("occurredAt", event.occurredAt().toString());
        StringBuilder payload = new StringBuilder();
        for (Map.Entry<String, String> field : fields.entrySet()) {
            if (payload.length() > 0) {
                payload.append(';');
            }
            payload.append(field.getKey()).append('=').append(field.getValue());
        }
        return payload.toString();
    }

    public static OrderPlacedEvent decode(String payload) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (String part : payload.split(";")) {
            int separator = part.indexOf('=');
            if (separator > 0) {
                fields.put(part.substring(0, separator), part.substring(separator + 1));
            }
        }
        return new OrderPlacedEvent(
                Long.valueOf(fields.get("orderId")),
                Long.valueOf(fields.get("userId")),
                new BigDecimal(fields.get("total")),
                fields.get("currency"),
                split(fields.get("bookItemIds")),
                Instant.parse(fields.get("occurredAt")));
    }

    private static String join(List<Long> values) {
        StringBuilder joined = new StringBuilder();
        for (Long value : values) {
            if (joined.length() > 0) {
                joined.append(',');
            }
            joined.append(value);
        }
        return joined.toString();
    }

    private static List<Long> split(String joined) {
        List<Long> values = new ArrayList<>();
        if (joined == null || joined.isBlank()) {
            return values;
        }
        for (String part : joined.split(",")) {
            values.add(Long.valueOf(part));
        }
        return values;
    }
}
