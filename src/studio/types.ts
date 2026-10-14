import type { ReactNode } from 'react';
export type * from '../core/types';

export interface ThemeBlock {
  id: string;
  node: ReactNode;
  continuation?: ReactNode;
  kind: 'section-title' | 'entry-header' | 'content' | 'bullet';
  keepWithNext?: boolean;
  groupId?: string;
  breakBefore?: boolean;
}

export type { LayoutIssue } from '../core/layout';
