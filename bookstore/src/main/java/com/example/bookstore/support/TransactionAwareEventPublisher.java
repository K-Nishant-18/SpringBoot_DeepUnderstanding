package com.example.bookstore.support;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class TransactionAwareEventPublisher {

    private static final Logger LOG = LoggerFactory.getLogger(TransactionAwareEventPublisher.class);

    private final ApplicationEventPublisher delegate;

    public TransactionAwareEventPublisher(ApplicationEventPublisher delegate) {
        this.delegate = delegate;
    }

    public void publishEvent(Object event) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            LOG.debug("no transaction in progress, publishing {} immediately", event.getClass().getSimpleName());
            delegate.publishEvent(event);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                LOG.info("transaction committed, publishing {} now", event.getClass().getSimpleName());
                delegate.publishEvent(event);
            }

            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    LOG.warn("transaction rolled back, dropping {}", event.getClass().getSimpleName());
                }
            }
        });
    }
}
