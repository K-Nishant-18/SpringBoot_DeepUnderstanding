package com.example.bookstore.domain;

import java.io.Serializable;
import java.util.Objects;
import jakarta.persistence.Embeddable;

@Embeddable
public class OrderItemId implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long orderId;

    private Long bookId;

    protected OrderItemId() {
    }

    public OrderItemId(Long orderId, Long bookId) {
        this.orderId = orderId;
        this.bookId = bookId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getBookId() {
        return bookId;
    }

    public void setBookId(Long bookId) {
        this.bookId = bookId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof OrderItemId that)) {
            return false;
        }
        return Objects.equals(orderId, that.orderId) && Objects.equals(bookId, that.bookId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderId, bookId);
    }
}
