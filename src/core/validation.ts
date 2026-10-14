import type { ResumeData, ResumeRecord, ResumeWorkspace, SectionType } from './types';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../schema/resume-data.schema.json' with { type: 'json' };
import { LINK_LIMITS } from './limits';
import { LINK_ICON_OPTIONS, LINK_SHOW_OPTIONS } from './links';
import { DETAIL_FIELDS, DETAIL_MAX_LENGTH } from './details';
import { isPrivateToken } from './privacy';
// Compiled on first use so commands that never validate locally don't pay for it at startup.
let compiled: ReturnType<Ajv2020['compile']> | undefined;
const schemaValidator = () => compiled ??= new Ajv2020({ allErrors: true, strict: true }).compile(schema);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const sectionTypes = new Set<SectionType>(['summary', 'experience', 'projects', 'education', 'skills', 'custom']);

function requireObject(value: unknown, path: string, errors: string[]): value is Record<string, unknown> {
  if (isObject(value)) return true;
  errors.push(`${path} 必须是对象`);
  return false;
}

function requireString(object: Record<string, unknown>, key: string, path: string, errors: string[]): void {
  if (typeof object[key] !== 'string') errors.push(`${path}.${key} 必须是字符串`);
}

function requireStringArray(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} 必须是字符串数组`);
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string') errors.push(`${path}[${index}] 必须是字符串`);
  });
}

function validateEntry(value: unknown, type: SectionType, path: string, errors: string[], ids: Set<string>): void {
  if (!requireObject(value, path, errors)) return;
  requireString(value, 'id', path, errors);
  const id = value.id;
  if (typeof id === 'string') {
    if (!id.trim()) errors.push(`${path}.id 不能为空`);
    else if (ids.has(id)) errors.push(`${path}.id 与其他条目重复：${id}`);
    else ids.add(id);
  }

  if (type === 'skills') {
    requireString(value, 'category', path, errors);
    requireStringArray(value.items, `${path}.items`, errors);
    return;
  }

  requireStringArray(value.bullets, `${path}.bullets`, errors);
  const fields: Record<Exclude<SectionType, 'summary' | 'skills'>, string[]> = {
    experience: ['company', 'role', 'location', 'startDate', 'endDate', 'description'],
    projects: ['name', 'subtitle', 'date', 'link', 'description'],
    education: ['school', 'degree', 'major', 'date', 'additional'],
    custom: ['title', 'subtitle', 'date', 'link', 'description'],
  };
  if (type !== 'summary') fields[type].forEach((field) => requireString(value, field, path, errors));
}

const basicKeys = ['name', 'headline', 'phone', 'email', 'location', 'links', 'photo', ...DETAIL_FIELDS.map((field) => field.id)];

/** Returns human-readable paths for every ResumeData v1 validation problem. */
export function validateResumeData(value: unknown): string[] {
  const errors: string[] = [];
  if (!requireObject(value, 'root', errors)) return errors;
  if (value.schemaVersion !== 1) errors.push('schemaVersion 必须是 1');

  if (requireObject(value.basics, 'basics', errors)) {
    ['name', 'headline', 'phone', 'email', 'location'].forEach((field) =>
      requireString(value.basics as Record<string, unknown>, field, 'basics', errors));
    // A field the editor does not show would also escape privacy mode, so unknown ones are refused.
    Object.keys(value.basics).filter((key) => !basicKeys.includes(key)).forEach((key) => errors.push(`basics.${key} 不是可用的基本信息字段`));
    // Measured in characters, as the schema's maxLength is; a placeholder stands for a value checked when it was filled.
    const tooLong = (text: unknown, max: number) => typeof text === 'string' && !isPrivateToken(text) && [...text].length > max;
    if ('photo' in value.basics && typeof value.basics.photo !== 'string') errors.push('basics.photo 必须是字符串');
    for (const { id, label } of DETAIL_FIELDS) {
      if (!(id in value.basics)) continue;
      if (typeof value.basics[id] !== 'string') errors.push(`basics.${id} 必须是字符串`);
      else if (tooLong(value.basics[id], DETAIL_MAX_LENGTH)) errors.push(`basics.${id}（${label}）最多 ${DETAIL_MAX_LENGTH} 个字`);
    }
    if (!Array.isArray(value.basics.links)) errors.push('basics.links 必须是数组');
    else {
      if (value.basics.links.length > LINK_LIMITS.count) errors.push(`basics.links 最多 ${LINK_LIMITS.count} 个`);
      const linkIds = new Set<string>();
      value.basics.links.forEach((link, index) => {
        const path = `basics.links[${index}]`;
        if (!requireObject(link, path, errors)) return;
        ['id', 'label', 'url'].forEach((field) => requireString(link, field, path, errors));
        if (tooLong(link.label, LINK_LIMITS.label)) errors.push(`${path}.label 最多 ${LINK_LIMITS.label} 个字`);
        if (tooLong(link.url, LINK_LIMITS.url)) errors.push(`${path}.url 最多 ${LINK_LIMITS.url} 个字符`);
        if ('show' in link && !LINK_SHOW_OPTIONS.some((option) => option.id === link.show)) errors.push(`${path}.show 只能是 ${LINK_SHOW_OPTIONS.map((option) => option.id).join('、')}`);
        if ('icon' in link && !LINK_ICON_OPTIONS.some((option) => option.id === link.icon)) errors.push(`${path}.icon 只能是 ${LINK_ICON_OPTIONS.map((option) => option.id).join('、')}；不写就按网址自动选`);
        if (typeof link.id === 'string') {
          if (!link.id.trim()) errors.push(`${path}.id 不能为空`);
          else if (linkIds.has(link.id)) errors.push(`${path}.id 与其他链接重复：${link.id}`);
          else linkIds.add(link.id);
        }
      });
    }
  }

  if (!Array.isArray(value.sections)) {
    errors.push('sections 必须是数组');
    return errors;
  }

  const sectionIds = new Set<string>();
  const entryIds = new Set<string>();
  value.sections.forEach((section, sectionIndex) => {
    const path = `sections[${sectionIndex}]`;
    if (!requireObject(section, path, errors)) return;
    requireString(section, 'id', path, errors);
    if (typeof section.id === 'string') {
      if (!section.id.trim()) errors.push(`${path}.id 不能为空`);
      else if (sectionIds.has(section.id)) errors.push(`${path}.id 与其他栏目重复：${section.id}`);
      else sectionIds.add(section.id);
    }
    if (typeof section.type !== 'string' || !sectionTypes.has(section.type as SectionType)) {
      errors.push(`${path}.type 必须是 summary、experience、projects、education、skills 或 custom`);
      return;
    }
    const type = section.type as SectionType;
    requireString(section, 'title', path, errors);
    if (typeof section.visible !== 'boolean') errors.push(`${path}.visible 必须是布尔值`);
    const layout = section.layout;
    if (requireObject(layout, `${path}.layout`, errors)) {
      if (typeof layout.pageBreakBefore !== 'boolean') errors.push(`${path}.layout.pageBreakBefore 必须是布尔值`);
      Object.keys(layout).filter((key) => key !== 'pageBreakBefore').forEach((key) => errors.push(`${path}.layout.${key} 不是可用的栏目设置`));
    }
    if (type === 'summary' && typeof section.text !== 'string') errors.push(`${path}.text 必须是字符串`);
    if (!Array.isArray(section.entries)) errors.push(`${path}.entries 必须是数组`);
    else if (type === 'summary' && section.entries.length > 0) errors.push(`${path}.entries 在 summary 栏目中必须为空数组`);
    else section.entries.forEach((entry, entryIndex) => validateEntry(entry, type, `${path}.entries[${entryIndex}]`, errors, entryIds));
  });
  const validate = schemaValidator();
  if (!validate(value)) errors.push(...(validate.errors ?? []).map((error) => `${error.instancePath || 'root'} ${error.message}`));
  return errors;
}

export function isResumeData(value: unknown): value is ResumeData {
  return validateResumeData(value).length === 0;
}

export function isAppearance(value: unknown): boolean {
  if (!isObject(value) || typeof value.themeId !== 'string' ||
    !['comfortable', 'balanced', 'dense'].includes(String(value.density)) || !isObject(value.layout)) return false;
  const layout = value.layout;
  return ['pageMarginMm', 'baseFontPt', 'lineHeight', 'sectionSpacingPt'].every((key) => typeof layout[key] === 'number') &&
    typeof layout.accentColor === 'string' && typeof layout.photoEnabled === 'boolean';
}

export function isResumeRecord(value: unknown): value is ResumeRecord {
  return isObject(value) && typeof value.id === 'string' && typeof value.name === 'string' &&
    typeof value.createdAt === 'number' && typeof value.updatedAt === 'number' && isResumeData(value.data) &&
    isAppearance(value.appearance);
}

export function isWorkspace(value: unknown): value is ResumeWorkspace {
  return isObject(value) && value.version === 1 && typeof value.activeId === 'string' &&
    Array.isArray(value.resumes) && value.resumes.length > 0 && value.resumes.every(isResumeRecord) &&
    value.resumes.some((resume) => resume.id === value.activeId);
}
