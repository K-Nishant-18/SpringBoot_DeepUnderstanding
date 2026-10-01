package com.example.bookstore.service;

import com.example.bookstore.domain.Order;
import com.example.bookstore.outbox.OrderPlacedEvent;
import com.example.bookstore.outbox.OutboxEvent;
import com.example.bookstore.repository.OutboxEventRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxService {

    public static final String ORDER_AGGREGATE = "order";

    public static final String ORDER_PLACED = "OrderPlaced";

    private final OutboxEventRepository outboxEventRepository;

    public OutboxService(OutboxEventRepository outboxEventRepository) {
        this.outboxEventRepository = outboxEventRepository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public OutboxEvent recordOrderPlaced(Order order, List<Long> bookItemIds) {
        OrderPlacedEvent event = new OrderPlacedEvent(
                order.getId(),
                order.getUser().getId(),
                order.getTotal(),
                order.getCurrency(),
                List.copyOf(bookItemIds),
                Instant.now());
        OutboxEvent outboxEvent = new OutboxEvent(
                ORDER_AGGREGATE,
                String.valueOf(order.getId()),
                ORDER_PLACED,
                OutboxPayload.encode(event),
                event.occurredAt());
        return outboxEventRepository.save(outboxEvent);
    }

    public long pendingCount() {
        return outboxEventRepository.countByPublishedFalse();
    }
}
