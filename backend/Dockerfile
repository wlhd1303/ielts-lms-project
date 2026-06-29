# Bước 1: Dùng OpenJDK 25 gốc và cài thêm maven
FROM openjdk:25-ea-slim AS build
RUN apt-get update && apt-get install -y maven

WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Bước 2: Khởi chạy ứng dụng với Java 25 siêu nhẹ
FROM openjdk:25-ea-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]