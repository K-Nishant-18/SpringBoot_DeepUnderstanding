package com.example.bookstore.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "books")
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "published_year")
    private Integer publishedYear;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private Author author;

    @OneToMany(mappedBy = "book", fetch = FetchType.LAZY)
    private List<BookCategory> bookCategories = new ArrayList<>();

    @OneToMany(mappedBy = "book", fetch = FetchType.LAZY)
    private List<BookItem> copies = new ArrayList<>();

    protected Book() {
    }

    public Book(String title, BigDecimal price, Integer publishedYear, Author author) {
        this.title = title;
        this.price = price;
        this.publishedYear = publishedYear;
        this.author = author;
    }

    public BookCategory addCategory(Category category) {
        BookCategory link = new BookCategory(this, category);
        this.bookCategories.add(link);
        category.getBookCategories().add(link);
        return link;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getPublishedYear() {
        return publishedYear;
    }

    public void setPublishedYear(Integer publishedYear) {
        this.publishedYear = publishedYear;
    }

    public Author getAuthor() {
        return author;
    }

    public void setAuthor(Author author) {
        this.author = author;
    }

    public List<BookCategory> getBookCategories() {
        return bookCategories;
    }

    public void setBookCategories(List<BookCategory> bookCategories) {
        this.bookCategories = bookCategories;
    }

    public List<BookItem> getCopies() {
        return copies;
    }

    public void setCopies(List<BookItem> copies) {
        this.copies = copies;
    }
}
