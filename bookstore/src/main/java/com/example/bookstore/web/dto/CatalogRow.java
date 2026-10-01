package com.example.bookstore.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record CatalogRow(
        Long bookId,
        String title,
        BigDecimal price,
        String author,
        List<String> categories) {
}
