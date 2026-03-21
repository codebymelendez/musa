import { prisma } from "@/lib/prisma";

export async function checkAppointmentLimit(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { plan: true },
  });

  if (!business || !business.plan) return true; // Si no hay plan, no hay límite? O asumir FREE?

  const limits = business.plan.limits as any;
  const maxAppointments = limits?.maxMonthlyAppointments || 30;

  if (business.currentMonthBookings >= maxAppointments) {
    return false;
  }

  return true;
}

export async function incrementAppointmentCount(businessId: string) {
  await prisma.business.update({
    where: { id: businessId },
    data: { currentMonthBookings: { increment: 1 } },
  });
}
