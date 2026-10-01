package com.example.bookstore.service;

import com.example.bookstore.domain.Category;
import com.example.bookstore.error.ConflictException;
import com.example.bookstore.repository.CategoryRepository;
import com.example.bookstore.web.dto.CategoryView;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryCommandService {

    private final CategoryRepository categoryRepository;

    public CategoryCommandService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @CacheEvict(value = "categories", allEntries = true)
    @Transactional
    public CategoryView createWithEviction(String name) {
        return new CategoryView(save(name).getId(), name);
    }

    @Transactional
    public CategoryView createWithoutEviction(String name) {
        return new CategoryView(save(name).getId(), name);
    }

    @CacheEvict(value = "categories", key = "#id")
    @Transactional
    public void rename(Long id, String name) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ConflictException("category " + id + " cannot be renamed because it does not exist"));
        category.setName(name);
        categoryRepository.save(category);
    }

    private Category save(String name) {
        if (categoryRepository.existsByName(name)) {
            throw new ConflictException("category '" + name + "' already exists");
        }
        return categoryRepository.save(new Category(name));
    }
}
