'use client';

import { useState, useEffect } from 'react';
import { getProfile } from '@/lib/storage';
import { newPost } from '@/lib/blog';
import { BlogPost } from '@/lib/types';
import BlogEditor from '@/components/blogs/BlogEditor';

export default function NewPostPage() {
  const [initial, setInitial] = useState<BlogPost | null>(null);

  useEffect(() => {
    getProfile().then(p => setInitial(newPost(p.name || undefined)));
  }, []);

  if (!initial) return <div style={{ minHeight: '100vh', background: 'var(--blog-bg)' }} />;
  return <BlogEditor initial={initial} mode="new" />;
}
