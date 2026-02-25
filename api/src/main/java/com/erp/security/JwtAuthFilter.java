package com.erp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Frontend에서 Backend로 http요청을 보냈을 때,
 * 요청이 컨트롤러로 들어가기 전 먼저 실행되어
 * 요청 헤더에서 Authorizatio: Bearer 토큰을 찾음
 * 토큰 존재 시 검증(위조/만료 체크)
 * 검증 성공하면 Spring Security의 SecurityContext에 사용자 정보 입력
 * 그 다음 컨트롤러는 Authentication을 통해 사용자 정보 확인 가능
 * 
 * Servlet Filter(인터셉트 같은 역할)
 * SecurityFilterChain 안에서 동작
 */
public class JwtAuthFilter extends OncePerRequestFilter{
    
    private final byte[] secret;

    public JwtAuthFilter(String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String header = req.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length()).trim();
            try {
                Claims claims = Jwts.parser()
                        .verifyWith(Keys.hmacShaKeyFor(secret))
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                String epCode = claims.get("epCode", String.class);
                String epName = claims.get("epName", String.class);
                String teamCode = claims.get("teamCode", String.class);
                String teamName = claims.get("teamName", String.class);
                String busuCode = claims.get("busuCode", String.class);
                String busuName = claims.get("busuName", String.class);

                // principal에 필요한 것만 담기 (추후 team/busu도 넣고 싶으면 claim에 추가하면 됨)
                var principal = Map.<String, Object>of(
                        "epCode", epCode,
                        "epName", epName,
                        "teamCode", teamCode,
                        "teamName", teamName,
                        "busuCode", busuCode,
                        "busuName", busuName
                );

                var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception e) {
                SecurityContextHolder.clearContext(); // 토큰 이상하면 인증 없음
            }
        }

        chain.doFilter(req, res);
    }
}
