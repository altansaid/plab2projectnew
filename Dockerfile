# Build
FROM gradle:8.11.1-jdk17 AS build
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle build --no-daemon

# Run
FROM openjdk:17-jdk-slim
COPY --from=build /home/gradle/src/build/libs/plab-0.0.1-SNAPSHOT.jar /app/plab.jar
EXPOSE 8080
CMD ["java", "-jar", "/app/plab.jar"]