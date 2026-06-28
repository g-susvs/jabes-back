import { createStrapi } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('Seeding mock products...');
  
  // We specify distDir so Strapi loads the config properly when run directly via node
  const strapi = createStrapi({ distDir: './dist' });
  await strapi.load();

  // process.cwd() is jabes-back, go up to jabes folder
  const dataPath = path.join(process.cwd(), './products-mock-data.json');
  
  if (!fs.existsSync(dataPath)) {
    strapi.log.error(`Mock data not found at ${dataPath}`);
    await strapi.destroy();
    return;
  }

  const mockData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  let count = 0;

  for (const item of mockData) {
    // 1. Check or create category
    let categories = await strapi.documents('api::category.category').findMany({
      filters: { slug: item.categorySlug }
    });
    
    let category = categories.length > 0 ? categories[0] : null;

    if (!category) {
      category = await strapi.documents('api::category.category').create({
        data: {
          name: item.category,
          slug: item.categorySlug,
          active: true
        },
        status: 'published'
      });
      strapi.log.info(`Created category: ${item.category}`);
    }

    // 2. Create product
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // Check if product exists to avoid duplicates
    const existing = await strapi.documents('api::product.product').findMany({
      filters: { slug }
    });

    if (existing.length === 0) {
      await strapi.documents('api::product.product').create({
        data: {
          name: item.name,
          slug: slug,
          description: item.description,
          features: item.features.map((f: string) => ({ text: f })),
          active: true,
          featured: true,
          category: category.documentId
        },
        status: 'published'
      });
      strapi.log.info(`Created product: ${item.name}`);
      count++;
    } else {
      strapi.log.info(`Product already exists: ${item.name}`);
    }
  }

  strapi.log.info(`Finished seeding! ${count} products created.`);
  
  // Cleanly shut down strapi after seeding
  await strapi.destroy();
  process.exit(0);
}

run().catch(err => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
