# Bước 1: Dùng OpenJDK 21 LTS và cài thêm maven
FROM openjdk:21-slim AS build
RUN apt-get update && apt-get install -y maven

WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Bước 2: Khởi chạy ứng dụng với Java 21 siêu nhẹ
FROM openjdk:21-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]