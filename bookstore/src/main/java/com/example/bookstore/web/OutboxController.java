package com.example.bookstore.web;

import com.example.bookstore.service.OrderPlacedEventHandler;
import com.example.bookstore.service.OutboxRelay;
import com.example.bookstore.web.dto.OutboxView;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/outbox")
public class OutboxController {

    private final OutboxRelay outboxRelay;

    private final OrderPlacedEventHandler eventHandler;

    public OutboxController(OutboxRelay outboxRelay, OrderPlacedEventHandler eventHandler) {
        this.outboxRelay = outboxRelay;
        this.eventHandler = eventHandler;
    }

    @GetMapping
    public List<OutboxView> all() {
        return outboxRelay.all();
    }

    @GetMapping("/pending")
    public List<OutboxView> pending() {
        return outboxRelay.pending();
    }

    @GetMapping("/handled")
    public List<Map<String, Object>> handled() {
        return eventHandler.handled().stream()
                .map(event -> Map.<String, Object>of(
                        "orderId", event.orderId(),
                        "total", event.total(),
                        "bookItemIds", event.bookItemIds()))
                .toList();
    }

    @PostMapping("/relay")
    public Map<String, Object> relay() {
        int published = outboxRelay.relayNow();
        return Map.of(
                "published", published,
                "pendingAfter", outboxRelay.pending().size(),
                "handledTotal", eventHandler.handledCount());
    }
}
