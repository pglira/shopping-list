# Shopping list

A Progressive Web App for a shopping list.

- Add an item with the + button, with an optional quantity such as "2" or "500 g".
- The form for a new item shows earlier items. Tap one to add it to the list again.
- Tap the checkbox of an item to put it into the cart. Tap it again to take it out of the cart.
- Tap an item to edit it.
- Items to buy show in the order of creation. Items in the cart show below, the most recent first.
- Swipe an item to the left to show Edit and Delete. Delete asks for a second tap.
- Remove all items in the cart with "Clear" and a second tap.

## Tech

- React, TypeScript and Vite
- `vite-plugin-pwa` for the manifest, the service worker and the offline cache
- `localStorage` for the data

## Development

```bash
npm install
npm run dev
```

## Deployment

The GitHub Actions workflow `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on each push to `main`. The app is served at `https://pglira.github.io/shopping-list/`.

## Install on iOS

Open the URL in Safari, tap Share and select "Add to Home Screen".
