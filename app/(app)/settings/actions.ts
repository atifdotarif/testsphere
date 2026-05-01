'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

const ProfileSchema = z.object({
  full_name: z.string().min(2).max(80),
  avatar_url: z
    .string()
    .url()
    .or(z.literal(''))
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function updateProfileAction(formData: FormData) {
  const { userId } = await requireUser();
  const parsed = ProfileSchema.safeParse({
    full_name: formData.get('full_name'),
    avatar_url: formData.get('avatar_url') ?? '',
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      avatar_url: parsed.data.avatar_url,
    })
    .eq('id', userId);

  revalidatePath('/settings');
  revalidatePath('/dashboard');
}
