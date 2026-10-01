package com.example.bookstore.web;

import com.example.bookstore.service.CartService;
import com.example.bookstore.web.dto.AddToCartRequest;
import com.example.bookstore.web.dto.CartView;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/carts")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping("/{userId}")
    public CartView cart(@PathVariable Long userId) {
        return cartService.getCart(userId);
    }

    @PostMapping("/{userId}/items")
    public CartView addItem(@PathVariable Long userId, @Valid @RequestBody AddToCartRequest request) {
        return cartService.addToCart(userId, request);
    }
}
