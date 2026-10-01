package com.example.bookstore.support;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class TransactionProbe {

    private final List<String> advised = Collections.synchronizedList(new ArrayList<>());

    private final List<String> bypassed = Collections.synchronizedList(new ArrayList<>());

    public void recordAdvice(String method) {
        advised.add(method);
    }

    public void recordSelfInvocation(String method) {
        bypassed.add(method);
    }

    public int adviceCount() {
        return advised.size();
    }

    public List<String> advisedMethods() {
        return List.copyOf(advised);
    }

    public int bypassedCount() {
        return bypassed.size();
    }

    public List<String> bypassedMethods() {
        return List.copyOf(bypassed);
    }

    public void reset() {
        advised.clear();
        bypassed.clear();
    }
}
