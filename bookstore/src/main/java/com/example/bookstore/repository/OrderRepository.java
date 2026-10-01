package com.example.bookstore.repository;

import com.example.bookstore.domain.Order;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("select distinct o from Order o left join fetch o.items i left join fetch i.book left join fetch i.bookItem left join fetch o.payment where o.id = :id")
    Optional<Order> findByIdWithDetails(@Param("id") Long id);

    @Query("select distinct o from Order o left join fetch o.items i left join fetch i.book left join fetch i.bookItem left join fetch o.payment where o.user.id = :userId order by o.id")
    List<Order> findByUserIdWithDetails(@Param("userId") Long userId);
}
