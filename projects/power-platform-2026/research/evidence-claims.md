# Evidence claims

| ID | Production claim | Evidence | Qualification |
|---|---|---|---|
| C01 | Power Apps builds custom business apps. | Power Apps overview | Apps can use Dataverse or other supported data sources. |
| C02 | Power Automate creates workflows across apps and services. | Power Automate getting started | Connector and license availability varies. |
| C03 | Power Pages creates external-facing business sites. | Power Pages introduction | Production security and lifecycle configuration remain required. |
| C04 | Copilot Studio builds and manages agents and workflows. | Copilot Studio overview | Channel and feature availability must be verified. |
| C05 | Dataverse stores and secures business application data in tables. | Dataverse overview | It is the shared foundation in this story, not a requirement for every app. |
| C06 | Source control should be the source of truth for solution components. | ALM overview | Team branching and review policy are implementation choices. |
| C07 | Unmanaged solutions are for development; managed exports are build artifacts. | Solution concepts | Managed-solution uninstall is not presented as a safe rollback. |
| C08 | Pipelines promote the same artifact through sequential stages and resolve target configuration. | Pipelines overview | Prevalidation is not end-to-end testing. |
| C09 | Solutions and pipelines do not carry Dataverse table records. | Pipelines FAQ | Data migration needs a separate controlled path. |
| C10 | GitHub Actions and Azure DevOps Build Tools automate solution ALM workflows. | GitHub Actions; Build Tools | Authentication, secrets, runners, and environment design require review. |
| C11 | Data policies control connector access to reduce risk. | Data policies | Enforcement can be delayed and is not a blanket security guarantee. |
