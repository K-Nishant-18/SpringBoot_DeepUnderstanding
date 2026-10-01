package com.example.bookstore.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartView(
        Long cartId,
        Long userId,
        String displayName,
        List<CartLineView> lines,
        BigDecimal total) {
}
