import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { db } from './db';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return null;
  const user = await db.user.findUnique({
    where: { username: session.user.name },
  });
  return user;
}
