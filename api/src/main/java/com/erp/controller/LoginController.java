package com.erp.controller;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.validation.Valid;
//import jakarta.validation.constraints.NotBlank;
//import lombok.Data;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
//import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.security.core.Authentication;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;


@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private final SqlSessionTemplate sqlSession;
    //private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    private final String issuer;
    private final byte[] secret;
    private final long accessTokenMinutes;

    public LoginController(
            SqlSessionTemplate sqlSession,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes
        ) {
        this.sqlSession = sqlSession;
        this.issuer = issuer;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.accessTokenMinutes = accessTokenMinutes;
    }
    
    /**
     * 로그인 및 토큰 생성 API
     */
    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody Map<String, Object> req) {

        String epCode = String.valueOf(req.get("epCode"));
        String passWord = String.valueOf(req.get("passWord"));

        // ✅ XML 직접 호출 (namespace.id)
        Map<String, Object> userInfo = sqlSession.selectOne("loginMapper.login", req);
      
        if (userInfo == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        String epName = String.valueOf(userInfo.get("epName"));
        String teamCode = String.valueOf(userInfo.get("teamCode"));
        String teamName = String.valueOf(userInfo.get("teamName"));
        String busuCode = String.valueOf(userInfo.get("busuCode"));
        String busuName = String.valueOf(userInfo.get("busuName"));

        String token = createAccessToken(epCode, epName, teamCode, teamName, busuCode, busuName);

        Map<String, Object> resMap = Map.of(
            "accessToken", token,
            "userInfo", Map.of(
                    "epName", epName,
                    "teamCode", teamCode,
                    "teamName", teamName,
                    "busuCode", busuCode,
                    "busuName", busuName
                )
            );

        // 응답 스펙: { accessToken, user: { ... } }
        return resMap;
    }    

    /**
     * 토큰 생성 함수
     */
    private String createAccessToken(String epCode, String epName, String teamCode, String teamName, String busuCode, String busuName) {
        if (epCode == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "사원코드가 없습니다.");
        }
        if (secret.length < 32) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "app.jwt.secret는 32자 이상이어야 합니다.");
        }

        Instant now = Instant.now();
        Instant exp = now.plusSeconds(accessTokenMinutes * 60);

        return Jwts.builder()
                .issuer(issuer)
                .subject(String.valueOf(epCode))
                .claim("epCode", epCode)
                .claim("epName", epName)
                .claim("teamCode", teamCode)
                .claim("teamName", teamName)
                .claim("busuCode", busuCode)
                .claim("busuName", busuName)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(Keys.hmacShaKeyFor(secret))
                .compact();
    }

    
    /**
     * 토큰 검증 + 로그인 상태 복구 API
     * 
     * 브라우저는 새로고침(F5)하면 React 상태가 소멸됨
     * 하지만 토큰은 localStorage에 존재
     * 
     * 웹, 앱이 재실행될 때, localStorage에 남아있는 토큰 정보를 이용해서 로그인 상태를 복구
     * 
     * authContext.jsx에서 웹, 앱 시작 시 1번 호출
    */
    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }

        var p = (Map<String, Object>) auth.getPrincipal();

        return Map.of(
                "epCode", p.get("epCode"),
                "epName", p.get("epName"),
                "teamCode", p.get("teamCode"),
                "teamName", p.get("teamName"),
                "busuCode", p.get("busuCode"),
                "busuName", p.get("busuName")
        );
    }
}

    // @Data
    // public static class LoginRequest {
    //     @NotBlank
    //     private String loginId;
    //     @NotBlank
    //     private String password;
    // }

    // private boolean isDisabled(Map<String, Object> user) {
    //     Object enabled = user.get("enabled");
    //     if (enabled == null) return true;

    //     // MSSQL BIT → Boolean or Number 케이스 모두 대응
    //     if (enabled instanceof Boolean b) return !b;
    //     if (enabled instanceof Number n) return n.intValue() == 0;
    //     return false;
    // }

    // private Integer toInt(Object v) {
    //     if (v == null) return null;
    //     if (v instanceof Integer i) return i;
    //     if (v instanceof Number n) return n.intValue();
    //     return Integer.parseInt(String.valueOf(v));
    // }
