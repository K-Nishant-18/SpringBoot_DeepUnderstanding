package com.example.bookstore.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.bookstore.repository.OrderRepository;
import com.example.bookstore.repository.OutboxEventRepository;
import com.example.bookstore.support.TransactionProbe;
import com.example.bookstore.web.dto.OrderLineRequest;
import com.example.bookstore.web.dto.PlaceOrderRequest;
import com.example.bookstore.web.dto.TransactionReport;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class OutboxFlowIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OutboxRelay outboxRelay;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderPlacedEventHandler eventHandler;

    @Autowired
    private TransactionProbe transactionProbe;

    @BeforeEach
    void clearProbe() {
        transactionProbe.reset();
    }

    @Test
    @DisplayName("the order row and the outbox row are committed together")
    void orderAndOutboxAreCommittedTogether() {
        PlaceOrderRequest request = new PlaceOrderRequest(1L, List.of(new OrderLineRequest(2L, 1)), "pay-int-1");

        TransactionReport report = orderService.placeOrder(request, OrderService.MODE_REQUIRED);

        assertNotNull(report.orderId());
        assertNotNull(report.outboxEventId());
        assertTrue(orderRepository.findById(report.orderId()).isPresent());
        assertTrue(outboxEventRepository.findById(report.outboxEventId()).isPresent());
        assertTrue(outboxEventRepository.countByPublishedFalse() > 0);
    }

    @Test
    @DisplayName("the self invoked method is bypassed while the cross proxy call is advised")
    void selfInvocationIsBypassedAndCrossProxyCallIsAdvised() {
        PlaceOrderRequest request = new PlaceOrderRequest(1L, List.of(new OrderLineRequest(3L, 1)), "pay-int-2");

        TransactionReport report = orderService.placeOrder(request, OrderService.MODE_REQUIRED);

        Set<String> advised = Set.copyOf(report.advisedMethods());
        assertTrue(advised.contains("placeOrder"));
        assertTrue(advised.contains("reserveCopy"));
        assertFalse(advised.contains("applyOrderDiscount"));
        assertEquals(List.of("OrderService.applyOrderDiscount"), report.bypassedMethods());
        assertTrue(report.transactionActiveInsideOuterMethod());
        assertTrue(transactionProbe.adviceCount() > 0);
    }

    @Test
    @DisplayName("the relay publishes pending events and the handler receives them")
    void relayPublishesPendingEvents() {
        orderService.placeOrder(
                new PlaceOrderRequest(2L, List.of(new OrderLineRequest(7L, 1)), "pay-int-3"),
                OrderService.MODE_REQUIRED);
        int handledBefore = eventHandler.handledCount();

        int published = outboxRelay.relayNow();

        assertTrue(published > 0);
        assertTrue(eventHandler.handledCount() > handledBefore);
        assertTrue(outboxRelay.pending().isEmpty());
    }
}
