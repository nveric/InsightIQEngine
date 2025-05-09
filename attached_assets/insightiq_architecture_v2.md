# **Project Title: InsightIQ (AI-Powered SaaS BI Platform)**

**Core Technologies:**

* **Backend:** Django (Python Web Framework)
* **Multi-Tenancy:** `django-tenants` (Shared Database, Separate Schemas on PostgreSQL)
* **Frontend Styling:** Tailwind CSS (via Play CDN for development)
* **Application Database:** PostgreSQL (for storing shared data, tenant metadata, and tenant-specific schemas)
* **Frontend Interactivity:** HTMX and/or Alpine.js
* **AI/ML:** Python libraries (e.g., `transformers`, `spacy`, `scikit-learn`, `langchain`), potentially external AI APIs.
* **Data Connectivity:** `psycopg2-binary` (for PostgreSQL), `mysqlclient`, `pyodbc`, etc.
* **Charting:** Chart.js or Plotly.js (JavaScript libraries)
* **Background Tasks:** Celery with Redis or RabbitMQ (tenant-aware).

**Guiding Principles:**

* **Modularity & Reusability**
* **Tenant Data Isolation & Security**
* **Intuitive User Experience (SaaS-focused)**
* **Scalability & Extensibility**
* **UI Consistency:** Aim for a clean, modern UI aesthetic similar to the provided image references, featuring a primary blue accent, light grays, and clear typography.

---

**Document Structure:**

1.  **Overview & Core Abstractions**
2.  **Detailed Abstraction Breakdown** (Updated for multi-tenancy and UI)
    * Project Setup & Multi-Tenancy Foundation
    * User Management & Authentication (Shared, with UI styling)
    * Data Source Management (Tenant-Specific)
    * Schema Browse & Metadata Caching (Tenant-Specific)
    * Query Engine (SQL Execution, Tenant-Specific, with UI styling for SQL Builder)
    * AI-Powered Natural Language Querying (NLQ, Tenant-Specific)
    * Visualization Layer (Tenant-Specific)
    * Saving & Managing Questions (Analyses, Tenant-Specific)
    * Dashboarding (Tenant-Specific, with UI styling)
    * Permissions & Access Control (Within Tenant Context)
    * AI-Powered Automated Insights (Tenant-Specific)
    * Background Task Processing (Tenant-Aware)
    * Frontend Architecture (Shared Layouts, Tailwind CDN, JS)
    * Deployment Considerations (Multi-Tenant)
3.  **Security Considerations (Multi-Tenant)**
4.  **Scalability Considerations (Multi-Tenant)**
5.  **Future Enhancements**

---

## 1. Overview & Core Abstractions

InsightIQ will be a multi-tenant SaaS platform replicating Metabase's core BI functionalities, enhanced with AI. The architecture uses `django-tenants` to provide strong data isolation per customer organization (tenant). Each tenant will have its own PostgreSQL schema for its specific data (data sources, questions, dashboards), while shared data (users, tenant metadata) resides in a public schema.

The UI will feature a consistent layout: a top navigation bar (logo, global search, "+ New" button, user profile) and a left sidebar for primary navigation within the application (Home, Collections, Browse Data, Settings). The styling will utilize Tailwind CSS (via CDN for now), drawing inspiration from the provided UI mockups for login, dashboards, and the SQL builder.

**Core Abstractions (Logical Build Order, adapted for Multi-Tenancy):**

1.  **Project Setup & Multi-Tenancy Foundation:** Django project, `django-tenants` integration, shared/tenant app configuration, base templates reflecting common UI layout.
2.  **User Management & Authentication (Shared):** Custom User model (email as username), login/auth views styled per reference.
3.  **Data Source Management (Tenant-Specific):** Securely storing connection details within each tenant's schema.
4.  **Schema Browse & Metadata Caching (Tenant-Specific):** Introspecting tenant's data sources. UI element for SQL Builder.
5.  **Query Engine (SQL Execution, Tenant-Specific):** SQL editor UI styled per reference, running queries against tenant data sources.
6.  **Visualization Layer (Tenant-Specific):** Displaying query results.
7.  **Saving & Managing Questions (Analyses, Tenant-Specific).**
8.  **AI-Powered Natural Language Querying (NLQ, Tenant-Specific).**
9.  **Dashboarding (Tenant-Specific):** UI styled per reference (filters, chart grid).
10. **Permissions & Access Control (Within Tenant Context).**
11. **AI-Powered Automated Insights (Tenant-Specific).**
12. **Background Task Processing (Tenant-Aware).**
13. **Frontend Architecture (Shared Layouts, Tailwind CDN, JS).**
14. **Deployment Considerations (Multi-Tenant).**

---

## 2. Detailed Abstraction Breakdown

### Abstraction 1: Project Setup & Multi-Tenancy Foundation

* **Goal:** Establish the Django project, integrate `django-tenants`, configure shared and tenant-specific apps, PostgreSQL backend, and base templates reflecting the common UI layout (top bar, sidebar).
* **Libraries:** `django`, `django-tenants[drf]`, `psycopg2-binary`.
* **Django Implementation:**
    * `django-admin startproject insightiq_project .`
    * `python manage.py startapp tenancy` (for Tenant, Domain models - SHARED).
    * `python manage.py startapp core` (for shared base templates, public homepage - SHARED).
    * `python manage.py startapp users` (for CustomUser model - SHARED).
    * Tenant-specific apps: `datasource`, `querying`, `visualization`, `dashboard`, `ai_features` (all added to `TENANT_APPS`).
    * **`settings.py` Configuration:**
        * `DATABASE_ENGINE`: `django_tenants.postgresql_backend`.
        * `DATABASE_ROUTERS`: `('django_tenants.routers.TenantSyncRouter',)`.
        * `TENANT_MODEL = "tenancy.Tenant"`, `TENANT_DOMAIN_MODEL = "tenancy.Domain"`.
        * `SHARED_APPS`: `django_tenants`, `tenancy`, `users`, `core`, `django.contrib.auth`, `django.contrib.contenttypes`, etc.
        * `TENANT_APPS`: `datasource`, `querying`, `dashboard`, etc. (apps whose data is schema-specific).
        * `INSTALLED_APPS`: `list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]`.
        * `MIDDLEWARE`: `django_tenants.middleware.main.TenantMainMiddleware` (first).
        * `ROOT_URLCONF = 'insightiq_project.urls'`, `PUBLIC_SCHEMA_URLCONF = 'core.urls'`.
    * **`tenancy/models.py`:** Define `Tenant(TenantMixin)` and `Domain(DomainMixin)`.
    * **`insightiq_project/urls.py`:** Include URLs for shared apps (admin, accounts, core).
    * **`core/urls.py`:** Define URLs for the public-facing site (homepage, signup if public).
    * **Tailwind CSS CDN:**
        * Remove `django-tailwind-cli` dependencies if previously added.
        * In `base.html` (and `base_public.html`), include `<script src="https://cdn.tailwindcss.com"></script>` in the `<head>`.
        * **Note:** Acknowledge CDN is for development; production would ideally use a build step.
    * **Base Templates (`core/templates/base_app.html`, `base_public.html`):**
        * `base_public.html`: Minimal layout for unauthenticated pages (e.g., login, signup). Will use the CDN script.
        * `base_app.html`: Layout for authenticated users. Incorporate:
            * **Top Navigation Bar:** Placeholder for Logo, Global Search, "+ New" button, User Profile Dropdown.
            * **Left Sidebar:** Placeholder for navigation links (Home, Collections, Browse Data, Settings).
            * Main content area (`{% block content %}`).
            * Styled with Tailwind classes to reflect the general aesthetic from uploaded images.
    * **Migrations:**
        * `python manage.py makemigrations <shared_app_names>`
        * `python manage.py migrate_schemas --shared`
        * Create `public` tenant and dev tenant (e.g., `dev` schema with `localhost` domain) via shell.
        * `python manage.py makemigrations <tenant_app_names>`
        * `python manage.py migrate_schemas --sync_schemas` (or `--schema=<dev_schema_name>`).

### Abstraction 2: User Management & Authentication - SHARED

* **Goal:** Custom User model using email for login. Login/logout views and templates styled per the `login.png` reference.
* **Django Implementation:**
    * **`users` app (SHARED):**
        * `users/models.py`: `CustomUser(AbstractUser)` with `USERNAME_FIELD = 'email'`, `email` unique, `username = None`. `CustomUserManager`.
        * `settings.py`: `AUTH_USER_MODEL = 'users.CustomUser'`.
    * **`core` app (SHARED - for forms/templates):**
        * `core/forms.py`: `CustomAuthenticationForm(AuthenticationForm)` to style email/password fields and update labels.
        * `insightiq_project/urls.py`: Override default `LoginView` to use `CustomAuthenticationForm`.
        * `core/templates/registration/login.html`: HTML structure and Tailwind classes based precisely on `login.png`. Centered card, logo placeholder, input styling, button styling, "Forgot password" link. Use `base_public.html`.
    * Password reset/change templates also need styling.

### Abstraction 3: Data Source Management - TENANT-SPECIFIC

* **Goal:** Allow authenticated users within a tenant to add, edit, and securely store connection details for their external databases.
* **Django Implementation:**
    * **`datasource` app (TENANT_SPECIFIC):**
        * `datasource/models.py`: `DatabaseConnection` model (name, db_type, host, port, db_name, username, `encrypted_password`, SSH details if any). All instances are schema-specific.
        * Fields like `creator` (ForeignKey to `settings.AUTH_USER_MODEL`), `tenant` (implicit via schema).
        * Password encryption using `cryptography.fernet`.
        * `datasource/forms.py`: `DatabaseConnectionForm`.
        * `datasource/views.py`: CRUD views for `DatabaseConnection`, connection testing endpoint. All views automatically scoped to the current tenant's schema.
        * Templates will inherit from `base_app.html` (with sidebar/topbar) and use Tailwind for styling forms and lists. UI will be clean, functional, within the main content area.

### Abstraction 4: Schema Browse & Metadata Caching - TENANT-SPECIFIC

* **Goal:** Introspect a tenant-selected data source to display tables/columns. Cache metadata. This UI will be part of the SQL Builder.
* **Django Implementation:**
    * **`datasource/services/introspection.py` (TENANT_CONTEXT_AWARE):** `SchemaIntrospector` service connects to the tenant's `DatabaseConnection`. Caches schema specific to tenant and connection.
    * **`querying/views.py` (SQL Builder view will use this):** Endpoint to fetch schema for a selected `DatabaseConnection` (of the current tenant).
    * **UI (in SQL Builder):** A right-hand pane (as per `image.png-e27b1135-d130-4bd5-9354-da1999797ebc`) listing tables. Clicking a table expands to show columns and types. Styled with Tailwind.

### Abstraction 5: Query Engine (SQL Execution) - TENANT-SPECIFIC

* **Goal:** Interface for users to write/execute SQL against their tenant's selected data source. Display results. UI styled per `image.png-e27b1135-d130-4bd5-9354-da1999797ebc`.
* **Django Implementation:**
    * **`querying` app (TENANT_SPECIFIC):**
        * `querying/services/execution.py` (TENANT_CONTEXT_AWARE): `QueryExecutor` uses the tenant's `DatabaseConnection`. Includes security (validation, timeouts, row limits).
        * `querying/views.py`: `SQLEditorView` handles SQL submission, calls executor, returns results.
        * `querying/templates/querying/sql_editor.html`:
            * Inherits from `base_app.html`.
            * **Top section:** Breadcrumb/title, "Save" button.
            * **Main layout:** Two-pane (or three with results):
                * Left/Main: SQL editor (textarea, e.g., CodeMirror/Monaco for syntax highlighting). "Run Query" button (blue play icon style).
                * Right: Schema Browser pane (from Abstraction 4).
            * **Results Pane (Bottom):** Table display of query results. "Visualization" toggle button.
            * All styled with Tailwind to match the reference.

### Abstraction 6: AI-Powered Natural Language Querying (NLQ) - TENANT-SPECIFIC

* **Goal:** Translate user questions in English into SQL for the tenant's data.
* **Django Implementation:**
    * **`ai_features` app (TENANT_SPECIFIC):**
        * `ai_features/services/nlq_service.py` (TENANT_CONTEXT_AWARE): Uses schema from tenant's `DatabaseConnection`. AI prompt includes this schema.
        * UI for NLQ input (could be integrated into SQL Builder or a separate interface).

### Abstraction 7: Visualization Layer - TENANT-SPECIFIC

* **Goal:** Display tenant's query results in various chart formats.
* **Django Implementation:**
    * **`visualization` app (TENANT_SPECIFIC):**
        * `visualization/utils.py`: Data transformation for charting libraries (Chart.js/Plotly.js).
        * Integrated into `querying/views.py` or `dashboard/views.py` to render charts from tenant data.
        * Chart configuration UI will be part of the question saving/editing process.

### Abstraction 8: Saving & Managing Questions (Analyses) - TENANT-SPECIFIC

* **Goal:** Persist tenant queries, NLQ, and visualization settings.
* **Django Implementation:**
    * **`querying` app (TENANT_SPECIFIC):**
        * `querying/models.py`: `SavedQuestion` model (name, description, creator, `database_connection` (ForeignKey to tenant's `DatabaseConnection`), `query_sql`, `nlq`, `visualization_settings`).
        * CRUD views for `SavedQuestion`, styled list and detail views.

### Abstraction 9: Dashboarding - TENANT-SPECIFIC

* **Goal:** Combine multiple tenant `SavedQuestion` visualizations on a grid. UI styled per `image.png-c0208b9d-af31-4cda-b763-05d0ead4926b`.
* **Django Implementation:**
    * **`dashboard` app (TENANT_SPECIFIC):**
        * `dashboard/models.py`: `Dashboard` model, `DashboardItem` model (linking `Dashboard` to `SavedQuestion`, storing layout).
        * `dashboard/views.py`:
            * CRUD views for `Dashboard`.
            * `DashboardDetailView`: Renders the dashboard.
                * **Filters:** Top area with dropdowns for dashboard-level filters (Date, Poli, etc.).
                * **Grid Area:** Displays `DashboardItem`s (charts/tables) in a configurable grid.
                * Asynchronous loading of items (HTMX).
                * "+ New" button in top nav likely links here or to new question page.
        * Templates styled with Tailwind to match the reference. Sidebar for "Our analytics," "Your personal collection."

### Abstraction 10: Permissions & Access Control - WITHIN TENANT CONTEXT

* **Goal:** Control user/group access to tenant-specific data sources, questions, dashboards.
* **Django Implementation:**
    * Users are shared (from `users` app).
    * Tenant-specific groups/roles might be defined within each tenant's schema (e.g., a `TenantGroup` model in a tenant app) or use `django-guardian` with objects that are already tenant-scoped.
    * Permissions logic applied in views for tenant-specific objects.

### Abstraction 11: AI-Powered Automated Insights - TENANT-SPECIFIC

* **Goal:** Analyze tenant query results for automated findings.
* **Django Implementation:**
    * **`ai_features` app (TENANT_SPECIFIC):** `InsightService` operates on tenant data.

### Abstraction 12: Background Task Processing - TENANT-AWARE

* **Goal:** Offload long tasks (queries, AI) using Celery, ensuring tasks operate on the correct tenant's schema.
* **Django Implementation:**
    * Celery tasks must accept `schema_name` or `tenant_id` as an argument.
    * A wrapper around Celery tasks or `django-tenants-celery` can help manage schema context for tasks.

### Abstraction 13: Frontend Architecture - Shared Layouts, Tailwind CDN, JS

* **Goal:** Structure templates, use Tailwind CDN, HTMX/Alpine.js for interactivity, reflecting the common UI layout from images.
* **Django Templates:**
    * `base_public.html`: For login, signup, public landing pages. Minimal nav. Uses Tailwind CDN.
    * `base_app.html`: For authenticated users. Includes:
        * **Top Navigation Bar:** Styled per references (logo, search, "+ New", user menu).
        * **Left Sidebar:** Styled per references (Home, Collections, Browse Data links). Expandable/collapsible sections.
        * Both use Tailwind classes based on image references for colors (primary blue, grays), spacing, and typography.
    * Content pages extend `base_app.html` and fill `{% block content %}`.
* **Tailwind CSS (CDN):**
    * `<script src="https://cdn.tailwindcss.com"></script>` in base templates.
    * **Limitation:** No complex `tailwind.config.js` customizations, no `@apply`, no purging. Recommended to switch to a build process for production.
* **HTMX/Alpine.js:** For dynamic partial updates, modals, dropdowns, interactive elements.

### Abstraction 14: Deployment Considerations - MULTI-TENANT

* **Goal:** Deploy the multi-tenant SaaS application.
* **Key Aspects:**
    * **Tenant Provisioning:** Mechanism to create new tenants (schemas, domains) - e.g., on signup, via admin command.
    * **Tenant Routing:** Configure reverse proxy (Nginx) to forward requests for different tenant domains/subdomains to Django. `django-tenants` handles schema switching internally.
    * **Database:** Production PostgreSQL. Backups must cover all schemas.
    * **Migrations:** `migrate_schemas --shared` for shared apps, `migrate_schemas` for applying to all tenant schemas.
    * **Static Files:** Shared static files collected via `collectstatic`.
    * Celery workers need to be tenant-aware.
    * Use environment variables for all secrets.

---

## 3. Security Considerations (Multi-Tenant)

* **Tenant Data Isolation:** Primarily handled by PostgreSQL schemas via `django-tenants`. Critical to configure `SHARED_APPS` and `TENANT_APPS` correctly.
* **User Authentication:** Shared user table. Ensure strong password policies, consider MFA.
* **Permissions:** Enforce access control *within* each tenant to prevent users from one tenant accessing another tenant's objects even if they share the same User ID (though this shouldn't happen with schema isolation for data).
* **SQL Injection & Query Engine:** Same risks as before, but now applied within the context of a tenant's specific `DatabaseConnection`.
* **Preventing Cross-Tenant Information Leakage:** Ensure any shared resources or global caches don't inadvertently leak data between tenants.

---

## 4. Scalability Considerations (Multi-Tenant)

* **Database:** Many schemas in one database can have performance implications if not managed well (e.g., connection pooling, vacuuming). PostgreSQL handles many schemas well, but monitor.
* **Application Servers:** Standard horizontal scaling.
* **Tenant Provisioning & Management:** Efficiently create/manage schemas.
* **"Noisy Neighbor" Problem:** One tenant's heavy usage could potentially impact others if resources (CPU, DB connections for shared parts) are not well-managed. Asynchronous tasks can help isolate workloads.

---

## 5. Future Enhancements

* Tenant-specific customization/theming (beyond basic logo).
* Public REST APIs (tenant-aware).
* Advanced tenant administration tools.
* Switch Tailwind CSS from CDN to a build process for production (purging, customization).
* Implement the Visual Query Builder / Notebook UI.
---
