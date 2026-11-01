# Shopping list

A Progressive Web App for a shopping list.

- Add an item with the + button, with an optional quantity such as "2" or "500 g".
- The form for a new item shows earlier items, the most used first. Tap one to add it to the list again.
- While you type a name, the form suggests up to 5 earlier items: names that start with the text first, then names that contain it, the most used first. Tap a name to fill the field, or tap its + to add the item at once.
- Tap an item to put it into the cart. Tap it again to take it out of the cart.
- Items to buy show in the order of creation. Items in the cart show below, the most recent first.
- Swipe an item to the left to show Edit and Delete. Delete asks for a second tap.
- Remove all items in the cart with "Clear" and a second tap.
- Move the data to a new phone: tap the backup button in the header and export all data to a JSON file. On the new phone, import the file and tap "Tap to replace all data". The theme is not in the file.

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
