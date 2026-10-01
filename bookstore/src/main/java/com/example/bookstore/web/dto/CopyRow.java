package com.example.bookstore.web.dto;

public record CopyRow(
        Long copyId,
        Long bookId,
        String status,
        boolean available,
        long version) {
}
