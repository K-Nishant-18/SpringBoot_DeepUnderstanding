package com.example.bookstore.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.bookstore.domain.Author;
import com.example.bookstore.domain.Book;
import com.example.bookstore.domain.BookCategory;
import com.example.bookstore.domain.Category;
import com.example.bookstore.support.QueryCounter;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@Import(QueryCounter.class)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
})
class BookRepositoryDataJpaTest {

    @Autowired
    private TestEntityManager testEntityManager;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private BookCategoryRepository bookCategoryRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private QueryCounter queryCounter;

    @Test
    @DisplayName("join fetch loads author and categories in one query")
    void joinFetchLoadsTheWholeGraph() {
        seedCatalogue();

        queryCounter.reset();
        List<Book> books = bookRepository.findAllWithAuthorAndCategories();

        assertEquals(2, books.size());
        assertEquals(1L, queryCounter.count());
        for (Book book : books) {
            assertNotNull(book.getAuthor().getName());
            assertFalse(book.getAuthor().getName().isBlank());
            assertFalse(book.getBookCategories().isEmpty());
        }
    }

    @Test
    @DisplayName("the explicit join entity is the only mapping of the book_category table")
    void joinEntityMapsTheSameTable() {
        Book effectiveJava = seedCatalogue().get(0);

        List<BookCategory> rows = bookCategoryRepository.findByBookId(effectiveJava.getId());

        assertEquals(2, rows.size());
        for (BookCategory row : rows) {
            assertEquals(effectiveJava.getId(), row.getBook().getId());
            assertFalse(row.getCategory().getName().isBlank());
            assertEquals(effectiveJava.getId(), row.getId().getBookId());
        }
    }

    @Test
    @DisplayName("the lazy collections are not initialised before the query runs")
    void naiveReadPathStillLoadsPerRow() {
        seedCatalogue();
        queryCounter.reset();

        List<Book> books = bookRepository.findAll();
        long beforeAccess = queryCounter.count();
        books.get(0).getAuthor().getName();
        long afterFirstAuthor = queryCounter.count();
        books.get(1).getAuthor().getName();
        long afterSecondAuthor = queryCounter.count();

        assertEquals(1L, beforeAccess);
        assertEquals(2L, afterFirstAuthor);
        assertEquals(3L, afterSecondAuthor);
    }

    @Test
    @DisplayName("category names are unique")
    void categoryNamesAreUnique() {
        testEntityManager.persist(new Category("Technical"));
        testEntityManager.flush();

        assertTrue(categoryRepository.existsByName("Technical"));
        assertFalse(categoryRepository.existsByName("Fiction"));
    }

    private List<Book> seedCatalogue() {
        EntityManager entityManager = testEntityManager.getEntityManager();
        Author bloch = new Author("Joshua Bloch", "Java language designer");
        Author martin = new Author("Robert C. Martin", "Clean Code author");
        Category technical = new Category("Technical");
        Category architecture = new Category("Architecture");
        Book effectiveJava = new Book("Effective Java", new BigDecimal("49.99"), 2017, bloch);
        Book cleanCode = new Book("Clean Code", new BigDecimal("34.50"), 2008, martin);
        entityManager.persist(bloch);
        entityManager.persist(martin);
        entityManager.persist(technical);
        entityManager.persist(architecture);
        entityManager.persist(effectiveJava);
        entityManager.persist(cleanCode);
        entityManager.flush();
        entityManager.persist(effectiveJava.addCategory(technical));
        entityManager.persist(effectiveJava.addCategory(architecture));
        entityManager.persist(cleanCode.addCategory(technical));
        entityManager.flush();
        entityManager.clear();
        return List.of(effectiveJava, cleanCode);
    }
}
