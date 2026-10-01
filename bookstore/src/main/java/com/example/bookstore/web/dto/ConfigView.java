package com.example.bookstore.web.dto;

import java.util.List;
import java.util.Map;

public record ConfigView(
        String key,
        String environmentVariable,
        String camelCase,
        String effectiveValue,
        String winningPropertySource,
        int definingSources,
        List<String> activeProfiles,
        Map<String, String> layersHighestFirst) {
}
