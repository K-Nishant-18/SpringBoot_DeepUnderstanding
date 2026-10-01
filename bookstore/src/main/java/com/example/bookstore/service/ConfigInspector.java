package com.example.bookstore.service;

import com.example.bookstore.config.BookstoreProperties;
import com.example.bookstore.config.RelayProperties;
import com.example.bookstore.web.dto.ConfigView;
import com.example.bookstore.web.dto.SettingsView;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

@Service
public class ConfigInspector {

    private final ConfigurableEnvironment environment;

    private final BookstoreProperties properties;

    private final RelayProperties relayProperties;

    private final ThreadPoolTaskExecutor taskExecutor;

    public ConfigInspector(ConfigurableEnvironment environment,
                           BookstoreProperties properties,
                           RelayProperties relayProperties,
                           @Qualifier("bookstoreTaskExecutor") ThreadPoolTaskExecutor taskExecutor) {
        this.environment = environment;
        this.properties = properties;
        this.relayProperties = relayProperties;
        this.taskExecutor = taskExecutor;
    }

    public ConfigView describe(String key) {
        Map<String, String> layers = new LinkedHashMap<>();
        for (PropertySource<?> source : environment.getPropertySources()) {
            if (source.containsProperty(key)) {
                layers.put(source.getName(), String.valueOf(source.getProperty(key)));
            }
        }
        String winner = layers.isEmpty() ? null : layers.keySet().iterator().next();
        return new ConfigView(
                key,
                toEnvironmentVariable(key),
                toCamelCase(key),
                environment.getProperty(key, String.class),
                winner,
                layers.size(),
                List.of(environment.getActiveProfiles()),
                layers);
    }

    public SettingsView settings() {
        return new SettingsView(
                properties.getCatalog().getDefaultPageSize(),
                properties.getCatalog().getMaxPageSize(),
                properties.getCatalog().getCurrency(),
                properties.getOrders().getLowStockThreshold(),
                properties.getOrders().getOutboxRelayDelayMs(),
                properties.getOrders().getOutboxBatchSize(),
                taskExecutor.getCorePoolSize(),
                taskExecutor.getMaxPoolSize(),
                taskExecutor.getQueueCapacity(),
                relayProperties.getTopic(),
                List.of(taskExecutor.getThreadNamePrefix() + "1"));
    }

    static String toEnvironmentVariable(String key) {
        return key.replace('.', '_').replace('-', '_').toUpperCase();
    }

    static String toCamelCase(String key) {
        StringBuilder camel = new StringBuilder();
        boolean upperNext = false;
        for (char character : key.toCharArray()) {
            if (character == '.' || character == '-') {
                upperNext = true;
                continue;
            }
            camel.append(upperNext ? Character.toUpperCase(character) : character);
            upperNext = false;
        }
        return camel.toString();
    }
}
