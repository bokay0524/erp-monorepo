package com.erp.controller;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class MenuController {

    private final SqlSessionTemplate sqlSession;

    public MenuController(SqlSessionTemplate sqlSession) {
        this.sqlSession = sqlSession;
    }

    @GetMapping("/menu")
    public List<Map<String, Object>> menu(Authentication authentication) {

        String epCode = "";
        if(authentication != null) {
            Map<String, String> userInfo = (Map<String, String>) authentication.getPrincipal();
             epCode = userInfo.get("epCode");
        }

        //String epCode = (authentication != null) ? String.valueOf(authentication.getPrincipal()) : null;

        if (epCode == null || epCode.isBlank()) {
            // 인증이 없으면 여기까지 오면 안 되지만, 방어 코드
            return List.of();
        }
        
        List<Map<String, Object>> flat = sqlSession.selectList("menuMapper.selectMenuByUser", Map.of("epCode", epCode));

        return buildTree(flat);
    }    

    private List<Map<String, Object>> buildTree(List<Map<String, Object>> flat) {
        // 기대 컬럼: id, title, parentId, path, sort
        Map<String, Map<String, Object>> byId = new HashMap<>();
        for (Map<String, Object> row : flat) {
            Map<String, Object> node = new HashMap<>();
            node.put("id", String.valueOf(row.get("id")));
            node.put("title", String.valueOf(row.get("title")));
            node.put("path", row.get("path") == null ? null : String.valueOf(row.get("path")));
            node.put("parentId", row.get("parentId") == null ? null : String.valueOf(row.get("parentId")));
            node.put("sort", row.get("sort") == null ? 0 : Integer.parseInt(String.valueOf(row.get("sort"))));
            node.put("children", new ArrayList<Map<String, Object>>());
            byId.put((String) node.get("id"), node);
        }

        List<Map<String, Object>> roots = new ArrayList<>();
        for (Map<String, Object> node : byId.values()) {
            String parentId = (String) node.get("parentId");
            if (parentId == null || parentId.isBlank() || !byId.containsKey(parentId)) {
                roots.add(node);
            } else {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> children = (List<Map<String, Object>>) byId.get(parentId).get("children");
                children.add(node);
            }
        }

        // 정렬: sort 기준
        sortTree(roots);
        return roots;
    }

    private void sortTree(List<Map<String, Object>> nodes) {
        nodes.sort(Comparator.comparingInt(n -> (int) n.getOrDefault("sort", 0)));
        for (Map<String, Object> n : nodes) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> children = (List<Map<String, Object>>) n.get("children");
            sortTree(children);
        }
    }
}
