package com.example.bookstore.config;

import com.example.bookstore.support.TransactionProbe;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class TransactionProbeAspect {

    private final TransactionProbe probe;

    public TransactionProbeAspect(TransactionProbe probe) {
        this.probe = probe;
    }

    @Around("@annotation(org.springframework.transaction.annotation.Transactional)")
    public Object observeTransactionAdvice(ProceedingJoinPoint joinPoint) throws Throwable {
        probe.recordAdvice(joinPoint.getSignature().getName());
        return joinPoint.proceed();
    }
}
