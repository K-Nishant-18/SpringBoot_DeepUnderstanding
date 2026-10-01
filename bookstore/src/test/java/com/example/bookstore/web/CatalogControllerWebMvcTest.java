package com.example.bookstore.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookstore.error.ConflictException;
import com.example.bookstore.error.ResourceNotFoundException;
import com.example.bookstore.repository.BookCategoryRepository;
import com.example.bookstore.repository.BookItemRepository;
import com.example.bookstore.repository.BookRepository;
import com.example.bookstore.service.CartService;
import com.example.bookstore.service.CatalogFetchService;
import com.example.bookstore.service.CatalogService;
import com.example.bookstore.service.CategoryCommandService;
import com.example.bookstore.service.CategoryQueryService;
import com.example.bookstore.support.TransactionProbe;
import com.example.bookstore.web.dto.CatalogReadReport;
import com.example.bookstore.web.dto.CatalogRow;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {CatalogController.class, CategoryController.class, CartController.class})
class CatalogControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CatalogService catalogService;

    @MockBean
    private CatalogFetchService catalogFetchService;

    @MockBean
    private BookRepository bookRepository;

    @MockBean
    private BookCategoryRepository bookCategoryRepository;

    @MockBean
    private BookItemRepository bookItemRepository;

    @MockBean
    private CartService cartService;

    @MockBean
    private CategoryQueryService categoryQueryService;

    @MockBean
    private CategoryCommandService categoryCommandService;

    @MockBean
    private TransactionProbe transactionProbe;

    @Test
    @DisplayName("the naive read reports the query count it caused")
    void naiveReadReportsQueryCount() throws Exception {
        CatalogRow row = new CatalogRow(1L, "Effective Java", new BigDecimal("49.99"), "Joshua Bloch", List.of("Technical"));
        given(catalogService.listBooksNaively())
                .willReturn(new CatalogReadReport("naive", "lazy access in a loop", 1, 3, 2, List.of(row)));

        mockMvc.perform(get("/api/catalog/books/naive"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.strategy").value("naive"))
                .andExpect(jsonPath("$.sqlQueries").value(3))
                .andExpect(jsonPath("$.books[0].author").value("Joshua Bloch"));
    }

    @Test
    @DisplayName("the fixed read reports a single query")
    void fixedReadReportsOneQuery() throws Exception {
        given(catalogFetchService.listBooksWithJoinFetch())
                .willReturn(new CatalogReadReport("join-fetch", "join fetch", 8, 1, 0, List.of()));

        mockMvc.perform(get("/api/catalog/books/join-fetch"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.strategy").value("join-fetch"))
                .andExpect(jsonPath("$.sqlQueries").value(1));
    }

    @Test
    @DisplayName("a missing resource becomes an RFC 7807 problem")
    void missingResourceBecomesProblemDetail() throws Exception {
        given(categoryQueryService.findById(404L))
                .willThrow(new ResourceNotFoundException("category 404 not found"));

        mockMvc.perform(get("/api/catalog/categories/404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Not Found"))
                .andExpect(jsonPath("$.detail").value("category 404 not found"))
                .andExpect(jsonPath("$.type").value("https://bookstore.example.com/problems/not-found"));
    }

    @Test
    @DisplayName("an invalid body becomes a problem detail listing the fields")
    void invalidBodyBecomesProblemDetail() throws Exception {
        mockMvc.perform(post("/api/catalog/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("https://bookstore.example.com/problems/validation-failed"))
                .andExpect(jsonPath("$.errors[0].field").value("name"));
    }

    @Test
    @DisplayName("a duplicate category becomes 409")
    void duplicateCategoryBecomesConflict() throws Exception {
        given(categoryCommandService.createWithEviction(any()))
                .willThrow(new ConflictException("category 'Technical' already exists"));

        mockMvc.perform(post("/api/catalog/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Technical\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("category 'Technical' already exists"));
    }
}
