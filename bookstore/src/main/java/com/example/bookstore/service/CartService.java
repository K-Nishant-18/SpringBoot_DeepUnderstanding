package com.example.bookstore.service;

import com.example.bookstore.domain.Book;
import com.example.bookstore.domain.Cart;
import com.example.bookstore.domain.CartItem;
import com.example.bookstore.domain.User;
import com.example.bookstore.error.ResourceNotFoundException;
import com.example.bookstore.repository.BookRepository;
import com.example.bookstore.repository.CartRepository;
import com.example.bookstore.repository.UserRepository;
import com.example.bookstore.web.dto.AddToCartRequest;
import com.example.bookstore.web.dto.CartLineView;
import com.example.bookstore.web.dto.CartView;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {

    private final UserRepository userRepository;

    private final BookRepository bookRepository;

    private final CartRepository cartRepository;

    public CartService(UserRepository userRepository, BookRepository bookRepository, CartRepository cartRepository) {
        this.userRepository = userRepository;
        this.bookRepository = bookRepository;
        this.cartRepository = cartRepository;
    }

    @Transactional(readOnly = true)
    public CartView getCart(Long userId) {
        Cart cart = cartRepository.findByUserIdWithItems(userId)
                .orElseThrow(() -> new ResourceNotFoundException("cart for user " + userId + " not found"));
        return toView(cart);
    }

    @Transactional
    public CartView addToCart(Long userId, AddToCartRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("user " + userId + " not found"));
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new ResourceNotFoundException("book " + request.bookId() + " not found"));
        Cart cart = cartRepository.findByUserIdWithItems(userId).orElse(null);
        if (cart == null) {
            cart = new Cart(user);
            cartRepository.save(cart);
        }
        cart.addItem(book, request.quantity());
        return toView(cartRepository.save(cart));
    }

    private CartView toView(Cart cart) {
        List<CartLineView> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (CartItem item : cart.getItems()) {
            BigDecimal lineTotal = item.getBook().getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            total = total.add(lineTotal);
            lines.add(new CartLineView(
                    item.getBook().getId(),
                    item.getBook().getTitle(),
                    item.getBook().getPrice(),
                    item.getQuantity(),
                    lineTotal));
        }
        return new CartView(cart.getId(), cart.getUser().getId(), cart.getUser().getDisplayName(), lines, total);
    }
}
