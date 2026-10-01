package com.example.bookstore.repository;

import com.example.bookstore.domain.Cart;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CartRepository extends JpaRepository<Cart, Long> {

    @Query("select distinct c from Cart c left join fetch c.items ci left join fetch ci.book where c.user.id = :userId")
    Optional<Cart> findByUserIdWithItems(@Param("userId") Long userId);
}
