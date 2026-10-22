# Preparar otro proyecto Firebase

La web usa Firestore para los datos de texto de `productos` y `configuracion/cotizaciones`. Guarda las imágenes en Cloudinary y escribe su URL en `productos.imagenUrl`. El módulo `js/firebase-storage.js` y las reglas de Storage están listos para una futura migración de imágenes; las páginas públicas no cargan Storage mientras no lo necesiten.

## Configurar el nuevo proyecto

1. Crea el proyecto en Firebase y agrega una aplicación web.
2. Habilita Authentication con correo y contraseña, crea la cuenta administradora y crea la base Firestore en modo producción.
3. Habilita Cloud Storage y Google Analytics para el proyecto; copia el `measurementId` de la aplicación web.
4. Copia los valores de configuración web a `.env`: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` y `FIREBASE_MEASUREMENT_ID`.
5. Completa `WHATSAPP_CONTACT_PHONE_2` y la configuración de Cloudinary. Este único número se muestra como texto en el pie y recibe las cotizaciones de Servicios.
6. Antes de abrir la web o desplegar, ejecuta `node scripts/generate-public-config.mjs`. El `.env` y el archivo generado `js/public-config.js` están excluidos de Git; conserva ambos localmente. El generador actualiza `js/public-config.js` desde `.env`, y Firebase Hosting lo incluye en el despliegue.
7. En Authentication > Settings, agrega el dominio `web.app` o el dominio propio que usarás a la lista de dominios autorizados.
8. Confirma que `firebase use` apunte a `cfcargo`, que ya está configurado como proyecto predeterminado en `.firebaserc`. Si usarás otro ID, selecciónalo antes de desplegar.

Si también quieres conservar los productos del proyecto anterior, exporta e importa sus documentos `productos` y `configuracion/cotizaciones`; cambiar el proyecto no copia esos datos automáticamente.

## Dar acceso al administrador

En Authentication, copia el UID de la cuenta administradora. En Firestore crea manualmente el documento `admins/{UID}` con el campo booleano `enabled: true`. Ningún cliente puede crear o modificar documentos de esa colección. Los productos y tarifas son de lectura pública; las escrituras requieren ese documento habilitado.

Las reglas de Storage usan el mismo registro de administradores, aceptan solo imágenes de menos de 10 MB bajo `catalogos/` y dejan denegado el resto del bucket. Firebase puede pedir autorización para que las reglas de Storage consulten Firestore.

## Publicar

Cuando el nuevo proyecto esté configurado y el documento de administrador exista, confirma que el proyecto activo en Firebase CLI sea el nuevo. El despliegue de reglas reemplaza las reglas existentes de ese proyecto. Luego ejecuta:

```sh
node scripts/generate-public-config.mjs
firebase deploy --only hosting,firestore:rules,storage
```

Los ajustes de Authentication y Analytics se habilitan desde Firebase Console. Las opciones del preset de Cloudinary también se administran desde Cloudinary; como la subida actual es unsigned, su nombre es público y debe estar restringido a formatos de imagen.
