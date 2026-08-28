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
