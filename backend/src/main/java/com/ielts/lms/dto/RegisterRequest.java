package com.ielts.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @Size(max = 100, message = "Họ và tên không được vượt quá 100 ký tự")
    private String fullName;

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 4, max = 30, message = "Tên đăng nhập phải có từ 4 đến 30 ký tự")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Tên đăng nhập chỉ được chứa chữ cái không dấu, số và dấu gạch dưới")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, max = 32, message = "Mật khẩu phải có độ dài từ 8 đến 32 ký tự")
    @Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d)\\S+$", message = "Mật khẩu phải chứa ít nhất 1 chữ cái, 1 chữ số và không chứa khoảng trắng")
    private String password;
}