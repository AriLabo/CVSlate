import type { ResumeDocument, ResumeEntry } from './types';
import { DETAIL_FIELDS } from './details';
import { entryTitle } from './entries';

const basicsLabels: Record<string, string> = { name: '姓名', headline: '目标职位', phone: '电话', email: '邮箱', location: '地点', links: '链接', photo: '照片', ...Object.fromEntries(DETAIL_FIELDS.map((field) => [field.id, field.label])) };
const fieldLabels: Record<string, string> = {
  company: '公司', role: '职位', location: '地点', startDate: '开始日期', endDate: '结束日期', description: '说明', name: '名称', subtitle: '副标题', date: '日期', link: '链接',
  school: '学校', degree: '学位', major: '专业', additional: '补充文字', category: '分类', items: '技能项', title: '标题',
};
const appearanceLabels: Record<string, string> = { themeId: '主题', density: '密度', layout: '排版', css: '自定义样式' };

function entryLabel(entry: ResumeEntry | undefined, index: number): string {
  const title = entry && entryTitle(entry);
  return title ? `「${title}」` : `第 ${index + 1} 条`;
}

/** Turns a JSON Pointer from a commit into a short Chinese description of what changed. */
export function describePath(document: ResumeDocument | undefined, path: string): string {
  const parts = path.split('/').slice(1).map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  if (parts[0] === 'name') return '简历名称';
  if (parts[0] === 'target') return '投递目标';
  if (parts[0] === 'parentId') return '所在位置';
  if (parts[0] === 'purpose') return '定位';
  if (parts[0] === 'source') return '来源改动已看过';
  if (parts[0] === 'appearance') return appearanceLabels[parts[1]] ?? '外观';
  if (parts[0] !== 'data') return '简历内容';
  if (parts[1] === 'basics') return `基本信息 · ${basicsLabels[parts[2]] ?? '其他'}`;
  if (parts[1] !== 'sections') return '简历内容';
  const sectionIndex = Number(parts[2]);
  const section = Number.isInteger(sectionIndex) ? document?.data.sections[sectionIndex] : undefined;
  const sectionName = section ? `「${section.title}」` : '栏目';
  if (parts.length <= 3 || parts[3] === '-') return `${sectionName}栏目`;
  if (parts[3] === 'text') return `${sectionName} · 内容`;
  if (parts[3] !== 'entries') return `${sectionName} · ${parts[3] === 'title' ? '标题' : '设置'}`;
  if (parts[4] === undefined || parts[4] === '-') return `${sectionName} · 条目`;
  const entryIndex = Number(parts[4]);
  const label = `${sectionName} · ${entryLabel(section?.entries[entryIndex], entryIndex)}`;
  if (parts[5] === 'bullets') return parts[6] === undefined || parts[6] === '-' ? `${label} · 要点` : `${label} · 第 ${Number(parts[6]) + 1} 条要点`;
  return parts[5] ? `${label} · ${fieldLabels[parts[5]] ?? '内容'}` : label;
}

export function summarizePaths(document: ResumeDocument | undefined, paths: string[] | undefined): string {
  const labels = [...new Set((paths ?? []).map((path) => describePath(document, path)))];
  if (!labels.length) return '简历内容';
  return labels.length > 3 ? `${labels.slice(0, 3).join('、')} 等 ${labels.length} 处` : labels.join('、');
}
