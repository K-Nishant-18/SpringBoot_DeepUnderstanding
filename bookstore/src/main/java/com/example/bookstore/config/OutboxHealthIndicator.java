package com.example.bookstore.config;

import com.example.bookstore.repository.OutboxEventRepository;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component("outbox")
public class OutboxHealthIndicator implements HealthIndicator {

    private static final int BACKLOG_LIMIT = 500;

    private final OutboxEventRepository outboxEventRepository;

    private final BookstoreProperties properties;

    public OutboxHealthIndicator(OutboxEventRepository outboxEventRepository, BookstoreProperties properties) {
        this.outboxEventRepository = outboxEventRepository;
        this.properties = properties;
    }

    @Override
    public Health health() {
        long pending = outboxEventRepository.countByPublishedFalse();
        boolean relayEnabled = properties.getOutbox().isRelayEnabled();
        Health.Builder builder = pending > BACKLOG_LIMIT || !relayEnabled ? Health.down() : Health.up();
        return builder
                .withDetail("pendingEvents", pending)
                .withDetail("backlogLimit", BACKLOG_LIMIT)
                .withDetail("relayEnabled", relayEnabled)
                .build();
    }
}
