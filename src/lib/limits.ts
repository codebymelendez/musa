import { createClient } from "@/lib/supabase-server";

export async function checkAppointmentLimit(businessId: string) {
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from('Business')
    .select('*, plan:Plan(*)')
    .eq('id', businessId)
    .single();

  if (error || !business || !business.plan) return true;

  const limits = business.plan.limits as any;
  const maxAppointments = limits?.maxMonthlyAppointments || 30;

  if (business.currentMonthBookings >= maxAppointments) {
    return false;
  }

  return true;
}

export async function incrementAppointmentCount(businessId: string) {
  const supabase = await createClient();
  
  // Obtenemos el valor actual (no es idealmente atómico pero similar a la implementación previa si no usamos RPC)
  const { data: business } = await supabase
    .from('Business')
    .select('currentMonthBookings')
    .eq('id', businessId)
    .single();

  if (business) {
    await supabase
      .from('Business')
      .update({ currentMonthBookings: (business.currentMonthBookings || 0) + 1 })
      .eq('id', businessId);
  }
}
