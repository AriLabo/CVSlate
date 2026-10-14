import { expect, it } from 'vitest';
import { normalizeDocument } from '../core/document';
import { createResumeRecord } from './defaults';
import { describePath, summarizePaths } from '../core/change-summary';

it('describes agent patch paths in readable Chinese', () => {
  const document = normalizeDocument(createResumeRecord());
  expect(describePath(document, '/data/basics/headline')).toBe('基本信息 · 目标职位');
  expect(describePath(document, '/data/sections/1/entries/0/bullets/1')).toBe('「工作经历」 · 「示例科技有限公司」 · 第 2 条要点');
  expect(describePath(document, '/data/sections/1/entries/-')).toBe('「工作经历」 · 条目');
  expect(describePath(document, '/appearance/themeId')).toBe('主题');
  expect(describePath(document, '/appearance/css')).toBe('自定义样式');
  expect(summarizePaths(document, ['/name', '/name', '/target', '/data/basics/email', '/data/basics/phone'])).toBe('简历名称、投递目标、基本信息 · 邮箱 等 4 处');
});

it('groups consecutive autosaves from one person but keeps each agent commit separate', async () => {
  const { groupRevisions } = await import('./ChangeHistory');
  const minute = 60_000;
  const groups = groupRevisions([
    { revision: 6, source: 'agent', createdAt: 10 * minute, paths: ['/data/basics/headline'] },
    { revision: 5, source: 'agent', createdAt: 9.9 * minute, paths: ['/name'] },
    { revision: 4, source: 'human', createdAt: 9 * minute, paths: ['/data/basics/name'] },
    { revision: 3, source: 'human', createdAt: 8 * minute, paths: ['/data/basics/name', '/data/basics/email'] },
    { revision: 2, source: 'human', createdAt: 1 * minute, paths: ['/data/basics/phone'] },
    { revision: 1, source: 'human', createdAt: 0.5 * minute, paths: ['/'] },
  ]);
  expect(groups.map((group) => [group.source, group.from, group.to, group.count])).toEqual([['agent', 6, 6, 1], ['agent', 5, 5, 1], ['human', 3, 4, 2], ['human', 2, 2, 1], ['human', 1, 1, 1]]);
  expect(groups[2].paths).toEqual(['/data/basics/name', '/data/basics/email']);
});
