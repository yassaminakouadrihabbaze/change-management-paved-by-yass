# SKELETON — review before production.

variable "name_prefix" {
  type        = string
  description = "Short prefix for resource names (lowercase, no spaces)."
  default     = "myapp"
}

variable "location" {
  type        = string
  description = "Azure region."
  default     = "eastus"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g. prod, preview). Drives naming + sizing."
  default     = "prod"
}

variable "postgres_admin_login" {
  type        = string
  description = "PostgreSQL administrator login."
  default     = "pgadmin"
}

variable "postgres_admin_password" {
  type        = string
  description = "PostgreSQL administrator password. Pass via TF_VAR_postgres_admin_password or tfvars; never commit."
  sensitive   = true
}

variable "app_image" {
  type        = string
  description = "Container image reference the app runs (e.g. <acr>.azurecr.io/<app>:<tag>). The pipeline updates this per deploy."
  default     = "mcr.microsoft.com/k8se/quickstart:latest" # placeholder until the first real image is pushed
}

variable "entra_tenant_id" {
  type        = string
  description = "Microsoft Entra ID tenant id (used to build the Auth.js issuer URL)."
}

# --- Per-environment sizing (F-004) ---------------------------------------
# Extracted from main.tf so preview and production can differ without editing
# resource definitions. Defaults reproduce the previous hard-coded values, so
# an existing prod apply is unchanged by this refactor.

variable "postgres_sku_name" {
  type        = string
  description = "PostgreSQL Flexible Server SKU. Burstable is fine for preview; size up for production."
  default     = "B_Standard_B1ms"
}

variable "postgres_storage_mb" {
  type        = number
  description = "PostgreSQL storage in MB."
  default     = 32768
}

variable "postgres_public_network_access_enabled" {
  type        = bool
  description = "Whether the database is reachable from the public internet. Should be false in production, with VNet integration and a private endpoint instead."
  default     = true
}

variable "acr_sku" {
  type        = string
  description = "Container Registry SKU (Basic, Standard, Premium). Premium is required for private endpoints and geo-replication."
  default     = "Basic"
}

variable "container_cpu" {
  type        = number
  description = "vCPU allocated to the app container."
  default     = 0.5
}

variable "container_memory" {
  type        = string
  description = "Memory allocated to the app container (must pair with container_cpu per Container Apps' allowed combinations)."
  default     = "1Gi"
}
