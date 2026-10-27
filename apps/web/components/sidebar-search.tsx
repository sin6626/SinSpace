import { Input } from "@base-ui/react/input";
import { Search } from "lucide-react";
import Form from "next/form";
import "./details-sidebar.css";

// 列表页标题右边的小搜索框：GET 提交到对应列表页的 ?q=，回车即搜索（单输入框表单的原生行为）。
export default function SidebarSearch({ action, label, defaultValue }: { action: string; label: string; defaultValue: string }) {
  return (
    <Form action={action} role="search" className="list-search">
        <Search size={16} aria-hidden="true" />
        {/* key 让关键词变化后输入框重新挂载，显示当前搜索词 */}
        <Input key={defaultValue} name="q" type="search" autoComplete="off" defaultValue={defaultValue} maxLength={50} placeholder={label} aria-label={label} className="field" />
    </Form>
  );
}
