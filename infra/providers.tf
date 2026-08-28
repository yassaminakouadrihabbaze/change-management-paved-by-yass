# SKELETON — review before production.
# Provider configuration for the Azure + Entra infrastructure.
# Pin to the current majors; run `terraform init -upgrade` to resolve the latest compatible release.

terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.4"
    }
  }
}

provider "azurerm" {
  features {}
  # subscription_id is taken from `az login` / ARM_SUBSCRIPTION_ID env; set explicitly if needed.
}

provider "azuread" {
  # Uses the same Azure CLI / service-principal auth as azurerm.
}
