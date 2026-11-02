# Rajveerr Awachat — Portfolio

A personal portfolio built with React, Vite and GSAP. The visual system follows the supplied personal brand palette: Ivory `#F7F4ED`, Marine Navy `#172A3A` and Soft Sky Blue `#B9DCEB`, with Cormorant Garamond, Manrope, Inter and Space Grotesk typography.

## Run locally

1. Install Node.js 20 or newer.
2. Extract this folder.
3. Open a terminal in the project folder and run:

```bash
npm install
npm run dev
```

4. Open the local URL printed by Vite (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

The production site is generated in `dist/`.

## Deploy to Vercel (free tier)

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected Vite settings: build command `npm run build`, output directory `dist`.
4. Deploy. No environment variables are required for this version.

## Updating portfolio content

- **Projects:** edit `src/data/projects.js`. Each project's name, summary, longer description, tags, status, link and note live there.
- **Portrait:** replace `public/images/rajveerr-pose-crossed.png` with another transparent PNG portrait using the same filename.
- **Social links and email:** update the URLs in `src/main.jsx`.
- **Page copy and sections:** edit `src/main.jsx`.
- **Colours, typography and responsive layout:** edit `src/styles.css`.

## Current project entries

The five requested project entries are included as initial placeholders. JARVIS uses details from its public repository; the remaining project entries intentionally stay conservative until their exact descriptions, repositories and demos are supplied. F1 Garage is not included.

## Notes

- The hero uses a lightweight canvas particle field with cursor repulsion, connected particle threads and click ripples.
- The hero uses an integrated transparent cutout portrait beside the tagline, with one fixed arms-crossed portrait cutout, subtle pointer parallax and atmospheric lighting.
- GSAP + ScrollTrigger animate the hero entrance, section reveals, project cards and toolkit rows.
- A delayed custom cursor ring responds to interactive elements on mouse/trackpad devices; touch devices retain the native pointer. The particle field reacts across the entire portrait stage—including when the pointer is over the portrait—using a wider repulsion radius, directional wake, connected local particle threads and click ripples.
- The site includes responsive layouts, semantic sections, reduced-motion handling and basic SEO/social metadata.
- The Google Fonts stylesheet requires an internet connection; system fallbacks remain available if fonts cannot load.
- Add a résumé file and update the contact section when ready. No résumé is fabricated or included yet.

## Hero portrait

The hero uses only the arms-crossed portrait shown in the latest approved reference. There is no pose selector, automatic pose switching or alternate portrait state. The portrait stays fixed while the particle field and subtle pointer parallax remain interactive.
