export const ADMIN_EMAIL = 'udaymanhas9@gmail.com';

export const ADMIN_ONLY_PREFIXES = ['/lab', '/bereal', '/admin'];

export function isAdminPath(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/')
  );
}

export function isAdmin(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
