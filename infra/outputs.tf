# SKELETON — review before production.

output "resource_group" {
  value = azurerm_resource_group.main.name
}

output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "app_fqdn" {
  description = "Public hostname of the Container App."
  value       = azurerm_container_app.app.ingress[0].fqdn
}

output "key_vault_name" {
  value = azurerm_key_vault.kv.name
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.db.fqdn
}

output "entra_client_id" {
  description = "Entra application (client) ID for AUTH_MICROSOFT_ENTRA_ID_ID."
  value       = azuread_application.auth.client_id
}

output "entra_issuer" {
  description = "Auth.js issuer URL (AUTH_MICROSOFT_ENTRA_ID_ISSUER)."
  value       = "https://login.microsoftonline.com/${var.entra_tenant_id}/v2.0"
}
