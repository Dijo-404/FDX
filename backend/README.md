# Backend

The backend is the `fdx-detector` container started by `../run.sh`.

It runs only `exadel/compreface-core:1.2.0` and exposes the unauthenticated face detection endpoint:

```text
POST /find_faces
```

The upstream admin service, API service, Postgres service, login flow, and user-management files are intentionally not included.
