# Bước 1: Build bằng Maven và Eclipse Temurin JDK 21 chính thức
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Bước 2: Khởi chạy ứng dụng với Eclipse Temurin JRE 21 siêu nhẹ
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]