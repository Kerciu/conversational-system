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
    private static final String GITHUB_EMAILS_API_URL = "https://api.github.com/user/emails";
    

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
        return username != null ? username : oAuth2User.getName(); // Fallback to default name if 'name' attribute is missing
    }

    private String fetchGitHubPrimaryEmail(String registrationId, String principalName, OAuth2User oAuth2User) {
        /* Retrieves the primary email from GitHub OAuth2 authentication.
        * Unlike Google, GitHub does not include email in the default OAuth2User attributes.
        * We must make a separate API call to /user/emails endpoint to fetch all emails,
        * then extract the primary one from the returned list. */
        try {
            String accessToken = getGitHubAccessToken(registrationId, principalName);
            List<Map<String, Object>> emails = fetchEmailsFromGitHub(accessToken);
            return extractPrimaryEmail(emails, oAuth2User);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch email from GitHub API.\nDetails: " + e.getMessage());
        }
    }

    private String getGitHubAccessToken(String registrationId, String principalName) {
        OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient( registrationId, principalName );
        if (client == null) 
            throw new RuntimeException("Unable to retrieve GitHub access token for user: " + principalName );        
        return client.getAccessToken().getTokenValue();
    }

    private List<Map<String, Object>> fetchEmailsFromGitHub(String accessToken) {
        /* Fetches all email addresses associated with the GitHub user account.
         * GitHub users can have multiple emails; we retrieve the full list to identify the primary one. */
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<?> entity = new HttpEntity<>(headers);
        
        RestTemplate restTemplate = new RestTemplate();
        ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
            GITHUB_EMAILS_API_URL,
            HttpMethod.GET,
            entity,
            new ParameterizedTypeReference<List<Map<String, Object>>>() {}
        );
        
        List<Map<String, Object>> emails = response.getBody();
        
        if (emails == null || emails.isEmpty()) 
            throw new RuntimeException( "GitHub did not return any email addresses." );
        return emails;
    }

    private String extractPrimaryEmail(List<Map<String, Object>> emails, OAuth2User oAuth2User) {
        return emails.stream()
                .filter(this::isPrimary)
                .map(emailData -> (String) emailData.get("email"))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No primary email found in GitHub account. " ));
    }

    private boolean isPrimary(Map<String, Object> emailData) {
        return Boolean.TRUE.equals(emailData.get("primary"));
    }
}

