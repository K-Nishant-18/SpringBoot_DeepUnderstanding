package com.example.bookstore.web;

import com.example.bookstore.service.OrderService;
import com.example.bookstore.support.TransactionProbe;
import com.example.bookstore.web.dto.OrderView;
import com.example.bookstore.web.dto.PlaceOrderRequest;
import com.example.bookstore.web.dto.TransactionReport;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    private final TransactionProbe transactionProbe;

    public OrderController(OrderService orderService, TransactionProbe transactionProbe) {
        this.orderService = orderService;
        this.transactionProbe = transactionProbe;
    }

    @PostMapping
    public ResponseEntity<TransactionReport> placeOrder(@Valid @RequestBody PlaceOrderRequest request,
                                                       @RequestParam(defaultValue = OrderService.MODE_REQUIRED) String mode) {
        transactionProbe.reset();
        TransactionReport report = orderService.placeOrder(request, mode);
        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }

    @GetMapping("/{orderId}")
    public OrderView byId(@PathVariable Long orderId) {
        return orderService.findOrder(orderId);
    }

    @GetMapping("/users/{userId}")
    public List<OrderView> byUser(@PathVariable Long userId) {
        return orderService.findOrdersByUser(userId);
    }
}
