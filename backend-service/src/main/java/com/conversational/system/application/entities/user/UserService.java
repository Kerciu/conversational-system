package com.conversational.system.application.entities.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.conversational.system.application.authentication.AuthenticationService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final AuthenticationService authenticationService;
    private final PasswordEncoder passwordEncoder;

    public void deleteUser(User user) {
        try {
            userRepository.deleteById(user.getId());
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage());
        }
    }

    public void changeEmail(User user, String newEmail) {
        try {
            authenticationService.verifyEmail(newEmail);
            authenticationService.verifyEmailUnique(newEmail);
            user.setEmail(newEmail);
            userRepository.save(user);
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage());
        }
    }

    public void changeUsername(User user, String newUsername) {
        try {
            authenticationService.verifyUsernameUnique(newUsername);
            user.setUsername(newUsername);
            userRepository.save(user);
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage());
        }
    }

    public void changePassword(User user, String currentPassword, String newPassword) {
        try {
            if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())){
                throw new RuntimeException("Invalid password provided.");
            }
            System.out.print("Correct Password");
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            userRepository.save(user);
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage());
        }
    }
}