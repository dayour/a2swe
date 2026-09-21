# Evidence excerpts and factual claims

All excerpts are bounded, attributed, and intended only as evidence anchors for an original a2swe generation. Access date: 2026-09-18.

## Bounded evidence excerpts

| ID | Source | Excerpt | Supported use |
| --- | --- | --- | --- |
| E1 | S1 | "graphical, low-code studio for building and managing AI-powered agents and workflows" | Define Copilot Studio plainly. |
| E2 | S1 | "connect them to your organization's data and systems" | Explain business-data integration. |
| E3 | S1 | "publish them to the channels where your users already work" | Explain endpoint/channel value. |
| E4 | S1 | "An agent is an AI assistant that handles conversations and completes tasks" | Describe agent role. |
| E5 | S1 | "GitHub Copilot harness", "standard harness", and "Copilot chat harness" | Name the three harness options without over-describing beyond source. |
| E6 | S2 | "By default, new agents use generative orchestration" | Current default for standard-harness agents, subject to admin/prebuilt-agent caveats. |
| E7 | S2 | "choose the best tools, knowledge, topics, and other agents" | Explain orchestration as selection among building blocks. |
| E8 | S2 | "The most important factor is the description" | Emphasize description quality for tools/topics/agents/knowledge. |
| E9 | S3 | "Tools are building blocks that let your agent interact with external systems" | Explain why tools move agents from chat to action. |
| E10 | S3 | "Connector", "Agent flow", "Prompt", "REST API", "Model Context Protocol", "Computer use" | List tool mechanisms. |
| E11 | S4 | "AI prompts", "Model Context Protocol (MCP)", "Computer use tool" | Summarize three agent-tool categories in the guidance article. |
| E12 | S4 | "Use BYO machines for production scenarios" | Qualify computer-use deployment choices. |
| E13 | S5 | "Copilot Studio currently supports MCP tools and resources" | Avoid claiming MCP prompts are supported in Copilot Studio. |
| E14 | S5 | "dynamically reflects these changes" | Explain MCP server update behavior. |
| E15 | S5 | "You must turn on generative orchestration to use MCP" | State the MCP prerequisite. |
| E16 | S6 | "reliable, repeatable testing becomes essential" | Frame quality argument. |
| E17 | S6 | "generate, import, or manually write a group of test cases" | Explain test-set creation routes. |
| E18 | S6 | "accuracy, relevancy, and quality" | State evaluation dimensions. |
| E19 | S6 | "don't guarantee that an agent is safe" | Safety qualification for evaluators. |
| E20 | S7 | "Always work in the context of solutions" | ALM best-practice anchor. |
| E21 | S7 | "Use environment variables for settings and secrets" | Configuration portability and secret handling. |
| E22 | S7 | "Azure Application Insights settings", "Manual authentication settings", "Deployed channels" | Examples of post-deployment/non-solution-aware settings. |
| E23 | S8 | "geographic data residency, data loss prevention (DLP)" | Governance surface. |
| E24 | S8 | "central control plane to observe, govern, and secure Copilot Studio agents" | Agent 365 framing. |
| E25 | S8 | "These events aren't covered by the configured Lockbox" | Lockbox boundary condition. |
| E26 | S9 | "Releases roll out over several days" | Availability timing caveat. |
| E27 | S9 | "Computer use is now generally available" | May 2026 status for computer use. |
| E28 | S9 | "Agent evaluations are now generally available (GA)" | March 2026 status for evaluations. |
| E29 | S9 | "automatically creates a Microsoft Entra Agent ID for every new agent" | July 2026 new-agent identity behavior. |
| E30 | S10 | "planned for release between April 2026 and September 2026" | Release-wave window. |
| E31 | S10 | "Delivery timelines and projected functionality may change or may not ship" | Release-plan caveat. |
| E32 | S11 | "create agents using natural language or a graphical interface" | Product page positioning. |
| E33 | S12 | "expand automation without losing control" | Executive tension: scale vs control. |
| E34 | S13 | "structured where needed and adaptive where valuable" | Executive narrative for hybrid automation. |

## Factual claims for generation

| Claim ID | Claim | Evidence IDs | Citation IDs |
| --- | --- | --- | --- |
| C1 | Microsoft Copilot Studio is a low-code, graphical platform for building and managing AI-powered agents, workflows, and agent flows connected to organizational data and systems. | E1, E2 | S1 |
| C2 | Copilot Studio agents are designed to handle conversations and complete tasks, then publish to channels such as Teams, Microsoft 365 Copilot, websites, mobile apps, and other endpoints. | E3, E4 | S1 |
| C3 | Copilot Studio has multiple runtime harness choices; the harness affects reasoning behavior, complexity, out-of-box capabilities, and billing. | E5 | S1 |
| C4 | For standard-harness agents, new agents use generative orchestration by default unless a prebuilt-agent configuration or admin environment setting dictates otherwise. | E6 | S2 |
| C5 | Generative orchestration can select tools, knowledge, topics, and other agents, and description quality is a primary selection signal. | E7, E8 | S2 |
| C6 | Tools connect agents to external systems. Documented tool mechanisms include connectors, agent flows, prompts, REST APIs, MCP, and computer use. | E9, E10 | S3 |
| C7 | Microsoft guidance positions AI prompts, MCP, and computer use as major agent-tool categories with different use cases: structured model output, standardized integrations, and UI automation. | E11 | S4 |
| C8 | MCP in Copilot Studio exposes tools and resources from connected servers, reflects server-side changes dynamically, and requires generative orchestration. | E13, E14, E15 | S5 |
| C9 | Computer use is GA as of the May 2026 "What's new" entry; Microsoft guidance recommends BYO machines for production and hosted machines for prototyping. | E12, E27 | S4, S9 |
| C10 | Agent evaluation supports repeatable automated testing using generated/imported/manual test sets and measures accuracy, relevancy, and quality, with safety evaluators that support but do not guarantee safety. | E16, E17, E18, E19 | S6 |
| C11 | Agent evaluation is GA in the March 2026 "What's new" entry. | E28 | S9 |
| C12 | Copilot Studio governance includes DLP/data policies, data residency, audit logging, cost/credit governance, connector dependency insight, Agent 365 integration, and Entra-backed agent identity controls. | E23, E24, E29 | S8, S9 |
| C13 | Strong ALM for Copilot Studio uses Power Platform environments, solutions, environment variables/connection references, source control/Git integration, and automated deployment paths; some settings still require post-deployment steps. | E20, E21, E22 | S7 |
| C14 | The 2026 release wave 1 context runs April through September 2026, but planned functionality can change or not ship; monthly "What's new" pages carry more current GA/preview markers. | E26, E30, E31 | S9, S10 |
| C15 | Executive framing should not present Copilot Studio as only a chatbot builder; Microsoft product and blog positioning centers on agents, workflows, business apps, governance, and adaptive automation. | E32, E33, E34 | S11, S12, S13 |

## Citation key

- S1: https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio
- S2: https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-generative-actions
- S3: https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent
- S4: https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/agent-tools
- S5: https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp
- S6: https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-agent-evaluation-intro
- S7: https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/alm
- S8: https://learn.microsoft.com/en-us/microsoft-copilot-studio/security-and-governance
- S9: https://learn.microsoft.com/en-us/microsoft-copilot-studio/whats-new
- S10: https://learn.microsoft.com/en-us/power-platform/release-plan/2026wave1/
- S11: https://www.microsoft.com/en-us/microsoft-365-copilot/microsoft-copilot-studio/
- S12: https://www.microsoft.com/en-us/copilot/blog/copilot-studio/new-and-improved-agent-governance-intelligent-workflows-and-connected-app-experiences/
- S13: https://www.microsoft.com/en-us/copilot/blog/copilot-studio/new-and-improved-computer-using-agents-a-new-workflows-experience-and-real-time-voice-experiences/
