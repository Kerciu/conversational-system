package com.conversational.system.application.security.custom_user_details;

import java.util.Optional;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailService implements UserDetailsService {
    private final UserRepository userRepository;

    
    @Override
    public CustomUserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Optional<User> userOpt = userRepository
                                    .findByUsername(username);
                                    // .orElseThrow(() -> new UsernameNotFoundException("Customer details not found for the customer: " + username))
        if (userOpt.isEmpty()) 
            throw new UsernameNotFoundException("User " + username +" was not found.");
        
        // tu też można użyć gotowej klasy User z Spring Security
        return new CustomUserDetails(userOpt.get());
    }
}