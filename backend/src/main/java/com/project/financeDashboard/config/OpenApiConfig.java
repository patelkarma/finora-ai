package com.project.financeDashboard.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Value("${BACKEND_URL:http://localhost:8081}")
    private String backendUrl;

    @Bean
    public OpenAPI finoraOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("Finora AI — Personal Finance API")
                        .description("""
                                Backend API for Finora, an AI-powered personal finance dashboard.

                                **Auth model:** JWT bearer tokens. Obtain via `POST /api/auth/login` or the OAuth2 Google flow.
                                Click the **Authorize** button and paste the token (without the `Bearer ` prefix).
                                """)
                        .version("v1")
                        .contact(new Contact().name("Karma Patel").url("https://github.com/patelkarma"))
                        .license(new License().name("MIT")))
                .servers(List.of(
                        new Server().url(backendUrl).description("Current environment"),
                        new Server().url("http://localhost:8081").description("Local dev")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
