import { createStrapi } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

// Nombres legibles para cada slug de categoría (fallback: el propio slug)
const CATEGORY_NAMES: Record<string, string> = {
  'plantas-y-grass': 'Plantas y Grass',
  'fertilizantes-y-abonos': 'Fertilizantes y Abonos',
  'tierras-y-sustratos': 'Tierras y Sustratos',
  'piedras-decorativas': 'Piedras Decorativas',
};

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

interface ProductSeed {
  name: string;
  description?: string;
  features?: string[];
  image?: string;
  category: string;
  price?: number | null;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Sube un archivo local a la librería de medios (que va a Cloudinary por config)
// y devuelve el registro del archivo creado.
async function uploadImage(strapi: any, absPath: string) {
  const stats = fs.statSync(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const [file] = await strapi.plugin('upload').service('upload').upload({
    data: {},
    files: {
      filepath: absPath,
      originalFilename: path.basename(absPath),
      mimetype: MIME_BY_EXT[ext] ?? 'application/octet-stream',
      size: stats.size,
    },
  });
  return file;
}

// Borra todos los productos existentes y sus imágenes asociadas en Cloudinary,
// para regenerar el catálogo desde cero. Las categorías se conservan.
async function cleanProducts(strapi: any) {
  const products = await strapi.db.query('api::product.product').findMany({
    populate: { image: true },
  });

  const removedFiles = new Set<number>();
  const removedDocs = new Set<string>();

  for (const product of products) {
    // Borra la imagen del proveedor (Cloudinary) y de la librería de medios
    if (product.image && !removedFiles.has(product.image.id)) {
      removedFiles.add(product.image.id);
      try {
        await strapi.plugin('upload').service('upload').remove(product.image);
      } catch (err) {
        strapi.log.warn(`No se pudo borrar la imagen id ${product.image.id}: ${(err as Error).message}`);
      }
    }

    if (!removedDocs.has(product.documentId)) {
      removedDocs.add(product.documentId);
      await strapi.documents('api::product.product').delete({ documentId: product.documentId });
    }
  }

  strapi.log.info(`Limpieza previa: ${removedDocs.size} productos y ${removedFiles.size} imágenes eliminados.`);
}

async function run() {
  console.log('Sembrando productos reales...');

  // distDir permite que Strapi cargue la config al ejecutarse directo con node
  const strapi = createStrapi({ distDir: './dist' });
  await strapi.load();

  // process.cwd() es jabes-back; subimos un nivel a la carpeta jabes
  const dataDir = path.join(process.cwd(), '..', 'products-real-data');
  const dataPath = path.join(dataDir, 'products.json');

  if (!fs.existsSync(dataPath)) {
    strapi.log.error(`No se encontró el archivo de datos en ${dataPath}`);
    await strapi.destroy();
    process.exit(1);
  }

  const products: ProductSeed[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Borra los productos existentes (y sus imágenes) antes de recrearlos
  await cleanProducts(strapi);

  const categoryCache = new Map<string, string>(); // slug -> documentId
  let created = 0;

  for (const item of products) {
    // 1) Categoría: buscar o crear por slug
    let categoryId = categoryCache.get(item.category);
    if (!categoryId) {
      const existingCats = await strapi.documents('api::category.category').findMany({
        filters: { slug: item.category },
      });
      let category = existingCats[0];
      if (!category) {
        category = await strapi.documents('api::category.category').create({
          data: {
            name: CATEGORY_NAMES[item.category] ?? item.category,
            slug: item.category,
            active: true,
          },
          status: 'published',
        });
        strapi.log.info(`Categoría creada: ${category.name}`);
      }
      categoryId = category.documentId;
      categoryCache.set(item.category, categoryId);
    }

    // 2) Slug del producto
    const slug = toSlug(item.name);

    // 3) Subir imagen a Cloudinary (si el archivo existe)
    let imageId: number | undefined;
    if (item.image) {
      const absImage = path.join(dataDir, item.image);
      if (fs.existsSync(absImage)) {
        try {
          const uploaded = await uploadImage(strapi, absImage);
          imageId = uploaded.id;
          strapi.log.info(`Imagen subida (${item.name}): ${uploaded.url}`);
        } catch (err) {
          strapi.log.error(`Error subiendo imagen de ${item.name}: ${(err as Error).message}`);
        }
      } else {
        strapi.log.warn(`Imagen no encontrada, se crea sin imagen: ${absImage}`);
      }
    }

    // 4) Crear producto
    await strapi.documents('api::product.product').create({
      data: {
        name: item.name,
        slug,
        description: item.description ?? '',
        features: (item.features ?? []).map((text) => ({ text })),
        ...(item.price != null ? { price: item.price } : {}),
        ...(imageId ? { image: imageId } : {}),
        active: true,
        featured: true,
        category: categoryId,
      },
      status: 'published',
    });
    strapi.log.info(`Producto creado: ${item.name}`);
    created++;
  }

  strapi.log.info(`Seed finalizado. Productos creados: ${created}.`);

  await strapi.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error durante el seed:', err);
  process.exit(1);
});
