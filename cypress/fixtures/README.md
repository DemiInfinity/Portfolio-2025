# Cypress Test Fixtures

This directory contains mock data for Cypress E2E tests. All API endpoints are intercepted and return mock responses, ensuring tests run consistently without depending on actual backend data or database state.

## Fixtures

### `api-responses.json`
Contains mock API responses for all frontend endpoints:
- **projects**: Mock project data for homepage and projects page
- **blogPosts**: Mock blog posts list (without content)
- **blogPost**: Mock individual blog post (with full content)
- **learning**: Mock learning items
- **skills**: Mock skills data
- **workHistory**: Mock work experience entries
- **education**: Mock education entries (with achievements)
- **certifications**: Mock certification entries
- **featureFlags**: Mock feature flags (maintenance mode)

### `admin-auth.json`
Contains mock authentication data for admin panel tests:
- **validCredentials**: Test-only admin credentials
- **invalidCredentials**: Invalid credentials for negative tests
- **loginSuccess**: Mock successful login response
- **loginFailure**: Mock failed login response
- **userData**: Mock user data response

## How It Works

All API intercepts are set up globally in `cypress/support/e2e.ts` using `beforeEach()` hook. This ensures:

1. **Consistent test data**: Tests always use the same mock data
2. **No backend dependency**: Tests don't require a running backend
3. **Fast execution**: No network calls to actual APIs
4. **Deterministic results**: Tests produce the same results every time

## API Endpoints Mocked

All API calls to the following endpoints are intercepted:
- `GET /api/projects` → Mock projects data
- `GET /api/blog` → Mock blog posts list
- `GET /api/blog/:slug` → Mock individual blog post
- `GET /api/learning` → Mock learning items
- `GET /api/skills` → Mock skills data
- `GET /api/work-history` → Mock work history
- `GET /api/education` → Mock education entries
- `GET /api/certifications` → Mock certifications
- `GET /api/feature-flags/maintenance` → Mock maintenance mode
- `POST /api/analytics/track` → Mock analytics tracking
- `POST /api/auth/login` → Mock admin login (in admin-login.steps.ts)
- `GET /api/auth/me` → Mock user data (in admin-login.steps.ts)
- `POST /api/auth/logout` → Mock logout (in admin-login.steps.ts)

## Adding New Mocks

To add a new API mock:

1. Add the response structure to `api-responses.json`
2. Add the intercept in `cypress/support/e2e.ts` `beforeEach()` hook
3. Use `cy.wait('@aliasName')` in step definitions to wait for API calls

## Notes

- All mocks use test-only data - never use real credentials or sensitive data
- Admin login tests use separate mocks in `admin-auth.json` with test-only credentials
- API responses match the backend structure exactly for consistency
