package com.example.bookstore.repository;

import com.example.bookstore.domain.Book;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, Long> {

    @Query("select distinct b from Book b left join fetch b.author left join fetch b.bookCategories bc left join fetch bc.category order by b.id")
    List<Book> findAllWithAuthorAndCategories();

    @Query("select distinct b from Book b left join fetch b.author where b.id = :id")
    Optional<Book> findByIdWithAuthor(@Param("id") Long id);
}
