package com.plabpractice.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EntityScan("com.plabpractice.api.model")
@EnableJpaRepositories("com.plabpractice.api.repository")
@EnableScheduling
public class PlabPracticeApplication {
    public static void main(String[] args) {
        SpringApplication.run(PlabPracticeApplication.class, args);
    }
}