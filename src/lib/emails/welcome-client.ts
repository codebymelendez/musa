export function welcomeClient({ nombre }: { nombre: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Bienvenida a MUSA</title>
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
              <p style="margin:0 0 14px;color:#5C4033;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;">
                Ya eres parte de MUSA. Ahora encontrar a tu profesional de belleza favorita es mucho más fácil.
              </p>
              <p style="margin:0 0 36px;color:#5C4033;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;">
                Busca, reserva y gestiona tus citas desde un solo lugar — sin llamadas, sin esperas.
              </p>
              <div style="text-align:center;">
                <a href="https://getmusa.app"
                   style="display:inline-block;background:#D4956A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:8px;font-family:Arial,sans-serif;">
                  Buscar mi profesional
                </a>
              </div>
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
