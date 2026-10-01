package com.example.bookstore.web;

import com.example.bookstore.error.ResourceNotFoundException;
import com.example.bookstore.repository.BookCategoryRepository;
import com.example.bookstore.repository.BookItemRepository;
import com.example.bookstore.repository.BookRepository;
import com.example.bookstore.service.CatalogFetchService;
import com.example.bookstore.service.CatalogService;
import com.example.bookstore.web.dto.CatalogReadReport;
import com.example.bookstore.web.dto.CategoryLink;
import com.example.bookstore.web.dto.CopyRow;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogService catalogService;

    private final CatalogFetchService catalogFetchService;

    private final BookRepository bookRepository;

    private final BookCategoryRepository bookCategoryRepository;

    private final BookItemRepository bookItemRepository;

    public CatalogController(CatalogService catalogService,
                             CatalogFetchService catalogFetchService,
                             BookRepository bookRepository,
                             BookCategoryRepository bookCategoryRepository,
                             BookItemRepository bookItemRepository) {
        this.catalogService = catalogService;
        this.catalogFetchService = catalogFetchService;
        this.bookRepository = bookRepository;
        this.bookCategoryRepository = bookCategoryRepository;
        this.bookItemRepository = bookItemRepository;
    }

    @GetMapping("/books/naive")
    public CatalogReadReport booksNaive() {
        return catalogService.listBooksNaively();
    }

    @GetMapping("/books/join-fetch")
    public CatalogReadReport booksJoinFetch() {
        return catalogFetchService.listBooksWithJoinFetch();
    }

    @GetMapping("/books/{bookId}/categories")
    public List<CategoryLink> categoriesThroughJoinTable(@PathVariable Long bookId) {
        if (!bookRepository.existsById(bookId)) {
            throw new ResourceNotFoundException("book " + bookId + " not found");
        }
        return bookCategoryRepository.findByBookId(bookId).stream()
                .map(row -> new CategoryLink(row.getBook().getId(), row.getCategory().getId(), row.getCategory().getName()))
                .toList();
    }

    @GetMapping("/books/{bookId}/copies")
    public List<CopyRow> copies(@PathVariable Long bookId) {
        if (!bookRepository.existsById(bookId)) {
            throw new ResourceNotFoundException("book " + bookId + " not found");
        }
        return bookItemRepository.findByBookId(bookId).stream()
                .map(copy -> new CopyRow(copy.getId(), copy.getBook().getId(), copy.getStatus().name(), copy.getAvailable(), copy.getVersion()))
                .toList();
    }
}
