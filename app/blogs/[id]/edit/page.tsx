'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getBlogPost } from '@/lib/storage';
import { BlogPost } from '@/lib/types';
import BlogEditor from '@/components/blogs/BlogEditor';

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogPost(id).then(p => { setPost(p); setLoading(false); });
  }, [id]);

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'var(--blog-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blog-faint)' }}>Loading…</div>;
  }
  if (!post) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--blog-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blog-dim)', fontFamily: 'Georgia, serif' }}>
        Post not found. <Link href="/blogs" style={{ color: 'var(--blog-accent)', marginLeft: 6 }}>Back</Link>
      </div>
    );
  }
  return <BlogEditor initial={post} mode="edit" />;
}
