# API Usage

This document describes how to use the frontend API client (`src/lib/api.ts`).

## Structure

All API methods are organized into namespace objects:

```typescript
import { auth, profiles, projects, jobs, favorites, follows, billing } from "../lib/api";
```

## Request Pattern

Every API call:
- Returns a typed `Promise<T>`
- Includes credentials (cookies) automatically
- Sets `Content-Type: application/json`
- Throws `ApiError` on non-2xx responses

## Error Handling

```typescript
import { ApiError } from "../lib/api";

try {
  const data = await profiles.list();
} catch (err) {
  if (err instanceof ApiError) {
    console.log(err.status);     // HTTP status code (e.g., 404)
    console.log(err.statusText); // HTTP status text (e.g., "Not Found")
    console.log(err.message);    // Error message from body or statusText
    console.log(err.body);       // Raw response body { error?: string }
  }
}
```

## Response Shape

All endpoints return objects with a named key:

```typescript
// Single item
const { profile } = await profiles.get("zach");
const { project } = await projects.get("abc123");
const { job } = await jobs.get("xyz789");

// Lists
const { profiles } = await profiles.list();
const { projects } = await projects.list();
const { jobs } = await jobs.list();
const { favorites } = await favorites.list();
const { follows } = await follows.list();

// Actions
const { message } = await auth.logout();
const { url } = await billing.checkout();
```

## Available Methods

### auth

| Method | Endpoint | Returns |
|--------|----------|---------|
| `auth.login(email)` | POST /auth/login | `{ message, token? }` |
| `auth.logout()` | POST /auth/logout | `{ message }` |
| `auth.me()` | GET /auth/me | `{ user, profile }` |

### profiles

| Method | Endpoint | Returns |
|--------|----------|---------|
| `profiles.list()` | GET /api/profiles | `{ profiles: ProfileListItem[] }` |
| `profiles.get(handle)` | GET /api/profiles/:handle | `{ profile: Profile }` |
| `profiles.me()` | GET /api/profiles/me | `{ profile: Profile }` |
| `profiles.create(data)` | POST /api/profiles | `{ profile: Profile }` |
| `profiles.update(data)` | PUT /api/profiles/me | `{ profile: Profile }` |
| `profiles.submit()` | POST /api/profiles/me/submit | `{ profile, message }` |

### projects

| Method | Endpoint | Returns |
|--------|----------|---------|
| `projects.list()` | GET /api/projects | `{ projects: ProjectListItem[] }` |
| `projects.get(id)` | GET /api/projects/:id | `{ project: ProjectDetail }` |
| `projects.mine()` | GET /api/projects/mine | `{ projects: Project[] }` |
| `projects.create(data)` | POST /api/projects | `{ project: Project }` |
| `projects.update(id, data)` | PUT /api/projects/:id | `{ project: Project }` |
| `projects.delete(id)` | DELETE /api/projects/:id | `{ message }` |

### jobs

| Method | Endpoint | Returns |
|--------|----------|---------|
| `jobs.list()` | GET /api/jobs | `{ jobs: JobListItem[] }` |
| `jobs.get(id)` | GET /api/jobs/:id | `{ job: JobDetail }` |
| `jobs.mine()` | GET /api/jobs/mine | `{ jobs: Job[] }` |
| `jobs.create(data)` | POST /api/jobs | `{ job: Job }` |
| `jobs.update(id, data)` | PUT /api/jobs/:id | `{ job: Job }` |
| `jobs.delete(id)` | DELETE /api/jobs/:id | `{ message }` |

### favorites

| Method | Endpoint | Returns |
|--------|----------|---------|
| `favorites.list()` | GET /api/favorites | `{ favorites: FavoriteItem[] }` |
| `favorites.add(profileId)` | POST /api/favorites/:profileId | `{ favorite: { id } }` |
| `favorites.remove(profileId)` | DELETE /api/favorites/:profileId | `{ message }` |
| `favorites.check(profileId)` | GET /api/favorites/check/:profileId | `{ favorited: boolean }` |

### follows

| Method | Endpoint | Returns |
|--------|----------|---------|
| `follows.list()` | GET /api/follows | `{ follows: FollowItem[] }` |
| `follows.add(projectId)` | POST /api/follows/:projectId | `{ follow: { id } }` |
| `follows.remove(projectId)` | DELETE /api/follows/:projectId | `{ message }` |
| `follows.check(projectId)` | GET /api/follows/check/:projectId | `{ following: boolean }` |

### billing

| Method | Endpoint | Returns |
|--------|----------|---------|
| `billing.status()` | GET /billing/status | `{ isEmployer, hasStripeAccount }` |
| `billing.checkout()` | POST /billing/checkout | `{ url }` |
| `billing.portal()` | POST /billing/portal | `{ url }` |

### uploads

| Method | Endpoint | Returns |
|--------|----------|---------|
| `uploads.image(file, type)` | POST /api/uploads/image | `{ url, filename }` |

**Note:** The `uploads.image()` method sends a multipart form upload. The `type` parameter is optional and defaults to `"portrait"`. It can be `"portrait"` or `"project"`.

```typescript
// Upload a profile portrait
const file = inputRef.current.files[0];
const { url } = await uploads.image(file, "portrait");
// Update profile with the new URL
await profiles.update({ portraitUrl: url });
```

## Usage Examples

### Fetching data in a component

```typescript
const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  profiles
    .list()
    .then((data) => {
      setProfiles(data.profiles);
      setIsLoading(false);
    })
    .catch((err) => {
      setError(err.message);
      setIsLoading(false);
    });
}, []);
```

### Toggle action (favorites/follows)

```typescript
const [isFavorited, setIsFavorited] = useState(false);
const [isLoading, setIsLoading] = useState(false);

const toggle = async () => {
  setIsLoading(true);
  try {
    if (isFavorited) {
      await favorites.remove(profileId);
      setIsFavorited(false);
    } else {
      await favorites.add(profileId);
      setIsFavorited(true);
    }
  } catch {
    // Handle error
  }
  setIsLoading(false);
};
```

### Redirect to Stripe

```typescript
const handleCheckout = async () => {
  try {
    const { url } = await billing.checkout();
    window.location.href = url;
  } catch (err) {
    setError(err.message);
  }
};
```

## Types

Import types from `src/data/types.ts` or directly from the API module:

```typescript
// From types
import type { Profile, Project, Job } from "../data/types";

// From API module (extended types)
import type {
  ProfileCreateData,
  ProfileUpdateData,
  ProjectDetail,
  JobDetail,
  FavoriteItem,
  FollowItem,
  AuthMeResponse,
} from "../lib/api";
```

## Dev Proxy

In development, Vite proxies API requests to the backend:

- `/auth/*` -> `http://localhost:3000`
- `/api/*` -> `http://localhost:3000`
- `/billing/*` -> `http://localhost:3000`
- `/admin/*` -> `http://localhost:3000`

See `vite.config.ts` for configuration.
