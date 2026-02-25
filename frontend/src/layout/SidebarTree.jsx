import React, { useMemo, useState } from "react";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

/**
 *  트리 필터 함수
 */
function filterTree(nodes, keyword) {
  if (!keyword) return nodes;

  const lower = keyword.toLowerCase();

  return nodes
    .map((node) => {
      const matched = node.title?.toLowerCase().includes(lower);

      const children = node.children
        ? filterTree(node.children, keyword)
        : [];

      if (matched || children.length > 0) {
        return {
          ...node,
          children,
          _matched: matched,
        };
      }
      return null;
    })
    .filter(Boolean);
}

function TreeNode({ node, depth, onOpen, forceOpen }) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const paddingLeft = 12 + depth * 14;
  const isOpen = forceOpen ? true : open;

  return (
    <div>
      <button
        type="button"
        className={cn(
          "w-full text-left px-3 py-2 flex items-center gap-2",
          "hover:bg-slate-900/60 active:bg-slate-900/80",
          "text-sm rounded-lg mx-2",
          node._matched ? "bg-slate-900/70 text-white" : ""
        )}
        style={{ paddingLeft }}
        onClick={() => {
          if (hasChildren) setOpen((v) => !v);
          else if (node.path && node.title) onOpen(node.path, node.title);
        }}
      >
        <span className="w-4 shrink-0 text-slate-400">
          {hasChildren ? (isOpen ? "▾" : "▸") : "•"}
        </span>
        <span className="truncate">{node.title}</span>
      </button>

      {hasChildren && isOpen && (
        <div className="mt-1">
          {node.children.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              depth={depth + 1}
              onOpen={onOpen}
              forceOpen={forceOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SidebarTree({ tree, keyword, onOpen }) {
  const filteredTree = useMemo(
    () => filterTree(tree, keyword),
    [tree, keyword]
  );

  const searching = keyword && keyword.trim().length > 0;

  return (
    <div className="h-full overflow-auto py-2">
      {filteredTree.map((n) => (
        <TreeNode
          key={n.id}
          node={n}
          depth={0}
          onOpen={onOpen}
          forceOpen={searching}
        />
      ))}
    </div>
  );
}
