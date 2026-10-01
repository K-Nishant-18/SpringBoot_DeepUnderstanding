package com.example.bookstore.web;

import com.example.bookstore.error.ServiceUnavailableException;
import com.example.bookstore.service.ConfigInspector;
import com.example.bookstore.service.ReceiptService;
import com.example.bookstore.support.ExecutionContext;
import com.example.bookstore.support.TransactionProbe;
import com.example.bookstore.web.dto.AsyncReceiptView;
import com.example.bookstore.web.dto.ConfigView;
import com.example.bookstore.web.dto.SettingsView;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    private static final long RECEIPT_TIMEOUT_SECONDS = 5L;

    private final ReceiptService receiptService;

    private final TransactionProbe transactionProbe;

    private final ConfigInspector configInspector;

    public SystemController(ReceiptService receiptService, TransactionProbe transactionProbe, ConfigInspector configInspector) {
        this.receiptService = receiptService;
        this.transactionProbe = transactionProbe;
        this.configInspector = configInspector;
    }

    @PostMapping("/receipts")
    public AsyncReceiptView issueReceipt(@RequestParam Long orderId) {
        String callerThread = Thread.currentThread().getName();
        String callerCorrelationId = ExecutionContext.requestCorrelationId();
        try {
            return receiptService.issueReceipt(orderId, callerThread, callerCorrelationId)
                    .get(RECEIPT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ServiceUnavailableException("the request thread was interrupted while waiting for the receipt", exception);
        } catch (ExecutionException | TimeoutException exception) {
            throw new ServiceUnavailableException("the receipt did not arrive within " + RECEIPT_TIMEOUT_SECONDS + " seconds", exception);
        }
    }

    @PostMapping("/receipts/async-failure")
    public ResponseEntity<Map<String, String>> failSilently(@RequestParam Long orderId) {
        receiptService.issueReceiptSilently(orderId);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of("status", "accepted",
                        "note", "the failure happens on a worker thread and only the log will show it"));
    }

    @GetMapping("/transaction-probe")
    public Map<String, Object> transactionProbe() {
        return Map.of(
                "adviceApplied", transactionProbe.adviceCount(),
                "advisedMethods", transactionProbe.advisedMethods(),
                "selfInvocationsBypassed", transactionProbe.bypassedCount(),
                "bypassedMethods", transactionProbe.bypassedMethods());
    }

    @GetMapping("/settings")
    public SettingsView settings() {
        return configInspector.settings();
    }

    @GetMapping("/config/{key}")
    public ConfigView config(@PathVariable String key) {
        return configInspector.describe(key);
    }

    @GetMapping("/precedence-layers")
    public List<String> precedenceLayers() {
        return List.of("defaults", "application.yml", "application-prod.yml", "environment variables", "command line args");
    }
}
