package com.example.bookstore.repository;

import com.example.bookstore.outbox.OutboxEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    List<OutboxEvent> findByPublishedFalseOrderByIdAsc();

    long countByPublishedFalse();
}
