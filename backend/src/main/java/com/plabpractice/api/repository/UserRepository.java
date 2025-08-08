package com.plabpractice.api.repository;

import com.plabpractice.api.model.User;
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

        // Cleanup helpers
        @Query("SELECT u FROM User u WHERE u.resetToken IS NOT NULL AND u.resetTokenExpiry < :now")
        List<User> findUsersWithExpiredResetTokens(@Param("now") LocalDateTime now);

        // Admin user management queries
        @Query(value = "SELECT * FROM users u WHERE " +
                        "(:role IS NULL OR u.role = :role) AND " +
                        "(:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "ORDER BY u.id OFFSET :offset ROWS FETCH FIRST :limit ROWS ONLY", nativeQuery = true)
        List<User> findUsersWithFilters(@Param("role") String role,
                        @Param("search") String search,
                        @Param("offset") int offset,
                        @Param("limit") int limit);

        @Query(value = "SELECT COUNT(*) FROM users u WHERE " +
                        "(:role IS NULL OR u.role = :role) AND " +
                        "(:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))", nativeQuery = true)
        long countUsersWithFilters(@Param("role") String role,
                        @Param("search") String search);

        List<User> findByRole(User.Role role);

        @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
        long countByRole(@Param("role") User.Role role);
}