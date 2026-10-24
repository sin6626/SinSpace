// 渲染前整理 Lexical JSON，不修改后台保存的原文。
// 日常库里有内容把块级节点放进了段落：一篇整篇包在一个段落里，一篇在段落里放了块级公式。
// 浏览器不允许 <p>/<h*> 里出现块级元素，React 会报 “<div> cannot be a descendant of <p>” 并导致水合错误。
// 这里把段落、标题里的块级子节点提到同一层，前后的行内内容仍保留为原类型的段落/标题。

type LexicalNode = { type: string; children?: LexicalNode[]; $?: unknown; [key: string]: unknown };
type EditorState = { root: LexicalNode };

// 可以出现在段落、标题里的行内节点（来自 docs/plate-lexical-inventory.md 的盘点），其余视为块级。
const inlineTypes = new Set([
  "text", "linebreak", "tab", "link", "autolink",
  "katex-inline", "mention", "ruby", "spoiler", "tag", "comment", "footnote",
]);
const textContainers = new Set(["paragraph", "heading"]);

const isNode = (value: unknown): value is LexicalNode =>
  typeof value === "object" && value !== null && typeof (value as LexicalNode).type === "string";
const isEditorState = (value: unknown): value is EditorState =>
  typeof value === "object" && value !== null && isNode((value as EditorState).root) && (value as EditorState).root.type === "root";

// 提示块、嵌套文档等节点把子文档存在自己的字段里（如 alert-quote 的 content），一并整理。
function normalizeFields(node: LexicalNode): LexicalNode {
  let changed: LexicalNode | null = null;
  for (const [key, value] of Object.entries(node)) {
    if (key === "children") continue;
    const next = isEditorState(value) ? normalizeEditorState(value)
      : Array.isArray(value) && value.some(isEditorState) ? value.map((item) => isEditorState(item) ? normalizeEditorState(item) : item)
      : value;
    if (next !== value) (changed ??= { ...node })[key] = next;
  }
  return changed ?? node;
}

function splitTextContainer(node: LexicalNode, children: LexicalNode[]): LexicalNode[] {
  const result: LexicalNode[] = [];
  let inline: LexicalNode[] = [];
  let keptBlockId = false;
  const flush = () => {
    if (!inline.length) return;
    // 只有第一段保留原节点的 $（含 blockId），避免拆分后出现重复的块 ID。
    const { $, ...rest } = node;
    result.push(keptBlockId || $ === undefined ? { ...rest, children: inline } : { ...node, children: inline });
    keptBlockId = true;
    inline = [];
  };
  for (const child of children) {
    if (inlineTypes.has(child.type)) inline.push(child);
    else {
      flush();
      result.push(child);
    }
  }
  flush();
  return result;
}

function normalizeNode(input: LexicalNode): LexicalNode[] {
  const node = normalizeFields(input);
  if (!Array.isArray(node.children)) return [node];
  const children = node.children.flatMap(normalizeNode);
  if (textContainers.has(node.type) && children.some((child) => !inlineTypes.has(child.type))) {
    return splitTextContainer(node, children);
  }
  const unchanged = children.length === node.children.length && children.every((child, index) => child === node.children![index]);
  return [unchanged ? node : { ...node, children }];
}

export function normalizeEditorState<T extends EditorState>(state: T): T {
  const [root] = normalizeNode(state.root);
  return root === state.root ? state : { ...state, root };
}
