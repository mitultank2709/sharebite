# API
REST API base path: `/api/v1`

- `POST /auth/register` – public registration, always CUSTOMER
- `POST /auth/login` – login, sets refresh cookie and returns access token
- `POST /auth/refresh` – rotates refresh token
- `POST /auth/logout` – revokes current refresh session
- `POST /auth/logout-all` – revoke all sessions for authenticated user
- `GET /auth/me` – current user
- `GET /food` – approved, available, non-expired listings
- `POST /food` – ADMIN creates a listing (pending approval)
- `GET /food/mine` – ADMIN's own listings
- `GET /admin/dashboard` – donor statistics
- `PATCH /admin/food/:id/approve|reject` – ADMIN approves/rejects own pending listing
- `GET /admin/requests` – requests for own listings
- `PATCH /admin/requests/:id/accept|reject|ready|complete` – request workflow
- `POST /requests` – CUSTOMER requests food
- `GET /requests/my` – CUSTOMER's own requests
- `PATCH /requests/:id/cancel` – CUSTOMER cancels eligible request

Access token is supplied as `Authorization: Bearer <token>`. Refresh token is an HTTP-only cookie.
