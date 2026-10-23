import { unstable_rethrow } from "next/navigation";
import { getProjects } from "../lib/blog-data";

// 后台填写的地址只放行 http(s)，避免 javascript: 等协议。
const safeUrl = (value?: string) => value && /^https?:\/\//i.test(value) ? value : undefined;

export default async function ProjectList() {
  let projects: Awaited<ReturnType<typeof getProjects>>;
  try {
    projects = await getProjects();
  } catch (error) {
    unstable_rethrow(error);
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
          <ul className="post-list">
            {projects.map((project) => {
              const avatar = safeUrl(project.avatar);
              const links = [
                { label: "项目地址", href: safeUrl(project.projectUrl) },
                { label: "在线预览", href: safeUrl(project.previewUrl) },
                { label: "文档", href: safeUrl(project.docUrl) },
              ].filter((link) => link.href);
              return (
                <li key={project.id} className="project-item">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 后台上传的任意域名图片，不走 next/image 白名单 */}
                  {avatar && <img className="project-avatar" src={avatar} alt="" width={48} height={48} />}
                  <article>
                    <h2>{project.name}</h2>
                    {project.description && <p className="post-summary">{project.description}</p>}
                    {links.length > 0 && (
                      <div className="post-meta">
                        {links.map((link) => (
                          <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
                        ))}
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        ) : <p className="post-empty">还没有作品。</p>}
      </div>
    </>
  );
}
