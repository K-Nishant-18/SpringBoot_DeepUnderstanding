package com.example.bookstore.service;

import com.example.bookstore.config.BookstoreProperties;
import com.example.bookstore.domain.Book;
import com.example.bookstore.domain.BookItem;
import com.example.bookstore.domain.Order;
import com.example.bookstore.domain.OrderStatus;
import com.example.bookstore.domain.Payment;
import com.example.bookstore.domain.User;
import com.example.bookstore.error.InsufficientStockException;
import com.example.bookstore.error.ResourceNotFoundException;
import com.example.bookstore.outbox.OutboxEvent;
import com.example.bookstore.repository.BookItemRepository;
import com.example.bookstore.repository.BookRepository;
import com.example.bookstore.repository.OrderRepository;
import com.example.bookstore.repository.UserRepository;
import com.example.bookstore.support.TransactionProbe;
import com.example.bookstore.web.OrderViewMapper;
import com.example.bookstore.web.dto.OrderLineRequest;
import com.example.bookstore.web.dto.OrderView;
import com.example.bookstore.web.dto.PlaceOrderRequest;
import com.example.bookstore.web.dto.TransactionReport;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class OrderService {

    public static final String MODE_REQUIRED = "required";

    public static final String MODE_REQUIRES_NEW = "requires-new";

    public static final String MODE_POISON = "poison";

    private final UserRepository userRepository;

    private final BookRepository bookRepository;

    private final BookItemRepository bookItemRepository;

    private final OrderRepository orderRepository;

    private final StockService stockService;

    private final OutboxService outboxService;

    private final TransactionProbe probe;

    private final BookstoreProperties properties;

    public OrderService(UserRepository userRepository,
                        BookRepository bookRepository,
                        BookItemRepository bookItemRepository,
                        OrderRepository orderRepository,
                        StockService stockService,
                        OutboxService outboxService,
                        TransactionProbe probe,
                        BookstoreProperties properties) {
        this.userRepository = userRepository;
        this.bookRepository = bookRepository;
        this.bookItemRepository = bookItemRepository;
        this.orderRepository = orderRepository;
        this.stockService = stockService;
        this.outboxService = outboxService;
        this.probe = probe;
        this.properties = properties;
    }

    @Transactional
    public TransactionReport placeOrder(PlaceOrderRequest request, String mode) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("user " + request.userId() + " not found"));
        Order order = new Order(user, Instant.now(), properties.getCatalog().getCurrency());
        List<Long> claimedCopyIds = new ArrayList<>();
        boolean innerFailureCaught = false;
        for (OrderLineRequest line : request.lines()) {
            if (MODE_POISON.equals(mode)) {
                innerFailureCaught = triggerInnerRollbackOnly(line.bookItemId());
                continue;
            }
            ClaimedCopy claimed = MODE_REQUIRES_NEW.equals(mode)
                    ? stockService.reserveCopyInNewTransaction(line.bookItemId())
                    : stockService.reserveCopy(line.bookItemId());
            Book book = bookRepository.findById(claimed.bookId())
                    .orElseThrow(() -> new ResourceNotFoundException("book " + claimed.bookId() + " not found"));
            BookItem copy = bookItemRepository.findById(claimed.bookItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("copy " + claimed.bookItemId() + " not found"));
            order.addItem(book, copy, line.quantity(), book.getPrice());
            claimedCopyIds.add(claimed.bookItemId());
        }
        if (MODE_POISON.equals(mode)) {
            return report(order, null, mode, innerFailureCaught);
        }
        applyOrderDiscount(order);
        BigDecimal total = order.recalculateTotal();
        orderRepository.saveAndFlush(order);
        Payment payment = new Payment(order, total, request.paymentReference());
        payment.capture(request.paymentReference() + "-captured", Instant.now());
        order.setPayment(payment);
        order.setStatus(OrderStatus.PAID);
        orderRepository.save(order);
        OutboxEvent outboxEvent = outboxService.recordOrderPlaced(order, claimedCopyIds);
        return report(order, outboxEvent, mode, innerFailureCaught);
    }

    @Transactional
    public BigDecimal applyOrderDiscount(Order order) {
        probe.recordSelfInvocation("OrderService.applyOrderDiscount");
        return order.recalculateTotal();
    }

    @Transactional(readOnly = true)
    public OrderView findOrder(Long orderId) {
        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("order " + orderId + " not found"));
        return OrderViewMapper.toView(order);
    }

    @Transactional(readOnly = true)
    public List<OrderView> findOrdersByUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("user " + userId + " not found");
        }
        return orderRepository.findByUserIdWithDetails(userId).stream().map(OrderViewMapper::toView).toList();
    }

    private boolean triggerInnerRollbackOnly(Long bookItemId) {
        try {
            stockService.rejectCopy(bookItemId);
            return false;
        } catch (InsufficientStockException expected) {
            return true;
        }
    }

    private TransactionReport report(Order order, OutboxEvent outboxEvent, String mode, boolean innerFailureCaught) {
        return new TransactionReport(
                order.getId(),
                outboxEvent == null ? null : outboxEvent.getId(),
                mode,
                probe.adviceCount(),
                probe.bypassedCount(),
                TransactionSynchronizationManager.isActualTransactionActive(),
                innerFailureCaught,
                probe.advisedMethods(),
                probe.bypassedMethods());
    }
}
