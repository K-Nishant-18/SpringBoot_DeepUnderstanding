package com.example.bookstore.config;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.core.task.TaskExecutor;

@Configuration
public class AsyncErrorHandlingConfig implements AsyncConfigurer {

    private static final Logger LOG = LoggerFactory.getLogger(AsyncErrorHandlingConfig.class);

    private final TaskExecutor taskExecutor;

    public AsyncErrorHandlingConfig(@Qualifier("bookstoreTaskExecutor") TaskExecutor taskExecutor) {
        this.taskExecutor = taskExecutor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return taskExecutor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (throwable, method, params) -> LOG.error("async void method {} failed and no caller can see it", describe(method), throwable);
    }

    private String describe(Method method) {
        return method.getDeclaringClass().getSimpleName() + "#" + method.getName();
    }
}
