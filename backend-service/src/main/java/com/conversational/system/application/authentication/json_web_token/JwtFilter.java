package com.conversational.system.application.authentication.json_web_token;

import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

import io.jsonwebtoken.JwtException;
import io.micrometer.common.lang.NonNull;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private static final String AUTH_HEADER_NAME = "Authorization";
    private static final String AUTH_HEADER_PREFIX = "Bearer ";


    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws IOException, ServletException {
        
        String authenticationHeader = request.getHeader(AUTH_HEADER_NAME);
        if (!hasValidAuthorizationHeader(authenticationHeader)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String token = authenticationHeader.substring(AUTH_HEADER_PREFIX.length());
            String username = jwtService.extractUsername(token);
            if (shouldAuthenticateUser(username)) authenticateUser(token, username, request);
        } 
        catch (JwtException | IllegalArgumentException e) {
            System.err.println("Invalid JWT Token: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        catch (UsernameNotFoundException e) {
            System.err.println("User from token not found in the database: " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();                      
        return path.startsWith("/api/auth/register")
                || path.startsWith("/api/auth/login")
                || path.startsWith("/api/auth/oauth2/success")
                || path.startsWith("/oauth2")
                || path.startsWith("/login");
    }

    private boolean hasValidAuthorizationHeader(String authenticationHeader) {
        return authenticationHeader != null && authenticationHeader.startsWith(AUTH_HEADER_PREFIX);
    }

    private boolean shouldAuthenticateUser(String username) {
        return username != null && SecurityContextHolder.getContext().getAuthentication() == null;
    }

    private void authenticateUser(String token, String username, HttpServletRequest request) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

        if (jwtService.isTokenValid(token, userDetails.getUsername())) {
            UsernamePasswordAuthenticationToken authToken = createAuthenticationToken(userDetails, request);
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }
    }

    private UsernamePasswordAuthenticationToken createAuthenticationToken(UserDetails userDetails, HttpServletRequest request) {
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        return authToken;
    }
}
