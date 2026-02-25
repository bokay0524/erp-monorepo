package com.erp.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import jakarta.annotation.PostConstruct;

/**
 * http 요청 규칙
 * /api/auth/login api는 토큰 정보가 없어도 접근 가능
 * 나머지 api는 토큰 정보 확인
 */
@Configuration
public class SecurityConfig {

    @Value("${app.jwt.secret}")
    private String secret;

    @PostConstruct
    public void check() {
        System.out.println("### SecurityConfig LOADED ###");
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())

                // 🔥 기본 로그인 방식 전부 제거
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .logout(l -> l.disable())

                // 🔥 이게 핵심: Basic 팝업 완전 차단
                .exceptionHandling(e ->
                        e.authenticationEntryPoint(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)
                        )
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login").permitAll()
                        .anyRequest().authenticated()
                )

                .addFilterBefore(
                        new JwtAuthFilter(secret),
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }
}
