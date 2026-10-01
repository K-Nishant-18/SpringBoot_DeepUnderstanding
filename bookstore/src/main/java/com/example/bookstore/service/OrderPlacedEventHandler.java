package com.example.bookstore.service;

import com.example.bookstore.outbox.OrderPlacedEvent;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class OrderPlacedEventHandler {

    private static final Logger LOG = LoggerFactory.getLogger(OrderPlacedEventHandler.class);

    private final List<OrderPlacedEvent> handled = Collections.synchronizedList(new ArrayList<>());

    @EventListener
    public void onOrderPlaced(OrderPlacedEvent event) {
        handled.add(event);
        LOG.info("side effect for order {} on thread {}", event.orderId(), Thread.currentThread().getName());
    }

    public List<OrderPlacedEvent> handled() {
        return List.copyOf(handled);
    }

    public int handledCount() {
        return handled.size();
    }
}
