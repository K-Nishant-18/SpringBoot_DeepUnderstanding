package com.example.bookstore.web.dto;

import java.util.List;

public record CatalogReadReport(
        String strategy,
        String fetchStrategy,
        int bookCount,
        long sqlQueries,
        long queriesPerBook,
        List<CatalogRow> books) {
}
