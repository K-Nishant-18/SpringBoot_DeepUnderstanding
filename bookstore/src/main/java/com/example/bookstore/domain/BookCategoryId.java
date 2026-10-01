package com.example.bookstore.domain;

import java.io.Serializable;
import java.util.Objects;
import jakarta.persistence.Embeddable;

@Embeddable
public class BookCategoryId implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long bookId;

    private Long categoryId;

    protected BookCategoryId() {
    }

    public BookCategoryId(Long bookId, Long categoryId) {
        this.bookId = bookId;
        this.categoryId = categoryId;
    }

    public Long getBookId() {
        return bookId;
    }

    public void setBookId(Long bookId) {
        this.bookId = bookId;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof BookCategoryId that)) {
            return false;
        }
        return Objects.equals(bookId, that.bookId) && Objects.equals(categoryId, that.categoryId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(bookId, categoryId);
    }
}
