package com.example.bookstore.config;

import com.example.bookstore.support.ExecutionContext;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
public class CorrelationIdFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        String correlationId = httpRequest.getHeader("X-Correlation-Id");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        httpRequest.setAttribute(ExecutionContext.CORRELATION_ID, correlationId);
        httpResponse.setHeader("X-Correlation-Id", correlationId);
        MDC.put(ExecutionContext.MDC_KEY, correlationId);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(httpRequest, httpResponse));
        try {
            chain.doFilter(request, response);
        } finally {
            RequestContextHolder.resetRequestAttributes();
            MDC.remove(ExecutionContext.MDC_KEY);
        }
    }
}
