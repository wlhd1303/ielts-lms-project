# Bước 1: Dùng image Maven với OpenJDK 25 để build dự án
FROM maven:3.9.9-openjdk-25-slim AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Bước 2: Dùng image OpenJDK 25 siêu nhẹ để chạy file jar
FROM openjdk:25-ea-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]