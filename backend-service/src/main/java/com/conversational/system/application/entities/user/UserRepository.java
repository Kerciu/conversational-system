package com.conversational.system.application.entities.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;


@Repository
public interface UserRepository extends JpaRepository<User, Integer>{
    public Optional<User> findByUsername(String username);
    public Optional<User> findByEmail(String email);
    public Optional<User> findById(Integer id);
    public User save(String email); 
    public Optional<User> findByPasswordResetCode_Code(String code);
}