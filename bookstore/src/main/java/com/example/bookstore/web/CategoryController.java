package com.example.bookstore.web;

import com.example.bookstore.service.CategoryCommandService;
import com.example.bookstore.service.CategoryQueryService;
import com.example.bookstore.web.dto.CategoryView;
import com.example.bookstore.web.dto.CreateCategoryRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog/categories")
public class CategoryController {

    private final CategoryQueryService categoryQueryService;

    private final CategoryCommandService categoryCommandService;

    public CategoryController(CategoryQueryService categoryQueryService, CategoryCommandService categoryCommandService) {
        this.categoryQueryService = categoryQueryService;
        this.categoryCommandService = categoryCommandService;
    }

    @GetMapping
    public List<CategoryView> all() {
        return categoryQueryService.findAll();
    }

    @GetMapping("/{id}")
    public CategoryView byId(@PathVariable Long id) {
        return categoryQueryService.findById(id);
    }

    @PostMapping
    public ResponseEntity<CategoryView> create(@Valid @RequestBody CreateCategoryRequest request) {
        CategoryView created = categoryCommandService.createWithEviction(request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/stale")
    public ResponseEntity<CategoryView> createWithoutEviction(@Valid @RequestBody CreateCategoryRequest request) {
        CategoryView created = categoryCommandService.createWithoutEviction(request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public CategoryView rename(@PathVariable Long id, @RequestParam String name) {
        categoryCommandService.rename(id, name);
        return categoryQueryService.findById(id);
    }
}
