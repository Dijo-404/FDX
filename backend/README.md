# Backend

The backend is the `detector` service in `../docker-compose.yml`.

It runs only `exadel/compreface-core:1.2.0` and exposes the unauthenticated face detection endpoint:

```text
POST /find_faces
```

The upstream admin service, API service, Postgres service, login flow, and user-management files are intentionally not included.
