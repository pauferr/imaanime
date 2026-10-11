# AGENTS.md

Guía técnica de Ima Anime para quien trabaje en el código (personas o agentes). La descripción pública está en `README.md`.

## Stack

- [Astro](https://astro.build) 7, sitio **estático**. Sin frameworks de UI ni librerías de CSS: HTML, CSS nativo y TypeScript en `<script>` de Astro.
- Datos de [Jikan v4](https://docs.api.jikan.moe/) (API no oficial y gratuita de MyAnimeList): `GET /v4/seasons/now`.
- Node ≥ 22.12.

## Comandos

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
npm run preview  # sirve dist/
```

## Estructura

```
src/
  pages/index.astro       listado de la season: buscador, filtros, orden, modal
  pages/today.astro       emisiones de hoy con cuenta atrás
  layouts/Layout.astro    <head>, cabecera común (menú, selector de zona, switch JP/EN), variables CSS y estilos base
  components/Modal.astro  <dialog> de detalle (marcado, cierre y estilos)
  lib/jikan.ts            descarga paginada de Jikan, simplificación de datos, caché en memoria
  lib/time.ts             zonas/países, conversión de la hora de Japón a la local, "¿se emite hoy?"
  lib/modal.ts            openModal(anime): rellena y abre el modal
  data/season-now.json    datos de prueba con el mismo formato que Jikan
.github/workflows/refresh.yml  recompila en Vercel cada 6 h
```

## Cómo funciona

- **Datos al compilar**: `seasonNow()` descarga todas las páginas de Jikan (respeta su límite de 3 peticiones/s, reintenta si recibe un 429, elimina entradas repetidas y excluye el contenido para adultos) y se queda solo con los campos que usa la web. La página publicada es HTML estático: los visitantes nunca llaman a Jikan.
- **Si Jikan falla**: en `dev` se usan los datos de prueba con un aviso en la consola; en `build` se lanza un error para no publicar datos falsos (Vercel mantiene el despliegue anterior).
- **Datos en el cliente**: cada página incrusta los animes en `<script type="application/json" id="animes">` mediante `toJsonScript()`, que escapa `<` para que los datos no puedan cerrar la etiqueta.
- **Horarios**: Jikan da día y hora en JST (UTC+9, sin horario de verano). `lib/time.ts` los convierte a la zona del usuario. Horas como "25:30" (madrugada japonesa) se desbordan correctamente al día siguiente.
- **"Hoy" depende del usuario**: `/today` renderiza todos los animes ocultos y el cliente muestra los que se emiten hoy en su zona, cada segundo (cuenta atrás, cambio a "Emitido", paso de medianoche).
- **Preferencias**: la zona horaria (`tz`) y el idioma del nombre (`lang`) se guardan en `localStorage` (siempre dentro de try/catch). Los filtros de `/` se guardan en la URL.
- **Switch JP/EN**: solo CSS (`body:has(#lang-en:checked)`), sin JS para mostrar u ocultar.

## Convenciones

- Lo más simple que funcione: funciones nativas de la plataforma antes que dependencias, sin abstracciones especulativas. Los atajos deliberados llevan un comentario `ponytail:` que explica su límite.
- Los datos externos se insertan con `textContent`, nunca con `innerHTML`.
- Los comentarios y los textos de la interfaz están en español.
- Accesibilidad básica: elementos interactivos nativos (`<button>`, `<dialog>`, `<select>`), `:focus-visible` y `prefers-reduced-motion`.
- Los colores son variables CSS en `:root`, con modo oscuro mediante `prefers-color-scheme`.

## Despliegue

En Vercel, que detecta Astro sin configuración. `.github/workflows/refresh.yml` llama a un enlace de despliegue (deploy hook) cada 6 horas para recompilar con datos frescos; necesita el secreto `VERCEL_DEPLOY_HOOK` en GitHub Actions.
