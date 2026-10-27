import { ArrowUpRight } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { getProjects } from "../lib/blog-data";
import { safeUrl } from "../lib/safe-url";
import "./corners.css";

type Project = Awaited<ReturnType<typeof getProjects>>[number];

// 作品的角落：像挂在墙上的卡片，图标（没有图标时用名字首字）、名字、一句话描述和链接。首页预览复用。
export function ProjectCard({ project, headingLevel = 2 }: { project: Project; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const avatar = safeUrl(project.avatar);
  const links = [
    { label: "项目地址", href: safeUrl(project.projectUrl) },
    { label: "在线预览", href: safeUrl(project.previewUrl) },
    { label: "文档", href: safeUrl(project.docUrl) },
  ].filter((link) => link.href);
  return (
    <article className="project-card">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- 后台上传的任意域名图片，不走 next/image 白名单
        <img className="project-card-icon" src={avatar} alt="" width={48} height={48} />
      ) : <span className="project-card-icon is-letter" aria-hidden="true">{Array.from(project.name.trim())[0] ?? "✦"}</span>}
      <Heading>{project.name}</Heading>
      {project.description && <p className="project-card-description">{project.description}</p>}
      {links.length > 0 && (
        <div className="project-card-links">
          {links.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={14} aria-hidden="true" /></a>
          ))}
        </div>
      )}
    </article>
  );
}

export default async function ProjectList() {
  let projects: Awaited<ReturnType<typeof getProjects>>;
  try {
    projects = await getProjects();
  } catch (error) {
    unstable_rethrow(error);
    // 重试用整页加载，确保重新请求；不用客户端路由。
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    return <p className="post-list-content" role="alert">作品读取失败。<a href="/projects">重试</a></p>;
  }

  return (
    <>
      <header className="page-heading">
        <h1>作品</h1>
        <p className="post-meta">共 {projects.length} 个作品</p>
      </header>
      <div className="post-list-content">
        {projects.length ? (
          <ul className="project-grid">
            {projects.map((project) => <li key={project.id}><ProjectCard project={project} /></li>)}
          </ul>
        ) : <p className="post-empty">还没有作品。</p>}
      </div>
    </>
  );
}
