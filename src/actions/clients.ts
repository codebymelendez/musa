'use server'

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function toggleClientStatus(clientId: string, isActive: boolean) {
  try {
    const supabase = await createClient();
    
    // Auth check using getUser
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'No autorizado' };
    }

    // Actualizar cliente
    const { error: updateError } = await supabase
      .from('Client')
      .update({ isActive, updatedAt: new Date().toISOString() })
      .eq('id', clientId)
      .eq('businessId', (
        await supabase.from('User').select('businessId').eq('id', user.id).single()
      ).data?.businessId);

    if (updateError) {
      console.error("[toggleClientStatus error]", updateError);
      return { error: 'Error al actualizar el estado de la clienta' };
    }

    revalidatePath('/clients');
    return { success: true };
  } catch (err: any) {
    console.error("[toggleClientStatus exception]", err);
    return { error: 'Error interno de servidor' };
  }
}
