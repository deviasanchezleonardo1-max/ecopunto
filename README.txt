ECOPUNTO - VERSION PWA INSTALABLE

IMPORTANTE: sube a Vercel los ARCHIVOS SUELTOS (index.html, sw.js, manifest.json...), NO la carpeta que los contiene.
El enlace debe ser el de PRODUCCION (dominio .vercel.app del proyecto), no uno de vista previa protegido.

IMPORTANTE: esta versión conserva la interfaz y las funciones de la versión anterior.
Los cambios son técnicos para mejorar la instalación como aplicación web (PWA) y el funcionamiento sin conexión.

PARA VERCEL:
1. Usa la carpeta hermana `EcoPunto_Vercel`, que contiene el paquete listo para desplegar con index.html, app.js, styles.css y api/ directamente en la raíz. Esta carpeta fuente puede desplegarse también, siempre que se seleccione ella misma como Root Directory.
2. En Vercel configura Framework Preset = Other, Build Command = vacío y Output Directory = vacío/sin anulación. Si `EcoPunto_Vercel` está dentro de otro repositorio, configúrala como Root Directory. Si subes solo su contenido como repositorio, usa `.`.
3. Importa ese repositorio en Vercel o ejecuta `vercel --prod` desde la carpeta seleccionada. No publiques la aplicación como sitio estático que ignore `api/`.
4. Conserva api/, modelo/, supabase/, package.json, index.html, styles.css, app.js, manifest.json, sw.js, vercel.json y la carpeta imagenes/ con todos los recursos gráficos. Conserva también imagenes/leo-original.png como copia intacta de la imagen original.
5. En Vercel > Settings > Environment Variables agrega GEMINI_API_KEY y TEACHER_PASSWORD; agrega SUPABASE_URL y SUPABASE_ANON_KEY si usarás las cuentas de estudiantes. Vuelve a desplegar tras cambiar variables.
6. Abre la URL HTTPS de producción y confirma que `/styles.css`, `/app.js` y `/manifest.json` respondan con 200. Una petición GET a `/api/gemini` debe responder 405 (método no permitido); si responde 404, Vercel sigue usando una raíz incorrecta o publicó el sitio como estático sin las funciones de `api/`. Prueba las funciones antes de usar la app con estudiantes.
7. En Chrome Android: menú ⋮ > Instalar aplicación. Si aparece una versión anterior, cierra la app, borra los datos/caché del sitio y vuelve a abrir la URL.

NOTA:
La cámara y la PWA requieren HTTPS o localhost. Vercel proporciona HTTPS.
Gemini está integrado para clasificar online. El modelo offline de Teachable Machine requiere instalar los archivos de modelo y runtime que se detallan en modelo/README.txt.


CONTROL DE XBOX
- EcoPunto mantiene el control táctil y también admite mandos compatibles con la Gamepad API del navegador.
- En un mando Xbox con mapeo estándar: cruceta/joystick izquierdo = navegar, A = seleccionar, B = volver, Start = enfocar la primera opción.
- Conecta el mando por Bluetooth o USB según el dispositivo. El navegador debe exponer la Gamepad API; en algunos celulares puede ser necesario usar un navegador compatible.
- El mando no reemplaza la pantalla táctil: ambos métodos pueden usarse en la misma sesión.


CONTROL XBOX Y TECLADO VIRTUAL
- Táctil y mando funcionan simultáneamente.
- D-pad / stick: navegar entre las opciones.
- A sobre Nombres o Apellidos: abre el teclado virtual.   B: lo cierra (la casilla sigue seleccionada).
- A sobre Jornada: abre el menú de jornadas. Al elegir una, se abre solo el menú de Grados de esa jornada.
- Dentro del teclado: A escribe la tecla · X espacio · mantén Y para mostrar una contraseña (en otros campos Y borra una letra) · LT/RT borran · LB/RB cambia de campo · Start (o la tecla Listo) acepta. En pantalla táctil y PC, mantén presionado el botón 👁 junto a la contraseña para mostrarla; al soltarlo se oculta.
- Clave de profesor: A abre el teclado, Listo/Start entra, B cierra.
- En Inicio, si hay una sesión guardada aparece “Ver mi perfil”; en el panel de estudiante usa “Mi perfil”. Ambos botones y el menú de cambio de perfil se navegan con la cruceta o el stick.
- En los cuadros de confirmación, A activa la opción enfocada y B cancela.
- Sin mando, toca cualquier campo de texto o contraseña para abrir el teclado normal del celular; esto aplica a nombres, códigos y contraseñas de estudiantes y profesores. Si desconectas el mando, EcoPunto vuelve a esos controles normales y a los menús nativos.

ACTUALIZACIONES
- Con internet, la app siempre descarga la versión más nueva al abrirse. Sin internet usa la copia guardada.
- Después de subir una versión nueva a Vercel, abre la app dos veces para ver los cambios.


ANTES DE PUBLICAR:
- En Vercel > Settings > Environment Variables agrega GEMINI_API_KEY (obligatoria para clasificar online) y TEACHER_PASSWORD (clave privada del panel docente). No pongas ninguna de estas claves dentro de app.js. Vuelve a desplegar después de agregarlas.
- Para cuentas de estudiantes configura SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY y RESEND_FROM siguiendo las instrucciones más abajo; registro e inicio de sesión requieren conexión.
- La carpeta modelo/ contiene las instrucciones, pero no incluye aún el modelo ni el runtime de Teachable Machine. El modo offline de clasificación empezará a funcionar solo después de colocar todos los archivos requeridos allí, activar modelo/config.json y volver a desplegar. Abre Escanear residuo con conexión y espera a que la app confirme que el modelo local está listo antes de probar offline.
- Antes de usarlo con estudiantes, prueba en el despliegue de producción una clasificación Gemini con cámara, el acceso docente, la instalación PWA y (si instalas el modelo) una clasificación con el dispositivo desconectado.

GEMINI (modo online): usa la API de Gemini desde /api/gemini con la clave guardada en Vercel. La cámara requiere HTTPS o localhost. Cada respuesta válida de Gemini se guarda automáticamente en el almacenamiento local del dispositivo, incluso si no alcanza la confianza mínima para asignar puntos. En Escanear residuo puedes descargar un ZIP con las imágenes separadas por categoría para reentrenar Teachable Machine; revisa las etiquetas, porque Gemini puede equivocarse. Este guardado no modifica ni reentrena automáticamente el modelo activo.

CUENTAS DE ESTUDIANTE Y PUNTOS EN SUPABASE
1. Crea un proyecto de Supabase.
2. En el SQL Editor ejecuta completo `supabase/schema.sql`. El script agrega y rellena el correo en perfiles que ya existan.
3. En Authentication > Providers > Email, activa el registro por correo y desactiva la confirmación de correo. EcoPunto envía su propio aviso de cuenta creada por Resend; Supabase debe devolver la sesión al terminar el registro.
4. Crea una cuenta en Resend, verifica un dominio remitente y configura un remitente de ese dominio, por ejemplo `EcoPunto <cuentas@tudominio.com>`. Resend no permite enviar libremente desde direcciones de Gmail u otros dominios no verificados.
5. En Vercel > Settings > Environment Variables agrega `SUPABASE_URL` y `SUPABASE_ANON_KEY` con los valores de Supabase (Project Settings > API; usa la clave publicable/anon, nunca `service_role`/secret), además de `RESEND_API_KEY` y `RESEND_FROM` (la clave y el remitente verificado de Resend). Configura Production y cualquier otro entorno que uses.
6. Crea un nuevo deployment de Production después de agregar las variables. Asegúrate de estar desplegando el mismo proyecto y dominio que utilizas. No escribas las claves en `app.js` ni las compartas públicamente.
7. Al registrarse, el estudiante proporciona nombre, apellido, correo, jornada, grado y contraseña; el aviso de creación se envía a ese correo. Para volver a entrar usa correo y contraseña. Las cuentas antiguas creadas con código conservan la opción “Tengo una cuenta anterior con código”.
8. La contraseña requiere al menos 8 caracteres. Prueba un registro con un correo al que tengas acceso antes de usarlo con estudiantes. Si la cuenta se crea pero Resend no acepta el mensaje, la app lo indicará y permitirá continuar con la cuenta.

El perfil y los puntos se guardan en Supabase y se conserva una copia en el almacenamiento del celular. Al abrir la app con internet, EcoPunto carga el perfil online y actualiza la copia local; sin internet muestra la última copia guardada. Los escaneos de una cuenta se guardan en una cola mientras no haya conexión y se suben al reconectarse antes de actualizar el perfil desde el servidor. “Quitar de este dispositivo” no elimina la cuenta de Supabase ni sus puntos; si hay escaneos pendientes, primero exige confirmación del servidor.
La aplicación usa el correo real como identificador de inicio de sesión y lo guarda junto con los nombres, apellidos, grado, jornada y puntos en Supabase. No se envía ni se guarda la contraseña en el mensaje de aviso. La recuperación de contraseña no está integrada; el administrador debe gestionar restablecimientos desde Supabase. Confirma que la escuela está autorizada para almacenar estos datos antes de publicar la app.
Los perfiles creados con una versión anterior solo existen localmente y sus puntos no se transfieren automáticamente a una cuenta online. Conserva esos perfiles hasta confirmar los puntos de la cuenta nueva.
El panel de profesor todavía resume solo los perfiles guardados localmente; el informe central de todas las cuentas no está integrado. La clave del panel se valida en el servidor con TEACHER_PASSWORD; configúrala en Vercel antes de publicar.
