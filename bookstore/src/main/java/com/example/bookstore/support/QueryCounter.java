package com.example.bookstore.support;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.springframework.stereotype.Component;

@Component
public class QueryCounter {

    private final Statistics statistics;

    public QueryCounter(EntityManagerFactory entityManagerFactory) {
        this.statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        this.statistics.setStatisticsEnabled(true);
    }

    public long reset() {
        long before = statistics.getPrepareStatementCount();
        statistics.clear();
        return before;
    }

    public long count() {
        return statistics.getPrepareStatementCount();
    }
}
