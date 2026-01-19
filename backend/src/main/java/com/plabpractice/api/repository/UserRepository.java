package com.plabpractice.api.repository;

import com.plabpractice.api.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

        Optional<User> findByEmail(String email);

        boolean existsByEmail(String email);

        Optional<User> findByGoogleId(String googleId);

        Optional<User> findByResetToken(String resetToken);

        // Supabase Auth integration
        Optional<User> findBySupabaseId(String supabaseId);

        // Cleanup helpers
        @Query("SELECT u FROM User u WHERE u.resetToken IS NOT NULL AND u.resetTokenExpiry < :now")
        List<User> findUsersWithExpiredResetTokens(@Param("now") LocalDateTime now);

        // Paginated queries with sorting for admin panel
        Page<User> findByRole(User.Role role, Pageable pageable);
        
        Page<User> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
                String name, String email, Pageable pageable);
        
        Page<User> findByRoleAndNameContainingIgnoreCaseOrRoleAndEmailContainingIgnoreCase(
                User.Role role1, String name, User.Role role2, String email, Pageable pageable);

        // Legacy queries (kept for backward compatibility)
        List<User> findByRole(User.Role role);

        @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
        long countByRole(@Param("role") User.Role role);
}