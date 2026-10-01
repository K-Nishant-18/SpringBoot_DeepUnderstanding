package com.example.bookstore.repository;

import com.example.bookstore.domain.BookCategory;
import com.example.bookstore.domain.BookCategoryId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookCategoryRepository extends JpaRepository<BookCategory, BookCategoryId> {

    @Query("select bc from BookCategory bc join fetch bc.category where bc.book.id = :bookId order by bc.category.name")
    List<BookCategory> findByBookId(@Param("bookId") Long bookId);
}
