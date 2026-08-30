# SKELETON — review before production.
# Provisions the core stack: resource group, ACR, Container App env + app, PostgreSQL Flexible
# Server, Key Vault, a user-assigned managed identity, and the Entra app registration for Auth.js.
# This is a STARTING POINT: tighten networking (VNet/private endpoints), sizing, redundancy, and RBAC
# scopes for your environment. Resource names verified against the azurerm provider (current major v4).

locals {
  base = "${var.name_prefix}-${var.environment}"
}

resource "azurerm_resource_group" "main" {
  name     = "${local.base}-rg"
  location = var.location
}

# --- Container Registry ---
resource "azurerm_container_registry" "acr" {
  name                = lower(replace("${local.base}acr", "-", ""))
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = var.acr_sku
  admin_enabled       = false # use managed identity, not admin creds
}

# --- Managed identity used by the Container App (ACR pull + Key Vault read) ---
resource "azurerm_user_assigned_identity" "app" {
  name                = "${local.base}-id"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# --- PostgreSQL Flexible Server ---
resource "azurerm_postgresql_flexible_server" "db" {
  name                          = "${local.base}-pg"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  version                       = "16"
  administrator_login           = var.postgres_admin_login
  administrator_password        = var.postgres_admin_password
  storage_mb                    = var.postgres_storage_mb
  sku_name                      = var.postgres_sku_name
  public_network_access_enabled = var.postgres_public_network_access_enabled
  zone                          = "1"
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = "appdb"
  server_id = azurerm_postgresql_flexible_server.db.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

# --- Key Vault (runtime secrets, read by the app via managed identity) ---
data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "kv" {
  name                      = lower(replace("${local.base}-kv", "_", "-"))
  resource_group_name       = azurerm_resource_group.main.name
  location                  = azurerm_resource_group.main.location
  tenant_id                 = data.azurerm_client_config.current.tenant_id
  sku_name                  = "standard"
  enable_rbac_authorization = true
}

resource "azurerm_role_assignment" "kv_read" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Secrets are SEEDED by an operator during bootstrap (see infra/README.md), not committed here.
# Reference them from the Container App as Key Vault secret URIs.

# --- Container App environment + app ---
resource "azurerm_container_app_environment" "env" {
  name                = "${local.base}-cae"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_container_app" "app" {
  name                         = "${local.base}-app"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.env.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    container {
      name   = "web"
      image  = var.app_image
      cpu    = var.container_cpu
      memory = var.container_memory
      # Wire DATABASE_URL / AUTH_SECRET / Entra secret as Key Vault references (secret blocks +
      # env vars). Left out of the skeleton because secrets are seeded during bootstrap.
    }
  }

  lifecycle {
    # The pipeline updates the image per deploy; don't let `terraform apply` revert it.
    ignore_changes = [template[0].container[0].image]
  }
}

# --- Entra app registration for Auth.js (workforce / single tenant) ---
resource "azuread_application" "auth" {
  display_name     = "${local.base}-auth"
  sign_in_audience = "AzureADMyOrg" # single-tenant / workforce

  web {
    redirect_uris = [
      "https://${azurerm_container_app.app.ingress[0].fqdn}/api/auth/callback/microsoft-entra-id",
    ]
  }
}

resource "azuread_service_principal" "auth" {
  client_id = azuread_application.auth.client_id
}

# The client SECRET is created by an operator (or a separate azuread_application_password) and stored
# in Key Vault during bootstrap — kept out of state where possible.
