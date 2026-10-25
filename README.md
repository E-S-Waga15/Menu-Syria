# Menu Syria Frontend

واجهة **منيو سوريا** لإدارة المطاعم والمتاجر السورية، وإنشاء منيو QR ومنيو
رقم احترافي ومتاجر إلكترونية بهوية النشاط التجاري.

## النشر على Vercel

1. اربط مستودع GitHub بمشروع جديد في Vercel، واترك **Framework Preset** على
   `Next.js` و**Build Command** على `npm run build`.
2. أضف متغيرات البيئة من [.env.example](./.env.example) إلى بيئتي Production
   وPreview. يجب أن يطابق `NEXT_PUBLIC_SITE_URL` النطاق الأساسي الفعلي للموقع،
   وهو `https://menusyria.app`.
3. بعد النشر، تحقّق من:
   - `/ar` و`/en`
   - `/sitemap.xml` و`/robots.txt`
   - `/icon.png` و`/apple-icon.png` و`/manifest.webmanifest`
4. إعدادات [next.config.ts](./next.config.ts) تسمح بتحسين صور Unsplash وصور
   API الإنتاجية. يجب إبقاء روابط الصور `https` وعدم حجبها في إعدادات النطاق
   أو التخزين.

## التطوير

```bash
npm install
npm run dev
```
