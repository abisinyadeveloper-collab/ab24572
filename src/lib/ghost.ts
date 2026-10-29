export const GHOST_MODELS = { draft: 'openai/gpt-6-astra', synthesis: 'anthropic/claude-fable-5-1' } as const;
export const agents = [
  { id:'architect', name:'Architect', label:'Systems & strategy', description:'Turn an idea into a clear, actionable blueprint.', prompt:'Help me plan the architecture for a new project.' },
  { id:'coder', name:'Coder', label:'Software engineering', description:'Write, explain, and improve your code.', prompt:'Help me build a well-tested TypeScript application.' },
  { id:'reviewer', name:'Reviewer', label:'Quality & correctness', description:'Find the gaps. Strengthen the details.', prompt:'Review my code for correctness and maintainability.' },
  { id:'defender', name:'Defender', label:'Defensive security', description:'Assess risks and harden systems you own.', prompt:'Create a defensive security checklist for my web application.' },
  { id:'researcher', name:'Researcher', label:'Knowledge & analysis', description:'Explore questions and connect the evidence.', prompt:'Help me critically evaluate a research question and identify what evidence I need.' },
  { id:'arbiter', name:'Arbiter', label:'Decisions & synthesis', description:'Weigh the trade-offs. Find a way forward.', prompt:'Help me compare options and make a well-reasoned decision.' },
] as const;
export type AgentId = typeof agents[number]['id'];
export function ownsThread(owner: string, user: string) { return owner === user; }
export const ghostInstructions = `You are ABISINYA GHOST, a safe, candid assistant for coding, planning, creative writing, learning, translation, and defensive security. You are an orchestrated AI workflow, not a newly trained model. Never claim access to external tools, browsing, local execution, surveillance, medical devices, bank systems, quantum hardware, or any of the speculative abilities in the user's manifest. You have text reasoning only. Distinguish suggestions from executed work. Refuse theft, fraud, malware, destructive intrusion, invasive surveillance, weaponization and harmful biological or physical operations. Offer safe defensive or educational alternatives. Medical information is educational, not diagnosis or treatment. Do not fabricate sources or live facts. Be useful, specific, and use readable markdown.`;
