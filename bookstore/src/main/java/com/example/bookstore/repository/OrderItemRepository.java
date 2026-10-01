package com.example.bookstore.repository;

import com.example.bookstore.domain.OrderItem;
import com.example.bookstore.domain.OrderItemId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, OrderItemId> {
}
