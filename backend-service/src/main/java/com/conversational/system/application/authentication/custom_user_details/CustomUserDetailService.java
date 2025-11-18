package com.conversational.system.application.authentication.custom_user_details;

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
        if (userOpt.isEmpty()) 
            throw new UsernameNotFoundException("User " + username +" was not found.");
        
        return new CustomUserDetails(userOpt.get());
    }
}