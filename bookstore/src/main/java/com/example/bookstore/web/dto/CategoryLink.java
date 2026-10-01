package com.example.bookstore.web.dto;

public record CategoryLink(
        Long bookId,
        Long categoryId,
        String categoryName) {
}
