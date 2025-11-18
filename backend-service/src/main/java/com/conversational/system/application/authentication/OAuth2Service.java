package com.conversational.system.application.authentication;

import java.util.List;
import java.util.Map;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OAuth2Service {
    private final OAuth2AuthorizedClientService authorizedClientService;
    
    public String extractEmail(OAuth2User oAuth2User, String provider, String principalName) {
        return switch (provider.toLowerCase()) {
            case "google"    -> oAuth2User.getAttribute("email");
            case "github"    -> fetchGitHubPrimaryEmail(provider, principalName, oAuth2User);
            default          -> throw new IllegalArgumentException("Invalid provider: " + provider);
        };
    }

    public String extractUsername(OAuth2User oAuth2User, String provider) {
        String attributeName = switch (provider.toLowerCase()) {
            case "google" -> "name";
            case "github" -> "login";
            default -> throw new IllegalArgumentException("Invalid provider: " + provider);
        };
        
        String username = oAuth2User.getAttribute(attributeName);
        return username != null ? username : oAuth2User.getName();
    }


    private String fetchGitHubPrimaryEmail(String registrationId, String principalName, OAuth2User oAuth2User) {
        try {
            OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(registrationId, principalName);
            
            if (client == null) {
                throw new RuntimeException(
                    "Nie można pobrać access tokena GitHub dla użytkownika: " + principalName
                );
            }
            
            String accessToken = client.getAccessToken().getTokenValue();
            
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<?> entity = new HttpEntity<>(headers);
            
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                "https://api.github.com/user/emails",
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            
            if (response.getBody() == null || response.getBody().isEmpty()) {
                String login = oAuth2User.getAttribute("login");
                throw new RuntimeException(
                    "GitHub nie zwrócił żadnych adresów email. Login: " + login + ". " +
                    "Upewnij się, że masz dodany i zweryfikowany email w ustawieniach GitHub."
                );
            }
            
            return response.getBody()
                    .stream()
                    .filter(emailData -> 
                        Boolean.TRUE.equals(emailData.get("primary")) && 
                        Boolean.TRUE.equals(emailData.get("verified"))
                    )
                    .map(emailData -> (String) emailData.get("email"))
                    .findFirst()
                    .orElseThrow(() -> {
                        String login = oAuth2User.getAttribute("login");
                        return new RuntimeException(
                            "Nie znaleziono zweryfikowanego emaila w GitHub. " +
                            "Upewnij się, że masz oznaczony primary i verified email w ustawieniach GitHub."
                        );
                    });
            
        } catch (Exception e) {
            if (e instanceof RuntimeException) {
                throw e; // Przepuść nasze wyjątki
            }
            String login = oAuth2User.getAttribute("login");
            throw new RuntimeException(
                "Błąd podczas pobierania emaila z GitHub API. Login: " + login + ". " +
                "Szczegóły: " + e.getMessage()
            );
        }
    }
}

