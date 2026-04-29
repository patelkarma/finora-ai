package com.project.financeDashboard.service;

import com.project.financeDashboard.model.Insight;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.InsightRepository;
import com.project.financeDashboard.service.llm.LlmService;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class InsightsService {

    private final InsightRepository insightRepository;
    private final LlmService llmService;

    public InsightsService(InsightRepository insightRepository, LlmService llmService) {
        this.insightRepository = insightRepository;
        this.llmService = llmService;
    }

    public Insight generateAndSaveAIInsight(User user, String prompt) {
        String aiResponse = llmService.generate(prompt);

        Insight insight = new Insight();
        insight.setUser(user);
        insight.setMessage(aiResponse);
        insight.setRead(false);
        return insightRepository.save(insight);
    }

    public Insight saveInsight(@NonNull Insight insight) {
        return insightRepository.save(insight);
    }

    public List<Insight> getInsightsForUser(User user) {
        return insightRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public List<Insight> getInsightsByUser(Long userId) {
        return insightRepository.findByUserId(userId);
    }

    public void markRead(@NonNull Long id) {
        Optional<Insight> opt = insightRepository.findById(id);
        opt.ifPresent(i -> {
            i.setRead(true);
            insightRepository.save(i);
        });
    }
}
