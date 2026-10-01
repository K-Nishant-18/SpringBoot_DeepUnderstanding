package com.example.bookstore.service;

import com.example.bookstore.domain.Book;
import com.example.bookstore.domain.BookCategory;
import com.example.bookstore.repository.BookRepository;
import com.example.bookstore.support.QueryCounter;
import com.example.bookstore.web.dto.CatalogReadReport;
import com.example.bookstore.web.dto.CatalogRow;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogService {

    private final BookRepository bookRepository;

    private final QueryCounter queryCounter;

    public CatalogService(BookRepository bookRepository, QueryCounter queryCounter) {
        this.bookRepository = bookRepository;
        this.queryCounter = queryCounter;
    }

    @Transactional(readOnly = true)
    public CatalogReadReport listBooksNaively() {
        queryCounter.reset();
        List<Book> books = bookRepository.findAll();
        List<CatalogRow> rows = new ArrayList<>();
        for (Book book : books) {
            rows.add(toRow(book));
        }
        long queries = queryCounter.count();
        long perBook = books.isEmpty() ? 0 : (queries - 1) / books.size();
        return new CatalogReadReport(
                "naive",
                "findAll plus lazy association access inside the loop",
                books.size(),
                queries,
                perBook,
                rows);
    }

    private CatalogRow toRow(Book book) {
        List<String> categoryNames = new ArrayList<>();
        for (BookCategory link : book.getBookCategories()) {
            categoryNames.add(link.getCategory().getName());
        }
        return new CatalogRow(book.getId(), book.getTitle(), book.getPrice(), book.getAuthor().getName(), categoryNames);
    }
}
