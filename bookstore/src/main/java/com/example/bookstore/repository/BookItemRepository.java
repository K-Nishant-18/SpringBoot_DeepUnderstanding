package com.example.bookstore.repository;

import com.example.bookstore.domain.BookItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookItemRepository extends JpaRepository<BookItem, Long> {

    @Query("select bi from BookItem bi where bi.book.id = :bookId order by bi.id")
    List<BookItem> findByBookId(@Param("bookId") Long bookId);

    @Query("select bi from BookItem bi where bi.book.id = :bookId and bi.available = true order by bi.id")
    List<BookItem> findAvailableByBookId(@Param("bookId") Long bookId);

    Optional<BookItem> findFirstByBookIdAndAvailableTrueOrderByIdAsc(Long bookId);
}
