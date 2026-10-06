'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, CircleHelp,
  Clipboard, Compass, FileDown, FileText, Layers3, Lightbulb, LoaderCircle,
  Moon, Plus, ShieldCheck, Sparkles, Sun, WandSparkles, Workflow, X,
} from 'lucide-react';
import {
  discoverySchema, ideaInputSchema, projectSpecSchema,
  type Challenge, type Discovery, type IdeaInput, type IdeaInputDraft, type ProjectSpec,
} from '../lib/schemas/project';
import { buildCodingPrompt, specToMarkdown } from '../lib/domain/markdown';
import { extractIdeaConcepts } from '../lib/domain/idea-concepts';
import { createAnalyzedProject, upsertProject } from '../lib/domain/projects';
import { parseProjects, serializeProjects, type SavedProject } from '../lib/storage/projects';

type BusyAction = 'analyze' | 'spec' | null;
type ToastState = { message: string; id: number } | null;

const blankIdea: IdeaInputDraft = { idea: '', platform: "I don't know yet", outputLanguage: 'English' };
const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.24, ease: 'easeOut' as const } };
const sectionFields: { key: keyof ProjectSpec; title: string; icon: typeof FileText; fields: { key: string; label: string; wide?: boolean }[] }[] = [
  { key: 'overview', title: 'Overview', icon: Compass, fields: [{ key: 'projectName', label: 'Project name' }, { key: 'summary', label: 'One-line summary' }, { key: 'problem', label: 'Problem', wide: true }, { key: 'solution', label: 'Proposed solution', wide: true }, { key: 'targetUser', label: 'Target user', wide: true }, { key: 'goals', label: 'Goals', wide: true }] },
  { key: 'product', title: 'Product', icon: Lightbulb, fields: [{ key: 'mvpFeatures', label: 'MVP features' }, { key: 'outOfScope', label: 'Out of scope' }, { key: 'userStories', label: 'User stories', wide: true }, { key: 'primaryUserFlow', label: 'Primary user flow', wide: true }] },
  { key: 'engineering', title: 'Engineering', icon: Workflow, fields: [{ key: 'recommendedStack', label: 'Recommended stack' }, { key: 'architecture', label: 'Architecture' }, { key: 'mainComponents', label: 'Main components' }, { key: 'dataModel', label: 'Data model' }, { key: 'apiEndpoints', label: 'API endpoints' }, { key: 'integrations', label: 'External services and integrations' }, { key: 'decisions', label: 'Important decisions', wide: true }] },
  { key: 'quality', title: 'Quality', icon: ShieldCheck, fields: [{ key: 'security', label: 'Security' }, { key: 'privacy', label: 'Privacy' }, { key: 'edgeCases', label: 'Edge cases' }, { key: 'errorScenarios', label: 'Error scenarios' }, { key: 'acceptanceCriteria', label: 'Acceptance criteria', wide: true }] },
  { key: 'execution', title: 'Execution', icon: Layers3, fields: [{ key: 'phases', label: 'Implementation phases' }, { key: 'developmentTasks', label: 'Development tasks' }, { key: 'risks', label: 'Risks' }, { key: 'openQuestions', label: 'Open questions' }, { key: 'futureImprovements', label: 'Future improvements', wide: true }] },
];

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function useMotionPreference() {
  return useReducedMotion();
}

const analysisStages = ['Reading the idea', 'Connecting the key concepts', 'Shaping a buildable plan'];

function IdeaMap({ idea, active, analyzing, analysisStep }: { idea: string; active: boolean; analyzing: boolean; analysisStep: number }) {
  const reduced = useMotionPreference();
  const duration = reduced ? 0 : 0.42;
  const concepts = extractIdeaConcepts(idea);
  const connectionProgress = analyzing ? Number(analysisStep > 0) : Number(active);
  const nodeMotion = (delay: number) => ({ initial: { opacity: 0, scale: reduced ? 1 : 0.82, y: reduced ? 0 : 6 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { duration, delay: reduced ? 0 : delay } });
  return <div className="map-stage" role="group" aria-label="Project idea decomposition" aria-busy={analyzing}>
    <svg className="map-lines" viewBox="0 0 420 270" preserveAspectRatio="none" aria-hidden="true">
      <motion.path d="M210 60 C210 100 92 85 92 125" initial={{ pathLength: 0 }} animate={{ pathLength: connectionProgress ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : .08 }} />
      <motion.path d="M210 60 C210 100 210 85 210 125" initial={{ pathLength: 0 }} animate={{ pathLength: connectionProgress ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : .12 }} />
      <motion.path d="M210 60 C210 100 328 85 328 125" initial={{ pathLength: 0 }} animate={{ pathLength: connectionProgress ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : .16 }} />
      <motion.path d="M92 153 C100 210 170 190 210 219" initial={{ pathLength: 0 }} animate={{ pathLength: analysisStep >= 2 || (!analyzing && active) ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : .26 }} />
      <motion.path d="M210 153 C210 190 210 190 210 219" initial={{ pathLength: 0 }} animate={{ pathLength: analysisStep >= 2 || (!analyzing && active) ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : .3 }} />
      <motion.path d="M328 153 C320 210 250 190 210 219" initial={{ pathLength: 0 }} animate={{ pathLength: analysisStep >= 2 || (!analyzing && active) ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : .34 }} />
    </svg>
    <motion.div className={`idea-node ${active ? 'is-active' : ''} ${analyzing && analysisStep === 0 ? 'is-current' : ''}`} {...nodeMotion(0)}>{idea ? `“${idea.slice(0, 66)}${idea.length > 66 ? '…' : ''}”` : 'Your idea starts here'}</motion.div>
    {concepts.map((concept, index) => <motion.div key={`${concept}-${index}`} className={`concept-node ${index === 0 ? 'left' : index === 1 ? 'middle' : 'right'} ${active ? 'is-active' : ''} ${analyzing && analysisStep === 1 ? 'is-current' : ''}`} {...nodeMotion(.12 + index * .06)}>{concept}</motion.div>)}
    <motion.div className={`core-node ${active ? 'is-active' : ''} ${analyzing && analysisStep === 2 ? 'is-current' : ''}`} {...nodeMotion(.32)}><Workflow size={13} /> &nbsp;Buildable plan</motion.div>
  </div>;
}

function ChoiceButtons({ question, answer, onChange }: { question: Discovery['questions'][number]; answer: string; onChange: (value: string) => void }) {
  if (question.type === 'single-choice' && question.options.length) {
    return <div className="choice-row" role="group" aria-label={question.question}>
      {question.options.map((option) => <button key={option} type="button" className={`choice-chip ${answer === option ? 'selected' : ''}`} aria-pressed={answer === option} onClick={() => onChange(answer === option ? '' : option)}>{option}</button>)}
    </div>;
  }
  return <textarea className="answer-field" aria-label={`Your answer: ${question.question}`} placeholder="Add an answer, or leave blank to keep this open…" value={answer} onChange={(event) => onChange(event.target.value)} />;
}

function ChallengeCard({ challenge, decision, onDecision }: { challenge: Challenge; decision: 'accept' | 'keep'; onDecision: (value: 'accept' | 'keep') => void }) {
  return <motion.article className="card challenge-card" layout initial={fade.initial} animate={fade.animate} transition={fade.transition}>
    <div className="challenge-top"><h3>{challenge.issue}</h3><span className={`severity ${challenge.severity}`}>{challenge.severity} impact</span></div>
    <p className="challenge-copy">{challenge.reason}</p>
    <div className="suggestion"><strong>Product engineer suggestion:</strong> {challenge.suggestion}</div>
    <div className="choice-row" role="group" aria-label={`Decision for ${challenge.issue}`}>
      <button type="button" className={`choice-chip ${decision === 'accept' ? 'selected' : ''}`} aria-pressed={decision === 'accept'} onClick={() => onDecision('accept')}><Check size={12} /> Accept suggestion</button>
      <button type="button" className={`choice-chip ${decision === 'keep' ? 'selected' : ''}`} aria-pressed={decision === 'keep'} onClick={() => onDecision('keep')}>Keep my approach</button>
    </div>
  </motion.article>;
}

export function Workspace() {
  const reduced = useMotionPreference();
  const [loaded, setLoaded] = useState(false);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [current, setCurrent] = useState<SavedProject | null>(null);
  const [input, setInput] = useState<IdeaInputDraft>(blankIdea);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, 'accept' | 'keep'>>({});
  const [spec, setSpec] = useState<ProjectSpec | null>(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState<BusyAction>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    try {
      setProjects(parseProjects(window.localStorage.getItem('prompt2project.projects.v1')));
      const savedTheme = window.localStorage.getItem('prompt2project.theme');
      if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    } catch {
      setProjects([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem('prompt2project.projects.v1', serializeProjects(projects)); } catch { showToast('Local storage is full. Remove an older project to save this one.'); }
  }, [projects, loaded]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (loaded) {
      try { window.localStorage.setItem('prompt2project.theme', theme); } catch { /* Theme remains available for this session. */ }
    }
  }, [theme, loaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (busy !== 'analyze') { setAnalysisStep(0); return; }
    setAnalysisStep(0);
    const timer = window.setInterval(() => setAnalysisStep((step) => Math.min(step + 1, analysisStages.length - 1)), 900);
    return () => window.clearInterval(timer);
  }, [busy]);

  const stage = spec ? 'spec' : current?.stage || 'idea';
  const pageTitle = useMemo(() => spec?.overview.projectName || current?.name || input.projectName || '', [spec, current, input.projectName]);

  function showToast(message: string) { setToast({ message, id: Date.now() }); }

  function updateProject(next: SavedProject) {
    setCurrent(next);
    setProjects((previous) => upsertProject(previous, next));
  }

  function openProject(project: SavedProject) {
    setCurrent(project);
    setInput(project.idea);
    setAnswers(project.answers || {});
    setDecisions(project.challengeDecisions || {});
    setSpec(project.spec || null);
    setPrompt(project.codingPrompt || '');
    setError('');
  }

  function newProject() {
    setCurrent(null); setInput(blankIdea); setAnswers({}); setDecisions({}); setSpec(null); setPrompt(''); setError('');
  }

  function removeProject(id: string) {
    setProjects((previous) => previous.filter((project) => project.id !== id));
    if (current?.id === id) newProject();
    showToast('Project removed from this browser.');
  }

  function syncProject(update: Partial<SavedProject>) {
    if (!current) return;
    const next = { ...current, ...update, updatedAt: new Date().toISOString() };
    updateProject(next);
  }

  async function callAPI<T>(url: string, body: unknown, parse: (value: unknown) => { success: true; data: T } | { success: false }): Promise<T> {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new Error('The server returned an unreadable response. Try again.'); }
    if (!response.ok) {
      const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'The request could not be completed. Try again.';
      throw new Error(message);
    }
    const result = parse(payload);
    if (!result.success) throw new Error('The AI response did not match the expected format. Try again.');
    return result.data;
  }

  async function analyzeIdea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const parsed = ideaInputSchema.safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Add a little more detail to the idea.'); return; }
    setBusy('analyze');
    try {
      const discovery = await callAPI('/api/discovery', parsed.data, (value) => discoverySchema.safeParse(value));
      const next = createAnalyzedProject(current, parsed.data, discovery, new Date().toISOString(), makeId);
      setAnswers({}); setDecisions(next.challengeDecisions || {}); setSpec(null); setPrompt(''); updateProject(next);
    } catch (caught) {
      setError(caught instanceof TypeError ? "Couldn't reach the Prompt2Project server. Check your connection and try again." : caught instanceof Error ? caught.message : 'The analysis could not be completed. Check your connection and try again.');
    } finally { setBusy(null); }
  }

  async function generateSpec() {
    if (!current?.discovery) return;
    setError(''); setBusy('spec');
    try {
      const request = { input: current.idea, discovery: current.discovery, answers, challengeDecisions: decisions };
      const generated = await callAPI('/api/spec', request, (value) => projectSpecSchema.safeParse(value));
      setSpec(generated); setPrompt('');
      updateProject({ ...current, stage: 'spec', answers, challengeDecisions: decisions, spec: generated, codingPrompt: undefined, updatedAt: new Date().toISOString() });
    } catch (caught) {
      setError(caught instanceof TypeError ? "Couldn't reach the Prompt2Project server. Check your connection and try again." : caught instanceof Error ? caught.message : 'The specification could not be generated. Check your connection and try again.');
    } finally { setBusy(null); }
  }

  function answerQuestion(id: string, value: string) {
    const next = { ...answers, [id]: value };
    setAnswers(next); syncProject({ answers: next });
  }

  function chooseChallenge(id: string, value: 'accept' | 'keep') {
    const next = { ...decisions, [id]: value };
    setDecisions(next); syncProject({ challengeDecisions: next });
  }

  function editField(section: keyof ProjectSpec, field: string, value: string) {
    if (!spec) return;
    const currentValue = spec[section][field as keyof ProjectSpec[typeof section]];
    const newValue = Array.isArray(currentValue) ? value.split('\n').map((line) => line.trim()).filter(Boolean) : value;
    const next = { ...spec, [section]: { ...spec[section], [field]: newValue } } as ProjectSpec;
    setSpec(next); setPrompt(''); setError('');
    if (current) updateProject({ ...current, spec: next, codingPrompt: undefined, updatedAt: new Date().toISOString() });
  }

  function generatePrompt() {
    if (!spec) return;
    const parsed = projectSpecSchema.safeParse(spec);
    if (!parsed.success) { setError(`Review the spec fields before continuing: ${parsed.error.issues[0]?.message || 'a field is incomplete.'}`); return; }
    const generated = buildCodingPrompt(parsed.data, current?.idea.outputLanguage || input.outputLanguage, current?.idea.idea || input.idea);
    setError('');
    setPrompt(generated);
    syncProject({ codingPrompt: generated });
    showToast('Coding agent prompt ready.');
  }

  async function copyText(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); showToast(`${label} copied.`); }
    catch { showToast('Clipboard access was blocked. Select the text and copy it manually.'); }
  }

  function exportSpec() {
    if (!spec) return;
    const parsed = projectSpecSchema.safeParse(spec);
    if (!parsed.success) { setError(`Review the spec fields before exporting: ${parsed.error.issues[0]?.message || 'a field is incomplete.'}`); return; }
    setError(''); downloadMarkdown(specToMarkdown(parsed.data, current?.idea.outputLanguage || input.outputLanguage, current?.idea.idea || input.idea), 'spec');
  }

  function copySpec() {
    if (!spec) return;
    const parsed = projectSpecSchema.safeParse(spec);
    if (!parsed.success) { setError(`Review the spec fields before copying: ${parsed.error.issues[0]?.message || 'a field is incomplete.'}`); return; }
    setError(''); void copyText(specToMarkdown(parsed.data, current?.idea.outputLanguage || input.outputLanguage, current?.idea.idea || input.idea), 'Project spec');
  }

  function downloadMarkdown(value: string, suffix: string) {
    const name = (pageTitle || 'project-spec').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project-spec';
    const blob = new Blob([value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${name}-${suffix}.md`; anchor.click();
    URL.revokeObjectURL(url);
    showToast(`${suffix === 'spec' ? 'Project spec' : 'Coding prompt'} exported.`);
  }

  function toggleTheme() { setTheme((value) => value === 'dark' ? 'light' : 'dark'); }

  const animationProps = reduced ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } } : fade;

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Project history">
      <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); newProject(); }}>
        <span className="brand-mark"><Workflow size={19} strokeWidth={2.2} /></span>
        <span className="brand-copy">prompt<span>2</span>project</span>
      </a>
      <section className="sidebar-section">
        <div className="sidebar-heading"><span className="sidebar-label">Your projects</span><button className="icon-button" type="button" aria-label="Start a new project" onClick={newProject}><Plus size={16} /></button></div>
        {projects.length === 0 ? <p className="history-empty">Your project notes stay on this device. Start a plan and it will show up here.</p> : <div className="history-list">{projects.map((project) => <div key={project.id} className={`history-row ${current?.id === project.id ? 'active' : ''}`}>
          <button type="button" className="history-open" onClick={() => openProject(project)}><span className="history-name">{project.name}</span><span className="history-date">{dateLabel(project.updatedAt)} · {project.stage}</span></button>
          <button className="icon-button history-remove" type="button" aria-label={`Remove ${project.name}`} onClick={() => removeProject(project.id)}><X size={14} /></button>
        </div>)}</div>}
      </section>
      <div className="sidebar-foot">No account needed. Your project history is stored in this browser.</div>
    </aside>

    <main className="main-area">
      <header className="topbar"><span className="topbar-note">AI software planning copilot</span><button className="theme-control" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}{theme === 'dark' ? 'Light' : 'Dark'} mode</button></header>
      <div className="mobile-history" aria-label="Recent projects"><button className="mobile-project" type="button" onClick={newProject}>＋ New project</button>{projects.map((project) => <button key={project.id} className={`mobile-project ${current?.id === project.id ? 'active' : ''}`} type="button" onClick={() => openProject(project)}>{project.name}</button>)}</div>

      <AnimatePresence mode="wait">
        {stage === 'idea' && <motion.div key="idea" className="content-wrap" {...animationProps}>
          <div className="screen-heading"><span className="eyebrow">From rough thought to clear plan</span><h1>Make the idea<br />ready to <em>build.</em></h1><p>Describe what you have in mind. Prompt2Project will find the gaps, question the risky parts, and help you shape a spec you can hand to a coding agent.</p></div>
          <div className="workbench-grid">
            <form className="card idea-card" onSubmit={analyzeIdea}>
              <div className="card-topline"><h2 className="card-title">Start with the idea</h2><span className="step-note">01 / 03 · DISCOVERY</span></div>
              <div className="field"><label htmlFor="project-name">Project name <span>optional</span></label><input id="project-name" maxLength={100} placeholder="e.g. Trail Notes" value={input.projectName} onChange={(event) => setInput({ ...input, projectName: event.target.value })} /></div>
              <div className="field"><label htmlFor="idea">What do you want to build? <span>required</span></label><textarea id="idea" className="idea-input" minLength={8} maxLength={8_000} required placeholder="A volunteer coordinator for neighborhood food banks. It should match volunteers to shifts and send reminders…" value={input.idea} onChange={(event) => setInput({ ...input, idea: event.target.value })} /></div>
              <div className="field-row">
                <div className="field"><label htmlFor="platform">Platform</label><div className="select-wrap"><select id="platform" value={input.platform} onChange={(event) => setInput({ ...input, platform: event.target.value as IdeaInput['platform'] })}><option>Web</option><option>Mobile</option><option>Desktop</option><option>API / Backend</option><option>Other</option><option>I don't know yet</option></select><ChevronDown size={14} /></div></div>
                <div className="field"><label htmlFor="language">Output language</label><div className="select-wrap"><select id="language" value={input.outputLanguage} onChange={(event) => setInput({ ...input, outputLanguage: event.target.value as IdeaInput['outputLanguage'] })}><option>English</option><option>Português</option><option>Same as input</option></select><ChevronDown size={14} /></div></div>
              </div>
              <div className="field"><label htmlFor="target-user">Who is it for? <span>optional</span></label><input id="target-user" maxLength={500} placeholder="e.g. volunteer coordinators at small nonprofits" value={input.targetUser} onChange={(event) => setInput({ ...input, targetUser: event.target.value })} /></div>
              <div className="field"><label htmlFor="preferences">Preferences or constraints <span>optional</span></label><textarea id="preferences" maxLength={1_500} placeholder="Prefer Python · must work offline · keep hosting costs low" value={input.preferences} onChange={(event) => setInput({ ...input, preferences: event.target.value })} /></div>
              {error && <div className="error-box" role="alert"><AlertCircle size={16} />{error}</div>}
              <div className="submit-row"><span className="helper-note"><ShieldCheck size={13} /> Gemini creates your analysis and spec. History stays in this browser.</span><button className="primary-button" type="submit" disabled={busy !== null}>{busy === 'analyze' ? <><LoaderCircle size={15} className="spinner" /> Analyzing idea</> : <>Analyze idea <ArrowRight size={15} /></>}</button></div>
            </form>

            <section className="card visual-card" aria-label="Idea decomposition preview">
              <div className="visual-heading"><div><span className="eyebrow">How it takes shape</span><p>A clearer project, one decision at a time.</p></div><span className="live-dot" title="Ready" /></div>
              <IdeaMap idea={input.idea} active={Boolean(input.idea.trim())} analyzing={busy === 'analyze'} analysisStep={analysisStep} />
              <div className="map-status"><span className="status-label" aria-live="polite"><span className="live-dot" /> {busy === 'analyze' ? analysisStages[analysisStep] : 'Known context'}</span><span className="status-line" /><span className="status-label"><CircleHelp size={13} /> Open questions</span></div>
              <div className="mapping-note"><strong>Good plans start with good questions.</strong> We look for meaningful gaps and complexity before recommending a stack.</div>
            </section>
          </div>
        </motion.div>}

        {stage === 'discovery' && current?.discovery && <motion.div key="discovery" className="content-wrap" {...animationProps}>
          <div className="screen-heading"><span className="eyebrow">Discovery · {pageTitle}</span><h1>See the shape<br />before you <em>build.</em></h1><p>Check what we understood, answer what matters, and decide which product engineer suggestions belong in your plan.</p></div>
          <div className="discovery-wrap">
            <section className="card intro-card"><span className="eyebrow">Project understanding</span><h2>{pageTitle || 'Your idea'}</h2><p>{current.discovery.projectUnderstanding}</p></section>
            <div className="columns">
              <section className="card info-card"><h2 className="section-title"><CheckCheck size={16} /> Known so far</h2><ul className="item-list">{current.discovery.knownInformation.length ? current.discovery.knownInformation.map((item, index) => <li key={`${item}-${index}`}>{item}</li>) : <li>We have not identified any firm details yet.</li>}</ul></section>
              <section className="card info-card"><h2 className="section-title"><CircleHelp size={16} /> Still open</h2><ul className="item-list missing">{current.discovery.missingInformation.length ? current.discovery.missingInformation.map((item, index) => <li key={`${item}-${index}`}>{item}</li>) : <li>The core direction is already clear.</li>}</ul></section>
            </div>

            {current.discovery.challenges.length > 0 && <section className="challenge-list" aria-label="Product engineer suggestions"><div className="card-topline"><h2 className="section-title"><Sparkles size={16} /> Product engineer notes</h2><span className="step-note">YOUR CALL</span></div>{current.discovery.challenges.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} decision={decisions[challenge.id] || 'keep'} onDecision={(choice) => chooseChallenge(challenge.id, choice)} />)}</section>}

            {current.discovery.questions.length > 0 && <section className="question-list" aria-label="Discovery questions"><div className="card-topline"><h2 className="section-title"><CircleHelp size={16} /> A few decisions to make</h2><span className="step-note">{current.discovery.questions.length} QUESTIONS</span></div>{current.discovery.questions.map((question, index) => <motion.article key={question.id} className="card question-card" layout initial={fade.initial} animate={fade.animate} transition={{ ...fade.transition, delay: reduced ? 0 : Math.min(index * .04, .2) }}>
              <span className="question-index">QUESTION {String(index + 1).padStart(2, '0')}</span><h3>{question.question}</h3><p className="question-reason">{question.reason}</p><ChoiceButtons question={question} answer={answers[question.id] || ''} onChange={(value) => answerQuestion(question.id, value)} />
            </motion.article>)}</section>}

            {error && <div className="error-box" role="alert"><AlertCircle size={16} />{error}</div>}
            <div className="discovery-actions"><button className="quiet-button" type="button" onClick={() => { setSpec(null); if (current) updateProject({ ...current, stage: 'idea', updatedAt: new Date().toISOString() }); }}><ArrowLeft size={14} /> Edit idea</button><span className="decision-note">You can leave questions open. They will stay visible in the spec.</span><button className="primary-button" type="button" onClick={generateSpec} disabled={busy !== null}>{busy === 'spec' ? <><LoaderCircle size={15} className="spinner" /> Building the spec</> : <>Generate project spec <ArrowRight size={15} /></>}</button></div>
          </div>
        </motion.div>}

        {stage === 'spec' && spec && <motion.div key="spec" className="content-wrap" {...animationProps}>
          <div className="screen-heading"><span className="eyebrow">Project spec · {pageTitle}</span><h1>Review. Refine.<br /><em>Ready to build.</em></h1><p>This is your working plan. Edit any field before you turn it into a coding agent prompt.</p></div>
          <div className="spec-wrap">
            <section className="card spec-toolbar"><div className="spec-toolbar-copy"><span className="ready-badge"><Check size={13} /> Ready for review</span><span className="helper-note">Changes save in this browser.</span></div><div className="toolbar-actions"><button type="button" className="secondary-button" onClick={exportSpec}><FileDown size={14} /> Export spec</button><button type="button" className="secondary-button" onClick={copySpec}><Clipboard size={14} /> Copy spec</button></div></section>
            {error && <div className="error-box" role="alert"><AlertCircle size={16} />{error}</div>}
            {sectionFields.map((section, sectionIndex) => {
              const Icon = section.icon;
              return <motion.section key={section.key} className="card spec-section" initial={reduced ? false : { opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .22, delay: reduced ? 0 : sectionIndex * .035 }}>
                <header><h2><Icon size={16} style={{ verticalAlign: 'middle', marginRight: 9, color: 'var(--lavender)' }} />{section.title}</h2><span className="step-note">EDITABLE</span></header>
                <div className="spec-fields">{section.fields.slice(0, section.key === 'overview' ? 6 : 2).map((field) => <SpecField key={field.key} section={section.key} field={field} spec={spec} onChange={editField} />)}</div>
                {section.fields.length > 2 && <details><summary>More in {section.title.toLowerCase()}</summary><div className="spec-fields">{section.fields.slice(2).map((field) => <SpecField key={field.key} section={section.key} field={field} spec={spec} onChange={editField} />)}</div></details>}
              </motion.section>;
            })}
            <section className="card prompt-card"><div className="card-topline"><div><span className="eyebrow">Handoff</span><h2 className="card-title" style={{ marginTop: 6 }}>Turn this spec into a build brief.</h2></div><WandSparkles size={20} color="var(--accent)" /></div><p className="helper-note" style={{ lineHeight: 1.6 }}>The coding prompt uses the spec you just reviewed, including acceptance criteria, testing requirements, and a clear boundary against silent scope expansion.</p>
              {!prompt ? <button className="primary-button" type="button" onClick={generatePrompt}><WandSparkles size={15} /> Generate coding agent prompt <ArrowRight size={14} /></button> : <><pre className="prompt-preview">{prompt}</pre><div className="toolbar-actions" style={{ marginTop: 13 }}><button className="primary-button" type="button" onClick={() => copyText(prompt, 'Coding prompt')}><Clipboard size={14} /> Copy prompt</button><button className="secondary-button" type="button" onClick={() => downloadMarkdown(prompt, 'coding-prompt')}><FileDown size={14} /> Export Markdown</button></div></>}
            </section>
            <div className="discovery-actions"><button className="quiet-button" type="button" onClick={() => { setSpec(null); if (current) updateProject({ ...current, stage: 'discovery', spec: undefined, codingPrompt: undefined }); }}><ArrowLeft size={14} /> Back to discovery</button><span className="decision-note">{spec.execution.openQuestions.length} open questions carried forward</span><button className="quiet-button" type="button" onClick={newProject}>Start another idea <Plus size={14} /></button></div>
          </div>
        </motion.div>}
      </AnimatePresence>
    </main>
    <AnimatePresence>{toast && <motion.div key={toast.id} className="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: reduced ? 0 : .18 }}><Check size={15} />{toast.message}</motion.div>}</AnimatePresence>
  </div>;
}

function SpecField({ section, field, spec, onChange }: { section: keyof ProjectSpec; field: { key: string; label: string; wide?: boolean }; spec: ProjectSpec; onChange: (section: keyof ProjectSpec, field: string, value: string) => void }) {
  const value: unknown = spec[section][field.key as never];
  const text = Array.isArray(value) ? value.join('\n') : String(value ?? '');
  return <div className={`spec-field ${field.wide ? 'wide' : ''}`}><label htmlFor={`spec-${section}-${field.key}`}>{field.label}{Array.isArray(value) && <span> · one item per line</span>}</label><textarea id={`spec-${section}-${field.key}`} value={text} maxLength={Array.isArray(value) ? 16_000 : 800} onChange={(event) => onChange(section, field.key, event.target.value)} rows={Array.isArray(value) ? Math.min(Math.max(text.split('\n').length, 3), 8) : 3} /></div>;
}
