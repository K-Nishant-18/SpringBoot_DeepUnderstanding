package com.example.bookstore.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.bookstore.domain.Author;
import com.example.bookstore.domain.Book;
import com.example.bookstore.domain.BookItem;
import com.example.bookstore.domain.CopyStatus;
import com.example.bookstore.domain.Order;
import com.example.bookstore.domain.User;
import com.example.bookstore.outbox.OrderPlacedEvent;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OrderTotalTest {

    @Test
    @DisplayName("the total is derived from the lines, never accepted from the caller")
    void totalIsDerivedFromLines() {
        Order order = new Order(new User("ada@example.com", "hash", "Ada"), Instant.parse("2026-01-14T10:15:00Z"), "EUR");
        order.addItem(book("Effective Java", "49.99"), copy(), 2, new BigDecimal("49.99"));
        order.addItem(book("Clean Code", "34.50"), copy(), 1, new BigDecimal("34.50"));

        BigDecimal total = order.recalculateTotal();

        assertEquals(0, total.compareTo(new BigDecimal("134.48")));
        assertEquals(0, order.getTotal().compareTo(new BigDecimal("134.48")));
        assertEquals(2, order.getItems().size());
    }

    @Test
    @DisplayName("an empty order totals zero instead of null")
    void emptyOrderTotalsZero() {
        Order order = new Order(new User("alan@example.com", "hash", "Alan"), Instant.now(), "EUR");

        assertEquals(0, order.recalculateTotal().compareTo(BigDecimal.ZERO));
    }

    @Test
    @DisplayName("the outbox payload survives a round trip")
    void outboxPayloadRoundTrips() {
        OrderPlacedEvent event = new OrderPlacedEvent(
                7L,
                3L,
                new BigDecimal("126.98"),
                "EUR",
                List.of(4L, 9L),
                Instant.parse("2026-02-02T18:40:00Z"));

        OrderPlacedEvent decoded = OutboxPayload.decode(OutboxPayload.encode(event));

        assertEquals(event, decoded);
    }

    private static Book book(String title, String price) {
        return new Book(title, new BigDecimal(price), 2020, new Author("Someone", "bio"));
    }

    private static BookItem copy() {
        return new BookItem(new Book("x", BigDecimal.ONE, 2020, new Author("a", "b")), CopyStatus.SOLD, false);
    }
}
