package com.example.bookstore.web;

import com.example.bookstore.domain.Order;
import com.example.bookstore.domain.OrderItem;
import com.example.bookstore.domain.Payment;
import com.example.bookstore.web.dto.OrderLineView;
import com.example.bookstore.web.dto.OrderView;
import com.example.bookstore.web.dto.PaymentView;
import java.util.List;

public final class OrderViewMapper {

    private OrderViewMapper() {
    }

    public static OrderView toView(Order order) {
        List<OrderLineView> lines = order.getItems().stream().map(OrderViewMapper::toLineView).toList();
        Payment payment = order.getPayment();
        PaymentView paymentView = payment == null
                ? null
                : new PaymentView(payment.getId(), payment.getAmount(), payment.getStatus().name(), payment.getReference());
        return new OrderView(
                order.getId(),
                order.getUser().getId(),
                order.getStatus().name(),
                order.getPlacedAt(),
                order.getTotal(),
                order.getCurrency(),
                lines,
                paymentView,
                null);
    }

    private static OrderLineView toLineView(OrderItem item) {
        return new OrderLineView(
                item.getBook().getId(),
                item.getBook().getTitle(),
                item.getBookItem().getId(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.lineTotal(),
                item.getBookItem().getStatus().name());
    }
}
