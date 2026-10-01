package com.example.bookstore.service;

import com.example.bookstore.config.BookstoreProperties;
import com.example.bookstore.config.RelayProperties;
import com.example.bookstore.outbox.OutboxEvent;
import com.example.bookstore.repository.OutboxEventRepository;
import com.example.bookstore.support.TransactionAwareEventPublisher;
import com.example.bookstore.web.dto.OutboxView;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OutboxRelay {

    private static final Logger LOG = LoggerFactory.getLogger(OutboxRelay.class);

    private final OutboxEventRepository outboxEventRepository;

    private final TransactionAwareEventPublisher eventPublisher;

    private final BookstoreProperties properties;

    private final RelayProperties relayProperties;

    public OutboxRelay(OutboxEventRepository outboxEventRepository,
                       TransactionAwareEventPublisher eventPublisher,
                       BookstoreProperties properties,
                       RelayProperties relayProperties) {
        this.outboxEventRepository = outboxEventRepository;
        this.eventPublisher = eventPublisher;
        this.properties = properties;
        this.relayProperties = relayProperties;
    }

    @Scheduled(fixedDelayString = "${bookstore.orders.outbox-relay-delay-ms:5000}")
    @Transactional
    public int relayPendingEvents() {
        if (!properties.getOutbox().isRelayEnabled()) {
            return 0;
        }
        List<OutboxEvent> pending = new ArrayList<>(outboxEventRepository.findByPublishedFalseOrderByIdAsc());
        int batchSize = Math.min(properties.getOrders().getOutboxBatchSize(), pending.size());
        int published = 0;
        for (int index = 0; index < batchSize; index++) {
            OutboxEvent event = pending.get(index);
            event.recordAttempt();
            if (event.getAttempts() > relayProperties.getMaxAttempts()) {
                LOG.warn("outbox event {} exceeded {} attempts and stays unpublished", event.getId(), relayProperties.getMaxAttempts());
                outboxEventRepository.save(event);
                continue;
            }
            try {
                eventPublisher.publishEvent(OutboxPayload.decode(event.getPayload()));
                event.markPublished();
                published++;
            } catch (RuntimeException failure) {
                LOG.error("outbox relay could not publish event {} to topic {}", event.getId(), relayProperties.getTopic(), failure);
            }
            outboxEventRepository.save(event);
        }
        return published;
    }

    @Transactional
    public int relayNow() {
        return relayPendingEvents();
    }

    public List<OutboxView> pending() {
        return outboxEventRepository.findByPublishedFalseOrderByIdAsc().stream().map(OutboxRelay::toView).toList();
    }

    public List<OutboxView> all() {
        return outboxEventRepository.findAll().stream().map(OutboxRelay::toView).toList();
    }

    private static OutboxView toView(OutboxEvent event) {
        return new OutboxView(
                event.getId(),
                event.getAggregateType(),
                event.getAggregateId(),
                event.getEventType(),
                Boolean.TRUE.equals(event.getPublished()),
                event.getAttempts());
    }
}
