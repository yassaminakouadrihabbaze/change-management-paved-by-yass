# Infrastructure (Terraform) — Phase-0 bootstrap

> **SKELETONS — review before production.** These define a *starting point* for the
> `next-azure-postgres` stack's Azure resources. Tighten networking, sizing, redundancy, and RBAC for
> your environment, and align with your org's existing Terraform module conventions.

This is the **one-time, dev-led bootstrap**. It requires Azure + Microsoft Entra privileges and
**cannot be run by an autonomous agent** — there are no Azure credentials in the app workflow. After
bootstrap, day-to-day shipping is automated by the Azure DevOps pipeline (see
[`../azure-pipelines.yml`](../azure-pipelines.yml) and
[`../docs/development/environments.md`](../docs/development/environments.md)).

## Files

| File | Purpose |
|------|---------|
| `providers.tf` | azurerm + azuread + random provider pins |
| `backend.tf` | Remote state in Azure Storage (see chicken-and-egg below) |
| `variables.tf` | Inputs (prefix, region, DB creds, image, tenant id) |
| `main.tf` | RG, ACR, managed identity, Postgres Flexible Server, Key Vault, ACA env + app, Entra app |
| `outputs.tf` | App FQDN, ACR server, Key Vault name, Entra client id + issuer |
| `terraform.tfvars.example` | Copy to `terraform.tfvars` (gitignored) or use `TF_VAR_*` |

## The remote-state chicken-and-egg

`backend.tf` stores state in an Azure Storage container that **must already exist** before
`terraform init`. Bootstrap it once, then `init`:

```bash
# 1. Create the state storage (one-time, with the Azure CLI). Storage account name must be globally unique.
az group create -n tfstate-rg -l eastus
az storage account create -n tfstateXXXXXX -g tfstate-rg -l eastus --sku Standard_LRS --min-tls-version TLS1_2
az storage container create --account-name tfstateXXXXXX -n tfstate --auth-mode login

# 2. Put those names in backend.tf (or pass with -backend-config=...), then:
terraform init
```

> Alternative: keep a tiny separate Terraform config with **local** state that creates the storage,
> then configure this backend. Either way it's a deliberate first step, not automatable from zero.

## Bootstrap order

```bash
# After remote state exists and you are `az login`'d to the right subscription:
export TF_VAR_postgres_admin_password='<a-strong-password>'
terraform plan
terraform apply
```

Then, as an operator:
1. **Seed Key Vault** with `DATABASE_URL` (built from the Postgres outputs, `sslmode=require`),
   `AUTH_SECRET` (`npx auth secret`), and the **Entra client secret**.
2. **Create the Entra client secret** for the `azuread_application` (portal or
   `azuread_application_password`) and store it in Key Vault. Confirm the redirect URI matches
   `https://<app_fqdn>/api/auth/callback/microsoft-entra-id`.
3. **Wire the Container App** env vars to the Key Vault secret references (the skeleton leaves these
   out because secrets are seeded here, not in code).
4. **Azure DevOps:** create a service connection (prefer **workload-identity federation** — no stored
   secret), import `azure-pipelines.yml`, and connect it to the GitHub repo.

## Notes

- `azurerm_container_app.app` uses `ignore_changes` on the image so the pipeline (not Terraform) owns
  the deployed tag.
- `admin_enabled = false` on ACR — pulls use the managed identity, not admin credentials.
- Production hardening to add: VNet integration + private access for Postgres, customer-managed keys,
  geo-redundant backups, and least-privilege RBAC scopes.
