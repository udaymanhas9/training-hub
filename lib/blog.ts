import { BlogPost } from './types';
import { format } from 'date-fns';

export function newPost(author?: string): BlogPost {
  return {
    id: crypto.randomUUID(),
    title: '',
    body: '',
    author,
    date: format(new Date(), 'yyyy-MM-dd'),
    published: true,
    createdAt: new Date().toISOString(),
  };
}

// A plain-text excerpt from the markdown body (strips the most common syntax).
export function excerpt(post: BlogPost, max = 160): string {
  if (post.subtitle) return post.subtitle;
  const text = post.body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')     // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // links → text
    .replace(/[#>*_`~-]/g, '')                // markdown marks
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

export function formatPostDate(date: string): string {
  return format(new Date(date + 'T00:00:00'), 'MMM d, yyyy');
}

// Relative-ish label for the featured card (e.g. "12 HRS AGO", "JUN 1").
export function relativeDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'TODAY';
  if (days === 1) return 'YESTERDAY';
  if (days < 7)  return `${days} DAYS AGO`;
  return format(d, 'MMM d').toUpperCase();
}
