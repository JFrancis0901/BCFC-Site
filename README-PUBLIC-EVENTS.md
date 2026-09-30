# BCFC public events

The Workers Calendar already has a **Post this activity on the public BCFC website** checkbox.

When checked, the event is saved with `public: true`. The public website reads only those events.

## IMPORTANT: deploy the Firestore rules

Vercel deploys the website files, but it does **not** automatically deploy Firestore security rules.
The included `workers/firestore.rules` must be deployed to the Firebase project `bcfc-workers`.

### Firebase Console method

1. Open Firebase Console for **bcfc-workers**.
2. Open **Firestore Database** → **Rules**.
3. Replace the existing rules with the contents of `workers/firestore.rules` from this project.
4. Click **Publish**.

The important rule is:

```text
allow read: if coll in ['events', ...]
  && (signedIn() || (coll == 'events' && resource.data.public == true));
```

The public page uses `where("public", "==", true)`, so unauthenticated visitors can only receive events explicitly marked public.

### Firebase CLI method

From the project root:

```bash
firebase deploy --only firestore:rules
```

The included `firebase.json` points Firebase CLI to `workers/firestore.rules`.

## Existing event

If the event was created before the public-post checkbox was added, edit it in Workers, check:

**Post this activity on the public BCFC website**

and save it. It will then appear on `/public` and the public Events page.
