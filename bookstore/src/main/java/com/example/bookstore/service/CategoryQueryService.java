package com.example.bookstore.service;

import com.example.bookstore.domain.Category;
import com.example.bookstore.error.ResourceNotFoundException;
import com.example.bookstore.repository.CategoryRepository;
import com.example.bookstore.web.dto.CategoryView;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryQueryService {

    private final CategoryRepository categoryRepository;

    public CategoryQueryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Cacheable(value = "categories", key = "'all'")
    @Transactional(readOnly = true)
    public List<CategoryView> findAll() {
        return categoryRepository.findAll().stream().map(CategoryQueryService::toView).toList();
    }

    @Cacheable(value = "categories", key = "#id")
    @Transactional(readOnly = true)
    public CategoryView findById(Long id) {
        return categoryRepository.findById(id)
                .map(CategoryQueryService::toView)
                .orElseThrow(() -> new ResourceNotFoundException("category " + id + " not found"));
    }

    private static CategoryView toView(Category category) {
        return new CategoryView(category.getId(), category.getName());
    }
}
