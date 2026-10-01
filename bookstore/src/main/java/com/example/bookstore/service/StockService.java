package com.example.bookstore.service;

import com.example.bookstore.domain.BookItem;
import com.example.bookstore.domain.CopyStatus;
import com.example.bookstore.error.ConflictException;
import com.example.bookstore.error.InsufficientStockException;
import com.example.bookstore.error.ResourceNotFoundException;
import com.example.bookstore.repository.BookItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockService {

    private final BookItemRepository bookItemRepository;

    public StockService(BookItemRepository bookItemRepository) {
        this.bookItemRepository = bookItemRepository;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public ClaimedCopy reserveCopy(Long bookItemId) {
        return claim(bookItemId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ClaimedCopy reserveCopyInNewTransaction(Long bookItemId) {
        return claim(bookItemId);
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void rejectCopy(Long bookItemId) {
        throw new InsufficientStockException("copy " + bookItemId + " is not available");
    }

    private ClaimedCopy claim(Long bookItemId) {
        BookItem copy = bookItemRepository.findById(bookItemId)
                .orElseThrow(() -> new ResourceNotFoundException("copy " + bookItemId + " not found"));
        if (!Boolean.TRUE.equals(copy.getAvailable())) {
            throw new ConflictException("copy " + bookItemId + " is already " + copy.getStatus());
        }
        copy.setStatus(CopyStatus.SOLD);
        copy.setAvailable(false);
        return new ClaimedCopy(copy.getId(), copy.getBook().getId(), copy.getBook().getPrice());
    }
}
