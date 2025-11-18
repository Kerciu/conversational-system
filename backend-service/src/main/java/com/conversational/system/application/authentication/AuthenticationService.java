package com.conversational.system.application.authentication;
import java.util.Optional;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import com.conversational.system.application.authentication.json_web_token.JwtService;
import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;
import com.google.api.client.util.Value;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthenticationService { 
    @Value("${BACKEND_GOOGLE_CLIENT_ID}") 
    private String googleClientId;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final OAuth2Service oauth2Service;



    public void registerUser(String username, String email, String password) {
        verifyEmail(email);
        verifyUsernameEmailAreUnique(username, email);
        User newUser = new User(email, username, passwordEncoder.encode(password));
        userRepository.save(newUser);
        sendVerificationEmail(newUser);
    }

    public String loginUser(String username, String password) {
        if (username == null || username.isBlank()) throw new IllegalArgumentException("Username cannot be blank.");
        if (password == null || password.isBlank()) throw new IllegalArgumentException("Password cannot be blank.");
        try {
            Authentication authentication = UsernamePasswordAuthenticationToken.unauthenticated(username, password );
            authentication = authenticationManager.authenticate(authentication);
            return jwtService.generateJWToken(username);
        }
        catch (DisabledException  e) {
            throw new RuntimeException("Account is not verified for user " + username + ".\nPlease verify your email before logging in.");
        }
        catch (AuthenticationException  e) {
            throw new RuntimeException("Authentication failed for user " + username + ".\n" + e.getMessage());
        }
    }
    
    public String authenticateOAuth2User(Authentication authentication){
        System.out.println("OAuth2 Authentication");
        if (!(authentication instanceof OAuth2AuthenticationToken oAuth2Token)) 
                throw new RuntimeException("Expected OAuth2AuthenticationToken but received: " + authentication.getClass().getSimpleName());

            try {
                OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
                String provider = oAuth2Token.getAuthorizedClientRegistrationId(); // "google" lub "github"

                String email = oauth2Service.extractEmail(oAuth2User, provider, oAuth2Token.getName());
                String username = oauth2Service.extractUsername(oAuth2User, provider);     
                
                User user = findOrCreateOauthUser(email, username);
                return jwtService.generateJWToken(user.getUsername());
            }
            catch (OAuth2AuthenticationException e) {
                throw e;
            }
            catch (Exception e) {
                throw new RuntimeException("Exception occured during OAuth2 authentication process.\n" +e.getMessage());
            }
    }

    private User findOrCreateOauthUser(String email, String username) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> {
                    verifyEmail(email);
                    verifyUsernameEmailAreUnique(username, email);
                    User newUser = new User(email, username, null);
                    return userRepository.save(newUser);
                });
    }
    
    private void verifyEmail(String email) {
        String emailRegex = "^(?=.{1,64}@)[A-Za-z0-9_-]+(\\.[A-Za-z0-9_-]+)*@[^-][A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*(\\.[A-Za-z]{2,})$";
        if(email == null || !email.matches(emailRegex)) throw new RuntimeException("Provided email address ("+email+") is incorrect.");
    }

    private void verifyUsernameEmailAreUnique(String username, String email) {
        Optional<User> userOptionalEmail = userRepository.findByEmail(email);
        if (userOptionalEmail.isPresent()) throw new RuntimeException("Email " + email + " already taken.");

        Optional<User> userOptionalUsername = userRepository.findByUsername(username);
        if (userOptionalUsername.isPresent()) throw new RuntimeException("Username " + username + " already taken.");
    }
    
    private void sendVerificationEmail(User user) {
        // to be implemented 
    }

}