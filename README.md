# Jabes — CMS (jabes-back)

CMS headless construido con [Strapi 5](https://strapi.io) para el sitio de vivero y jardinería **Jabes**. Expone vía API REST todo el contenido editable del frontend (páginas, productos, servicios, categorías y ajustes del sitio) y gestiona la subida de imágenes a **Cloudinary**.

## 🧱 Stack

- **Strapi** `5.48.0` (TypeScript)
- **Base de datos:** SQLite (`better-sqlite3`) por defecto
- **Provider de subida:** `@strapi/provider-upload-cloudinary` — las imágenes se almacenan en Cloudinary, no en disco
- **Node:** `>=20.0.0 <=24.x.x`

## ✨ Cambios respecto al proyecto inicial

- Se integró el **plugin de subida a Cloudinary** (`@strapi/provider-upload-cloudinary`). Toda imagen cargada desde el admin de Strapi se sube a la carpeta `jabes` en Cloudinary y se sirve desde `res.cloudinary.com`. Configurado en [`config/plugins.ts`](config/plugins.ts).
- Se ajustó la política de seguridad (CSP) en [`config/middlewares.ts`](config/middlewares.ts) para permitir imágenes y media desde `res.cloudinary.com`.
- Se habilitó **CORS** configurable por entorno mediante `CORS_ORIGIN` (varios orígenes separados por coma; por defecto `*`).
- Se agregó el campo **`price`** (tipo `decimal`) al content-type `product` para manejar el precio de cada producto.
- Se creó un **seed** que carga los productos reales del negocio y sube sus imágenes a Cloudinary (ver sección [🌱 Seed de datos](#-seed-de-datos)).

## 📦 Modelo de contenido

**Single Types** (páginas, una sola instancia):
- `home-page` — contenido de la página de inicio (hero, servicios y productos destacados)
- `services-page` — página de servicios
- `products-page` — página de productos
- `product-detail-page` — plantilla del detalle de producto
- `site-setting` — ajustes globales del sitio

**Collection Types** (registros múltiples):
- `product` — productos. Campos: `name`, `slug`, `description`, **`price`** (`decimal`), `features` (componente `shared.feature`), `image`, `gallery`, `category`, `seo`, `active`, `featured`
- `service` — servicios
- `category` — categorías de productos

**Componentes compartidos** (`src/components/shared`): `seo`, `feature`, `cta`, `button-link`, `nav-link`, `social-link`.

## 🔑 Variables de entorno

Copia `.env.example` a `.env` y completa los valores. Las claves de Cloudinary son obligatorias para la subida de imágenes:

```bash
HOST=0.0.0.0
PORT=1337
APP_KEYS="..."
API_TOKEN_SALT=...
ADMIN_JWT_SECRET=...
TRANSFER_TOKEN_SALT=...
JWT_SECRET=...
ENCRYPTION_KEY=...

# Cloudinary (subida de imágenes)
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

# Orígenes permitidos para CORS (separados por coma). Vacío = "*"
CORS_ORIGIN=
```

## 🚀 Puesta en marcha

```bash
npm install
npm run develop   # modo desarrollo con autoReload (admin en http://localhost:1337/admin)
```

### Scripts disponibles

| Script | Descripción |
| --- | --- |
| `npm run develop` / `npm run dev` | Inicia Strapi con autoReload (desarrollo) |
| `npm run start` | Inicia Strapi sin autoReload (producción) |
| `npm run build` | Compila el panel de administración |
| `npm run seed` | Compila y ejecuta el seed de productos (ver [🌱 Seed de datos](#-seed-de-datos)) |
| `npm run console` | Abre la consola de Strapi |
| `npm run upgrade` | Actualiza Strapi a la última versión |

## 🌱 Seed de datos

El script [`src/seed.ts`](src/seed.ts) carga los productos reales del negocio al CMS. Se ejecuta con:

```bash
npm run seed
```

Qué hace, a grandes rasgos:

1. **Lee** el catálogo desde `../products-real-data/products.json` (nombre, descripción, features, imagen, categoría y precio).
2. **Limpia** el catálogo actual: elimina los productos existentes y sus imágenes en Cloudinary, para regenerar todo desde cero (las categorías se conservan). ⚠️ Es un proceso **destructivo**.
3. **Crea o reutiliza** las categorías por su `slug`.
4. **Sube cada imagen a Cloudinary** (vía el provider de upload) y la enlaza al producto.
5. **Crea los productos** con sus `features`, `price`, imagen y categoría, publicados y listos para el frontend.

> Requiere las variables `CLOUDINARY_NAME`, `CLOUDINARY_KEY` y `CLOUDINARY_SECRET` definidas en el `.env`. Las imágenes deben existir en `products-real-data/images/`.

## ⚙️ Despliegue

Strapi admite múltiples opciones de despliegue (incluido [Strapi Cloud](https://cloud.strapi.io)). Consulta la [documentación de despliegue](https://docs.strapi.io/dev-docs/deployment). Recuerda definir las variables de entorno (incluidas las de Cloudinary y `CORS_ORIGIN` con el dominio del frontend) en el proveedor.

## 📚 Recursos

- [Documentación de Strapi](https://docs.strapi.io)
- [Provider de Cloudinary para Strapi](https://www.npmjs.com/package/@strapi/provider-upload-cloudinary)
