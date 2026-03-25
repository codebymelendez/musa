import { createClient } from "../src/lib/supabase-server";
import { sendNotification } from "../src/lib/notifications";

async function main() {
  const supabase = await createClient();
  const { data: user } = await supabase
    .from('User')
    .select('id, name')
    .limit(1)
    .maybeSingle();

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
  .catch(console.error);
