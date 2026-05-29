export function welcomePro({ nombre }: { nombre: string }): string {
  const step = (
    num: string,
    title: string,
    text: string,
    btnLabel?: string,
    btnHref?: string
  ) => `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr>
        <td valign="top" style="width:44px;padding-right:16px;">
          <div style="width:36px;height:36px;background:#D4956A;border-radius:50%;text-align:center;line-height:36px;color:#ffffff;font-size:16px;font-weight:bold;font-family:Arial,sans-serif;">${num}</div>
        </td>
        <td valign="top">
          <p style="margin:0 0 6px;color:#3C1F0E;font-size:16px;font-weight:bold;font-family:Arial,sans-serif;">${title}</p>
          <p style="margin:0 0 12px;color:#5C4033;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">${text}</p>
          ${
            btnLabel && btnHref
              ? `<a href="${btnHref}" style="display:inline-block;border:2px solid #D4956A;color:#D4956A;text-decoration:none;font-size:14px;font-weight:bold;padding:10px 24px;border-radius:8px;font-family:Arial,sans-serif;">${btnLabel}</a>`
              : ""
          }
        </td>
      </tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Tu negocio en MUSA</title>
</head>
<body style="margin:0;padding:0;background:#FAF7F4;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;background:#ffffff;">

          <!-- HEADER -->
          <tr>
            <td style="background:#3C1F0E;padding:44px 40px 36px;text-align:center;">
              <img src="https://getmusa.app/brand/monogram-light.svg"
                   alt="MUSA" width="56" height="45"
                   style="display:block;margin:0 auto 18px;width:56px;height:45px;" />
              <h1 style="margin:0;color:#F2EBE0;font-family:Georgia,serif;font-size:28px;font-weight:normal;letter-spacing:8px;">MUSA</h1>
              <p style="margin:10px 0 0;color:#D4956A;font-family:Georgia,serif;font-size:13px;font-style:italic;">Tu belleza, tu agenda</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px;background:#ffffff;">
              <p style="margin:0 0 20px;color:#3C1F0E;font-size:22px;font-family:Georgia,serif;">Hola ${nombre},</p>
              <p style="margin:0 0 32px;color:#5C4033;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;">
                Bienvenida a MUSA. Estás a pocos pasos de tener tu agenda digital funcionando. Sigue este orden:
              </p>

              ${step(
                "1",
                "Añade tus servicios y precios",
                "Dile a tus clientas qué ofreces y cuánto cobras.",
                "Configurar servicios →",
                "https://getmusa.app/services"
              )}

              ${step(
                "2",
                "Completa tu perfil",
                "Añade tu foto, dirección del negocio, tu número de contacto y tu cuenta de Instagram.",
                "Completar perfil →",
                "https://getmusa.app/profile"
              )}

              ${step(
                "3",
                "Comparte tu enlace de reserva",
                "En tu perfil encontrarás tu enlace personal. Compártelo por WhatsApp o Instagram y tus clientas podrán reservar contigo desde ese momento."
              )}

              <hr style="border:none;border-top:1px solid #E8DDD5;margin:8px 0 24px;">
              <p style="margin:0;color:#9E7B6B;font-size:14px;font-family:Arial,sans-serif;">Cualquier duda estamos aquí.</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#FAF7F4;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:#9E7B6B;font-size:12px;font-family:Arial,sans-serif;">Con cariño, El equipo MUSA 💅</p>
              <p style="margin:0;color:#9E7B6B;font-size:12px;font-family:Arial,sans-serif;">getmusa.app · bienvenida@getmusa.app</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
