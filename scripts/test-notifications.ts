import { prisma } from "../src/lib/prisma";
import { sendNotification } from "../src/lib/notifications";

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No hay usuarios para probar.");
    return;
  }

  console.log(`Probando notificación para usuario: ${user.name}`);
  
  await sendNotification(user.id, {
    title: "Prueba de Musa",
    body: "Esta es una notificación de prueba desde el script.",
    url: "/home"
  });

  console.log("Notificación enviada (guardada en DB).");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
