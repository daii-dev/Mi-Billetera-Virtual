# Mi Billetera Virtual

Aplicación móvil desarrollada con **React Native + Expo + TypeScript**, utilizando **Clerk** para autenticación y **Supabase** como backend en la nube.

## Instalar dependencias

#### Dentro de la carpeta:
frontend/mobile

##### Primero instalar las dependencias del proyecto:

```bash
npm install --legacy-peer-deps
```
#### Luego corregir dependencias de Expo si aparece algún aviso:

```bash
npx expo install --fix
```
## Variables de entorno
#### Crear un archivo .env dentro de:
frontend/mobile/.env

##### Usar como referencia el archivo:
frontend/mobile/.env.example
#### Dentro del archivo .env, copiar lo siguiente:
- EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YXB0LXN3YW4tNzQuY2xlcmsuYWNjb3VudHMuZGV2JA
- EXPO_PUBLIC_SUPABASE_URL=https://hhbjaxjmectcidnyagzu.supabase.co
- EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_vqrCf9hciELCLhuemp9WhQ_vEn9fvix

## Levantar el proyecto

#### Dentro de la carpeta:
frontend/mobile

##### Ejecutar:

```bash
npx expo start --clear
```
##### También se puede usar:

```bash
npx expo start --go --clear
```

## Abrir en celular Android
- Instalar Expo Go en el celular.
- Asegurarse de que la computadora y el celular estén conectados a la misma red WiFi.
- Escanear el QR desde la aplicación Expo Go.
- Esperar a que cargue la aplicación.