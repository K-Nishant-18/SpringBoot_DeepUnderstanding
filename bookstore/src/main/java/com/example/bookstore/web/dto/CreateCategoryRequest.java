package com.example.bookstore.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(
        @NotBlank(message = "category name is required")
        @Size(max = 80, message = "category name must be at most 80 characters")
        String name) {
}
