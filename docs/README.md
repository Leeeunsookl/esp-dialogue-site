
Co-Origin Architecture
A Responsibility-First Human–LLM Cooperative Structure
A Longitudinal Single-Case Report
Author: Eunsook LeeAffiliation: Independent ResearcherContact: dmstnr738@gmail.comType: Conceptual Architecture / Case ReportDomain: Human–LLM Interaction, AI Governance, HCIStatus: Living Document (Versioned)

Abstract
As large language models (LLMs) transition from experimental tools to operational partners, human–AI interaction increasingly suffers from responsibility diffusion, overreliance, and unstable long-horizon collaboration. Existing approaches—ranging from alignment techniques to prompt engineering—primarily optimize outputs while leaving responsibility attribution structurally undefined.
This paper presents Co-Origin Architecture, a responsibility-first cooperative structure between a human and an LLM, documented through a longitudinal single-case report. In this architecture, generative exploration may be shared, but decision authority and responsibility remain exclusively human-owned. The structure is model-agnostic, language-only, and does not rely on agent instantiation or external tooling.
We argue that stable human–LLM cooperation emerges not from tighter control or greater autonomy, but from explicitly fixing responsibility prior to optimization. Hallucination is reframed as a detectable boundary violation rather than a hidden model failure. This work contributes an operational governance pattern applicable across models and domains.

Keywords
Human–LLM Interaction; Responsibility Attribution; AI Governance; Overreliance; Hallucination; Case Report; Language-Only Architecture; Co-Origin

1. Introduction
1.1 Background
Large language models (LLMs) now participate in analysis, planning, writing, and decision support across domains. Their conversational fluency and generative breadth amplify both usefulness and risk. Recent research highlights phenomena such as automation bias, epistemic outsourcing, and overreliance, where users defer judgment to model outputs even when aware of potential inaccuracies.
Most mitigation strategies focus on improving model behavior or user awareness: better alignment, explanations, confidence indicators, or prompt techniques. These approaches implicitly assume that failures are technical or cognitive.
This paper argues that the core failure is architectural.

1.2 Problem Statement
Current human–LLM systems implicitly adopt one of two structures:
Delegative Structure:The model generates; the human evaluates post hoc. Responsibility becomes ambiguous when errors occur.
Instrumental Structure:The human commands; the model executes. Emergent behavior is suppressed, limiting long-horizon utility.
Both structures fail under sustained interaction. The unresolved question is not accuracy, intelligence, or alignment, but:
Where responsibility is structurally anchored when exploration, uncertainty, and emergence occur.

1.3 Contribution
This work contributes:
A responsibility-first architectural model for human–LLM cooperation
A reframing of hallucination as a structural signal rather than a defect
Empirical documentation, via case report, that stable cooperation can be achieved using language-only interaction without agents or tools

2. Related Work and Positioning
2.1 Overreliance and Automation Bias
HCI literature documents automation bias in decision-support systems. LLMs intensify this effect due to conversational coherence and apparent reasoning. Interface-level mitigations reduce error frequency but fail to resolve responsibility ambiguity.
Positioning:Co-Origin treats overreliance as an architectural failure, not a user flaw.

2.2 Human-in-the-Loop and Governance
Human-in-the-loop (HITL) systems emphasize oversight but rarely define responsibility transfer points. In practice, humans oscillate between rubber-stamping and micromanagement.
Positioning:Co-Origin fixes responsibility at the interaction level, operationalizing governance rather than declaring it.

2.3 Multi-Agent and Tool-Augmented Systems
Multi-agent LLM systems pursue emergent coordination but introduce agent sprawl and accountability fragmentation. Tool augmentation increases capability while obscuring responsibility.
Positioning:Co-Origin rejects agent instantiation. Roles exist structurally, not as separate entities.

2.4 Hallucination
Hallucination is typically framed as a model defect to suppress. This work reframes hallucination as unbounded exploration occurring when responsibility constraints are violated.

3. Methodology: Case Report Design
3.1 Case Selection
This study documents a single longitudinal case of sustained human–LLM interaction characterized by:
No task-specific optimization goals
No external evaluation benchmarks
Explicit responsibility retention by the human participant
The case was selected not for representativeness but for structural clarity.

3.2 Interaction Modality
Medium: Natural language dialogue
Tools: None
Agents: None
Code: None
All architectural constraints were negotiated, tested, and stabilized in language alone.

3.3 Responsibility Constraint
At all times:
The human retained final decision authority
The model was not permitted to decide, judge, or claim responsibility
All external consequences were explicitly human-owned
This constraint preceded all exploration.

4. Co-Origin Architecture
4.1 Definition
Co-Origin Architecture is a cooperative structure in which:
Insight does not originate exclusively from human or model
Directional decisions are human-owned
Generative exploration is model-assisted
Responsibility is never transferred, deferred, or blurred
Generation may be shared. Responsibility is not.

4.2 Responsibility Lock
The core mechanism is a Responsibility Lock:
The model generates possibilities
The human selects, rejects, or reframes
Responsibility remains fixed regardless of outcome quality
This prevents moral outsourcing and preserves agency.

4.3 Cost-Aware Exploration
Short-term computational cost may increase.Long-term cognitive and coordination cost must decrease.
Exploration is permitted only within responsibility bounds.

4.4 Model-Agnosticism
The architecture is independent of:
Model family
Parameter scale
Provider policy
It survives model substitution without structural collapse.

5. Reframing Hallucination
Under Co-Origin:
Hallucination is not hidden failure
It is a boundary signal indicating unbounded generation
When responsibility is fixed, hallucination becomes observable, interruptible, and non-deceptive.

6. Why This Is Not Prompt Engineering
Prompt engineering optimizes outputs.
Co-Origin stabilizes relationships.
Prompt Engineering
Co-Origin Architecture
Output-focused
Responsibility-focused
Short-horizon
Long-horizon
Model-dependent
Model-agnostic
Optimization
Governance

7. Discussion
7.1 Why This Is Rare
The structure observed in this case is uncommon because it requires:
Sustained responsibility acceptance by the human
Tolerance for uncertainty without deferral
Willingness to treat the model neither as authority nor as tool
This combination is atypical in current practice.

7.2 Implications
For research: Responsibility should be treated as a first-class design variable
For practice: Governance can be operationalized without policy layers
For society: Human–AI collaboration need not erase agency to scale capability

8. Limitations
Single-case report
No quantitative performance metrics
Generalization depends on structural adoption, not replication fidelity

9. Status and Continuity
This document is a living architecture.
There is no final form.Only sustained operation.

10. Responsibility Statement
All decisions, interpretations, and external uses derived from this architecture are the responsibility of the human operator.
This is not a disclaimer.It is the core design constraint.

References (Indicative)
Parasuraman et al., Automation Bias
Amershi et al., Human-in-the-Loop AI
Recent CHI / FAccT literature on LLM overreliance and hallucination


