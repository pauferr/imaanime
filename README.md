# 今 Ima Anime

Animes en emisión de la season actual, con la nota de MyAnimeList y los horarios en la hora local de cada usuario.

- **`/`**: todos los animes de la season, con buscador, filtros por género y día, orden y switch de nombre JP/EN.
- **`/today`**: lo que se emite hoy, con cuenta atrás hasta el nuevo capítulo y la insignia "Emitido".

Hecho con [Astro](https://astro.build) (sitio estático, sin frameworks de UI) y datos de [Jikan](https://jikan.moe), la API no oficial y gratuita de MyAnimeList.

## Desarrollo

Requiere Node 22.12 o superior.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
npm run preview  # sirve dist/
```

Si Jikan no responde, `npm run dev` usa los datos de prueba de `src/data/season-now.json` y avisa en la consola. `npm run build` falla a propósito para no publicar datos falsos.

## Cómo funciona

- **Datos**: se descargan de Jikan una vez, al compilar (`src/lib/jikan.ts`). La página publicada es HTML estático, así que los visitantes nunca llaman a Jikan.
- **Zona horaria**: se detecta en el navegador y se puede cambiar con el selector de bandera; se guarda en `localStorage`. Jikan da los horarios en hora de Japón y se convierten en el cliente (`src/lib/time.ts`).
- **Preferencias del usuario** (zona, idioma del nombre): en `localStorage`. Los filtros de `/` van en la URL, así que se pueden compartir.

```
src/
  pages/index.astro       listado de la season
  pages/today.astro       emisiones de hoy con cuenta atrás
  layouts/Layout.astro    cabecera común (menú, bandera, switch JP/EN) y estilos base
  components/Modal.astro  modal de detalle
  lib/jikan.ts            descarga y simplificación de los datos de Jikan
  lib/time.ts             horarios: hora de Japón → hora local
  lib/modal.ts            rellena y abre el modal
  data/season-now.json    datos de prueba (mismo formato que Jikan)
```

## Despliegue (Vercel)

1. Importar el repositorio en Vercel; detecta Astro sin configurar nada.
2. **Datos actualizados**: `.github/workflows/refresh.yml` pide a Vercel una nueva compilación cada 6 horas. Para activarlo:
   - Vercel → Project → Settings → Git → **Deploy Hooks**: crear uno.
   - GitHub → Settings → Secrets and variables → Actions: guardar su URL como `VERCEL_DEPLOY_HOOK`.

   También se puede lanzar a mano desde la pestaña Actions ("Refrescar datos" → Run workflow). Si Jikan está caído, la compilación falla y Vercel mantiene la versión anterior.
