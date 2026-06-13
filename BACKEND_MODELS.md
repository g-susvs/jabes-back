# Jabes Back - Strapi CMS

This backend owns the editable content and public catalog for `jabes-front`.

## Content types

- `Category`: product categories with `name`, `slug`, `active`, `description`, `order`.
- `Product`: catalog products with `name`, `slug`, `description`, repeatable `features`, `active`, `image`, optional `gallery`, `category`, `seo`, `featured`.
- `Service`: gardening services with `title`, `slug`, `description`, `image`, `icon`, `active`, `order`, `featured`, `seo`.
- `Home Page`: single type for hero, highlighted services/products and SEO.
- `Services Page`: single type for banner copy, main title, service selection, CTA and SEO.
- `Products Page`: single type for banner copy, listing texts and SEO.
- `Site Settings`: single type for logo, contact data, navigation, footer and social links.

## Environment variables used by the frontend

Add these to the frontend when integrating:

```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=
```

Keep Strapi's own `.env` values in this backend project.

## Public API examples

Use `populate` when the frontend needs relations, media or components:

```txt
GET /api/products?filters[active][$eq]=true&populate=image,category,features,seo
GET /api/products?filters[slug][$eq]=product-slug&populate=*
GET /api/categories?filters[active][$eq]=true&sort=order:asc
GET /api/services?filters[active][$eq]=true&sort=order:asc&populate=image,seo
GET /api/home-page?populate=*
GET /api/services-page?populate=*
GET /api/products-page?populate=*
GET /api/site-setting?populate=*
```

## Admin permissions

Content editing is handled by Strapi Admin. Public reads should be enabled either by:

- Creating a read-only API token and using it from the Next.js server side.
- Or enabling `find` and `findOne` permissions for the Public role on the content types that can be visible publicly.

Keep create/update/delete protected in Strapi Admin.
