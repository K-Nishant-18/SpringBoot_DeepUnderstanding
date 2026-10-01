package com.example.bookstore.web;

import com.example.bookstore.error.ConflictException;
import com.example.bookstore.error.InsufficientStockException;
import com.example.bookstore.error.ResourceNotFoundException;
import com.example.bookstore.error.ServiceUnavailableException;
import com.example.bookstore.support.ExecutionContext;
import com.example.bookstore.support.TransactionProbe;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private static final String PROBLEM_BASE = "https://bookstore.example.com/problems/";

    private final TransactionProbe transactionProbe;

    public ApiExceptionHandler(TransactionProbe transactionProbe) {
        this.transactionProbe = transactionProbe;
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException exception, HttpServletRequest request) {
        ProblemDetail problem = problem(HttpStatus.NOT_FOUND, "not-found", exception.getMessage(), request);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleBodyValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<Map<String, String>> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(ApiExceptionHandler::describeFieldError)
                .toList();
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "validation-failed", "the request body is not valid", request);
        problem.setProperty("errors", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleParameterValidation(ConstraintViolationException exception, HttpServletRequest request) {
        List<Map<String, String>> errors = new ArrayList<>();
        for (ConstraintViolation<?> violation : exception.getConstraintViolations()) {
            errors.add(Map.of(
                    "field", violation.getPropertyPath().toString(),
                    "message", violation.getMessage()));
        }
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "constraint-violation", "a request parameter is not valid", request);
        problem.setProperty("errors", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler({ConflictException.class, InsufficientStockException.class})
    public ResponseEntity<ProblemDetail> handleConflict(RuntimeException exception, HttpServletRequest request) {
        ProblemDetail problem = problem(HttpStatus.CONFLICT, "conflict", exception.getMessage(), request);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(ServiceUnavailableException.class)
    public ResponseEntity<ProblemDetail> handleUnavailable(ServiceUnavailableException exception, HttpServletRequest request) {
        ProblemDetail problem = problem(HttpStatus.SERVICE_UNAVAILABLE, "service-unavailable", exception.getMessage(), request);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(problem);
    }

    @ExceptionHandler(org.springframework.transaction.UnexpectedRollbackException.class)
    public ResponseEntity<ProblemDetail> handleUnexpectedRollback(RuntimeException exception, HttpServletRequest request) {
        ProblemDetail problem = problem(HttpStatus.CONFLICT, "unexpected-rollback",
                "an inner participating transaction marked the outer transaction rollback-only", request);
        problem.setProperty("adviceApplied", transactionProbe.adviceCount());
        problem.setProperty("selfInvocationsBypassed", transactionProbe.bypassedCount());
        problem.setProperty("bypassedMethods", transactionProbe.bypassedMethods());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception exception, HttpServletRequest request) {
        LOG.error("unhandled failure for {}", request.getRequestURI(), exception);
        ProblemDetail problem = problem(HttpStatus.INTERNAL_SERVER_ERROR, "internal-error",
                "the request could not be completed", request);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }

    private static Map<String, String> describeFieldError(FieldError fieldError) {
        Map<String, String> described = new LinkedHashMap<>();
        described.put("field", fieldError.getField());
        described.put("message", fieldError.getDefaultMessage() == null ? "is invalid" : fieldError.getDefaultMessage());
        return described;
    }

    private static ProblemDetail problem(HttpStatus status, String type, String detail, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(status.getReasonPhrase());
        problem.setType(URI.create(PROBLEM_BASE + type));
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("correlationId", ExecutionContext.requestCorrelationId());
        return problem;
    }
}
