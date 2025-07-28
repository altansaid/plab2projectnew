plugins {
    id("java")
    id("org.springframework.boot") version "3.2.1"
    id("io.spring.dependency-management") version "1.1.4"
}

// Spring Boot configuration
springBoot {
    mainClass = "com.plabpractice.api.PlabPracticeApplication"
}

// Production optimizations
configurations.all {
    resolutionStrategy.cacheChangingModulesFor(0, "seconds")
    resolutionStrategy.cacheDynamicVersionsFor(0, "seconds")
}

group = "com.plabpractice"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-websocket")
    implementation("org.flywaydb:flyway-core")
    implementation("org.postgresql:postgresql")
    
    // JWT dependencies
    implementation("io.jsonwebtoken:jjwt-api:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.11.5")
    
    // Lombok
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
    
    // Development tools
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    
    // Test dependencies
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
    maxHeapSize = "1g"
    jvmArgs("-XX:+UseG1GC", "-XX:MaxMetaspaceSize=256m")
}

// Production jar optimization
tasks.jar {
    enabled = false
    archiveClassifier = ""
}

tasks.bootJar {
    archiveClassifier = ""
    launchScript()
}

// JVM optimization for Spring Boot run
tasks.bootRun {
    jvmArgs("-XX:+UseG1GC", "-XX:MaxMetaspaceSize=256m", "-Xmx1g")
    
    // Set development profile by default
    args("--spring.profiles.active=dev")
    
    // Ensure development environment variables are set
    environment["JWT_SECRET"] = System.getenv("JWT_SECRET") ?: "dev_jwt_secret_key_for_development_only_not_for_production"
    environment["DATABASE_USERNAME"] = System.getenv("DATABASE_USERNAME") ?: "plabuser"
    environment["DATABASE_PASSWORD"] = System.getenv("DATABASE_PASSWORD") ?: ""
} 