'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, CircleHelp,
  Clipboard, FileDown, LoaderCircle,
  ExternalLink, Moon, Plus, ShieldCheck, Sparkles, Sun, WandSparkles, Workflow, X,
} from 'lucide-react';
import {
  discoverySchema, ideaInputSchema, projectSpecSchema,
  type Challenge, type Discovery, type IdeaInput, type IdeaInputDraft, type ProjectSpec,
} from '../lib/schemas/project';
import { buildCodingPrompt, specToMarkdown } from '../lib/domain/markdown';
import { tryWriteClipboard } from '../lib/client/clipboard';
import { downloadMarkdownFile } from '../lib/client/markdown-download';
import { postJson } from '../lib/client/request';
import { extractIdeaConcepts } from '../lib/domain/idea-concepts';
import { normalizeIdeaDraft } from '../lib/domain/idea-draft';
import { resolveOutputLanguage } from '../lib/domain/language';
import type { ResolvedOutputLanguage } from '../lib/domain/language';
import { getAppCopy, withAppLanguage } from '../lib/domain/app-presentation';
import { formatDiscoveryFact, getDiscoveryCopy, localizeDiscoveryError } from '../lib/domain/discovery-presentation';
import { getSpecCopy, type SpecFieldKey, type SpecSectionKey } from '../lib/domain/spec-presentation';
import { createAnalyzedProject, upsertProject } from '../lib/domain/projects';
import {
  PROJECTS_BACKUP_STORAGE_KEY,
  PROJECTS_STORAGE_KEY,
  readProjectHistory,
  serializeProjects,
  type SavedProject,
} from '../lib/storage/projects';

type BusyAction = 'analyze' | 'spec' | null;
type ToastState = { message: string; id: number } | null;

const blankIdea: IdeaInputDraft = normalizeIdeaDraft();
const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.24, ease: 'easeOut' as const } };
const sectionFields: { key: SpecSectionKey; fields: { key: SpecFieldKey; wide?: boolean }[] }[] = [
  { key: 'overview', fields: [{ key: 'projectName', wide: true }, { key: 'summary', wide: true }, { key: 'problem' }, { key: 'solution' }, { key: 'targetUser' }, { key: 'goals' }] },
  { key: 'product', fields: [{ key: 'mvpFeatures' }, { key: 'outOfScope' }, { key: 'userStories' }, { key: 'primaryUserFlow' }] },
  { key: 'engineering', fields: [{ key: 'recommendedStack' }, { key: 'architecture' }, { key: 'mainComponents' }, { key: 'dataModel' }, { key: 'apiEndpoints' }, { key: 'integrations' }, { key: 'decisions', wide: true }] },
  { key: 'quality', fields: [{ key: 'security' }, { key: 'privacy' }, { key: 'edgeCases' }, { key: 'errorScenarios' }, { key: 'acceptanceCriteria', wide: true }] },
  { key: 'execution', fields: [{ key: 'phases' }, { key: 'developmentTasks' }, { key: 'risks' }, { key: 'openQuestions' }, { key: 'futureImprovements', wide: true }] },
];

function dateLabel(value: string, language: ResolvedOutputLanguage): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? (language === 'Português' ? 'Recentemente' : 'Recently') : new Intl.DateTimeFormat(language === 'Português' ? 'pt-BR' : 'en-US', { month: 'short', day: 'numeric' }).format(date);
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function useMotionPreference() {
  return useReducedMotion();
}

function IdeaMap({ idea, active, analyzing, analysisStep, copy, language }: { idea: string; active: boolean; analyzing: boolean; analysisStep: number; copy: ReturnType<typeof getAppCopy>; language: ResolvedOutputLanguage }) {
  const reduced = useMotionPreference();
  const duration = reduced ? 0 : 0.42;
  const concepts = extractIdeaConcepts(idea, language);
  const connectionProgress = analyzing ? Number(analysisStep > 0) : Number(active);
  const nodeMotion = (delay: number) => ({ initial: { opacity: 0, scale: reduced ? 1 : 0.82, y: reduced ? 0 : 6 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { duration, delay: reduced ? 0 : delay } });
  return <div className="map-stage" role="group" aria-label={copy.ideaMapAria} aria-busy={analyzing}>
    <svg className="map-lines" viewBox="0 0 420 270" preserveAspectRatio="none" aria-hidden="true">
      <motion.path d="M210 60 C210 100 92 85 92 125" initial={{ pathLength: 0 }} animate={{ pathLength: connectionProgress ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : .08 }} />
      <motion.path d="M210 60 C210 100 210 85 210 125" initial={{ pathLength: 0 }} animate={{ pathLength: connectionProgress ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : .12 }} />
      <motion.path d="M210 60 C210 100 328 85 328 125" initial={{ pathLength: 0 }} animate={{ pathLength: connectionProgress ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : .16 }} />
      <motion.path d="M92 153 C100 210 170 190 210 219" initial={{ pathLength: 0 }} animate={{ pathLength: analysisStep >= 2 || (!analyzing && active) ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : .26 }} />
      <motion.path d="M210 153 C210 190 210 190 210 219" initial={{ pathLength: 0 }} animate={{ pathLength: analysisStep >= 2 || (!analyzing && active) ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : .3 }} />
      <motion.path d="M328 153 C320 210 250 190 210 219" initial={{ pathLength: 0 }} animate={{ pathLength: analysisStep >= 2 || (!analyzing && active) ? 1 : 0.3 }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : .34 }} />
    </svg>
    <motion.div className={`idea-node ${active ? 'is-active' : ''} ${analyzing && analysisStep === 0 ? 'is-current' : ''}`} {...nodeMotion(0)}>{idea ? `“${idea.slice(0, 66)}${idea.length > 66 ? '…' : ''}”` : copy.ideaStartsHere}</motion.div>
    {concepts.map((concept, index) => <motion.div key={`${concept}-${index}`} className={`concept-node ${index === 0 ? 'left' : index === 1 ? 'middle' : 'right'} ${active ? 'is-active' : ''} ${analyzing && analysisStep === 1 ? 'is-current' : ''}`} {...nodeMotion(.12 + index * .06)}>{concept}</motion.div>)}
    <motion.div className={`core-node ${active ? 'is-active' : ''} ${analyzing && analysisStep === 2 ? 'is-current' : ''}`} {...nodeMotion(.32)}><Workflow size={13} /> &nbsp;{copy.buildablePlan}</motion.div>
  </div>;
}

function ChoiceButtons({ question, answer, onChange, copy }: { question: Discovery['questions'][number]; answer: string; onChange: (value: string) => void; copy: ReturnType<typeof getDiscoveryCopy> }) {
  if (question.type === 'single-choice' && question.options.length) {
    return <div className="choice-row" role="group" aria-label={question.question}>
      {question.options.map((option) => <button key={option} type="button" className={`choice-chip ${answer === option ? 'selected' : ''}`} aria-pressed={answer === option} onClick={() => onChange(answer === option ? '' : option)}>{option}</button>)}
    </div>;
  }
  return <textarea className="answer-field" aria-label={`${copy.answerLabel} ${question.question}`} placeholder={copy.answerPlaceholder} value={answer} onChange={(event) => onChange(event.target.value)} />;
}

function ChallengeCard({ challenge, decision, onDecision, copy }: { challenge: Challenge; decision: 'accept' | 'keep'; onDecision: (value: 'accept' | 'keep') => void; copy: ReturnType<typeof getDiscoveryCopy> }) {
  return <motion.article className="card challenge-card" layout initial={fade.initial} animate={fade.animate} transition={fade.transition}>
    <div className="challenge-top"><h3>{challenge.issue}</h3><span className={`severity ${challenge.severity}`}>{copy.severity[challenge.severity]} {copy.impact}</span></div>
    <p className="challenge-copy">{challenge.reason}</p>
    <div className="suggestion"><strong>{copy.productEngineerSuggestion}</strong> {challenge.suggestion}</div>
    <div className="choice-row" role="group" aria-label={`${copy.decisionFor} ${challenge.issue}`}>
      <button type="button" className={`choice-chip ${decision === 'accept' ? 'selected' : ''}`} aria-pressed={decision === 'accept'} onClick={() => onDecision('accept')}><Check size={12} /> {copy.acceptSuggestion}</button>
      <button type="button" className={`choice-chip ${decision === 'keep' ? 'selected' : ''}`} aria-pressed={decision === 'keep'} onClick={() => onDecision('keep')}>{copy.keepApproach}</button>
    </div>
  </motion.article>;
}

export function Workspace() {
  const reduced = useMotionPreference();
  const [loaded, setLoaded] = useState(false);
  const [projectHistoryWritable, setProjectHistoryWritable] = useState(false);
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
  const [appLanguage, setAppLanguage] = useState<ResolvedOutputLanguage>('English');
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      const history = readProjectHistory(savedValue);
      setProjects(history.projects);
      let canWriteHistory = true;
      if (history.needsBackup && savedValue !== null) {
        try {
          if (window.localStorage.getItem(PROJECTS_BACKUP_STORAGE_KEY) === null) {
            window.localStorage.setItem(PROJECTS_BACKUP_STORAGE_KEY, savedValue);
          }
        } catch {
          canWriteHistory = false;
        }
      }
      setProjectHistoryWritable(canWriteHistory);
      const savedTheme = window.localStorage.getItem('prompt2project.theme');
      if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
      const savedLanguage = window.localStorage.getItem('prompt2project.language');
      if (savedLanguage === 'English' || savedLanguage === 'Português') setAppLanguage(savedLanguage);
      else if (history.projects[0]) setAppLanguage(resolveOutputLanguage(history.projects[0].idea.outputLanguage, history.projects[0].idea.idea));
    } catch {
      setProjects([]);
      setProjectHistoryWritable(false);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !projectHistoryWritable) return;
    try { window.localStorage.setItem(PROJECTS_STORAGE_KEY, serializeProjects(projects)); } catch { showToast(appCopy.localStorageFull); }
  }, [projects, loaded, projectHistoryWritable]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (loaded) {
      try { window.localStorage.setItem('prompt2project.theme', theme); } catch { /* Theme remains available for this session. */ }
    }
  }, [theme, loaded]);

  useEffect(() => {
    document.documentElement.lang = appLanguage === 'Português' ? 'pt-BR' : 'en';
    document.title = appCopy.documentTitle;
    if (loaded) {
      try { window.localStorage.setItem('prompt2project.language', appLanguage); } catch { /* Language remains available for this session. */ }
    }
  }, [appLanguage, loaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (busy !== 'analyze') { setAnalysisStep(0); return; }
    setAnalysisStep(0);
    const timer = window.setInterval(() => setAnalysisStep((step) => Math.min(step + 1, appCopy.analysisStages.length - 1)), 900);
    return () => window.clearInterval(timer);
  }, [busy]);

  const stage = spec ? 'spec' : current?.stage || 'idea';
  const pageTitle = useMemo(() => spec?.overview.projectName || current?.name || input.projectName || '', [spec, current, input.projectName]);
  const discoveryLanguage = appLanguage;
  const appCopy = getAppCopy(appLanguage);
  const discoveryCopy = getDiscoveryCopy(discoveryLanguage);
  const specCopy = getSpecCopy(discoveryLanguage);

  function showToast(message: string) { setToast({ message, id: Date.now() }); }

  function updateProject(next: SavedProject) {
    setCurrent(next);
    setProjects((previous) => upsertProject(previous, next));
  }

  function openProject(project: SavedProject) {
    setCurrent(project);
    setInput(normalizeIdeaDraft(project.idea));
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
    showToast(appCopy.projectRemoved);
  }

  function syncProject(update: Partial<SavedProject>) {
    if (!current) return;
    const next = { ...current, ...update, updatedAt: new Date().toISOString() };
    updateProject(next);
  }

  async function callAPI<T>(url: string, body: unknown, parse: (value: unknown) => { success: true; data: T } | { success: false }): Promise<T> {
    return postJson(url, body, parse, {
      serverUnreadable: appCopy.serverUnreadable,
      requestFailed: appCopy.requestFailed,
      invalidResponse: appCopy.invalidAIResponse,
      timedOut: appCopy.requestTimedOut,
      rateLimited: appCopy.rateLimited,
      aiUnavailable: appCopy.aiUnavailable,
    });
  }

  async function analyzeIdea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const parsed = ideaInputSchema.safeParse({ ...input, outputLanguage: appLanguage, projectName: input.projectName || appCopy.untitledProject });
    if (!parsed.success) { setError(parsed.error.issues[0]?.code === 'too_small' ? appCopy.ideaTooShort : appCopy.addDetail); return; }
    const selectedInput = withAppLanguage(parsed.data, appLanguage);
    setBusy('analyze');
    try {
      const discovery = await callAPI('/api/discovery', selectedInput, (value) => discoverySchema.safeParse(value));
      const next = createAnalyzedProject(current, selectedInput, discovery, new Date().toISOString(), makeId);
      setAnswers({}); setDecisions(next.challengeDecisions || {}); setSpec(null); setPrompt(''); updateProject(next);
    } catch (caught) {
      const message = caught instanceof TypeError ? appCopy.cannotReachServer : caught instanceof Error ? caught.message : appCopy.analysisFailed;
      setError(localizeDiscoveryError(message, appLanguage));
    } finally { setBusy(null); }
  }

  async function generateSpec() {
    if (!current?.discovery) return;
    setError(''); setBusy('spec');
    try {
      const selectedInput = withAppLanguage(current.idea, appLanguage);
      const request = { input: selectedInput, discovery: current.discovery, answers, challengeDecisions: decisions };
      const generated = await callAPI('/api/spec', request, (value) => projectSpecSchema.safeParse(value));
      setSpec(generated); setPrompt('');
      updateProject({ ...current, idea: selectedInput, stage: 'spec', answers, challengeDecisions: decisions, spec: generated, codingPrompt: undefined, updatedAt: new Date().toISOString() });
    } catch (caught) {
      const message = caught instanceof TypeError ? appCopy.cannotReachServer : caught instanceof Error ? caught.message : appCopy.specFailed;
      setError(localizeDiscoveryError(message, discoveryLanguage));
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
    if (!parsed.success) { setError(specCopy.incompleteSpecError); return; }
    const generated = buildCodingPrompt(parsed.data, appLanguage, current?.idea.idea || input.idea);
    setError('');
    setPrompt(generated);
    syncProject({ codingPrompt: generated });
    showToast(specCopy.promptReady);
  }

  async function copyText(value: string, successMessage: string) {
    const copied = await tryWriteClipboard(value, (text) => window.navigator.clipboard.writeText(text));
    showToast(copied ? successMessage : specCopy.clipboardBlocked);
  }

  function copyPromptForHandoff() {
    void copyText(prompt, specCopy.promptCopiedForChat);
  }

  function exportSpec() {
    if (!spec) return;
    const parsed = projectSpecSchema.safeParse(spec);
    if (!parsed.success) { setError(appCopy.specExportError); return; }
    setError(''); downloadMarkdown(specToMarkdown(parsed.data, appLanguage, current?.idea.idea || input.idea), appCopy.specFileSuffix, specCopy.specExported);
  }

  function copySpec() {
    if (!spec) return;
    const parsed = projectSpecSchema.safeParse(spec);
    if (!parsed.success) { setError(appCopy.specCopyError); return; }
    setError(''); void copyText(specToMarkdown(parsed.data, appLanguage, current?.idea.idea || input.idea), specCopy.specCopied);
  }

  function downloadMarkdown(value: string, suffix: string, successMessage: string) {
    try {
      downloadMarkdownFile(value, pageTitle || appCopy.defaultFileName, suffix);
      setError('');
      showToast(successMessage);
    } catch {
      setError(appCopy.markdownExportFailed);
    }
  }

  function toggleTheme() { setTheme((value) => value === 'dark' ? 'light' : 'dark'); }

  function toggleLanguage() {
    const nextLanguage = appLanguage === 'English' ? 'Português' : 'English';
    setAppLanguage(nextLanguage);
    if (current?.discovery) showToast(getAppCopy(nextLanguage).existingProjectLanguageNote);
  }

  const animationProps = reduced ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } } : fade;

  return <div className="app-shell">
    <aside className="sidebar" aria-label={appCopy.projectHistory}>
      <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); newProject(); }}>
        <span className="brand-mark"><Workflow size={19} strokeWidth={2.2} /></span>
        <span className="brand-copy">prompt<span>2</span>project</span>
      </a>
      <section className="sidebar-section">
        <div className="sidebar-heading"><span className="sidebar-label">{appCopy.projects}</span><button className="icon-button" type="button" aria-label={appCopy.startProject} onClick={newProject}><Plus size={16} /></button></div>
        {projects.length === 0 ? <p className="history-empty">{appCopy.historyEmpty}</p> : <div className="history-list">{projects.map((project) => <div key={project.id} className={`history-row ${current?.id === project.id ? 'active' : ''}`}>
          <button type="button" className="history-open" onClick={() => openProject(project)}><span className="history-name">{project.name}</span><span className="history-date">{dateLabel(project.updatedAt, appLanguage)} · {appCopy.stages[project.stage]}</span></button>
          <button className="icon-button history-remove" type="button" aria-label={appCopy.removeProject(project.name)} onClick={() => removeProject(project.id)}><X size={14} /></button>
        </div>)}</div>}
      </section>
      <div className="sidebar-foot">{appCopy.noAccount}</div>
    </aside>

    <main className="main-area">
      <header className="topbar"><span className="topbar-note">{appCopy.topbarNote}</span><button className="language-control" type="button" aria-label={appCopy.languageSwitchLabel} aria-pressed={appLanguage === 'Português'} title={appCopy.languageSwitchLabel} onClick={toggleLanguage}><span className={appLanguage === 'English' ? 'selected' : ''}>EN</span><span className={appLanguage === 'Português' ? 'selected' : ''}>PT</span></button><button className="theme-control" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? appCopy.switchToLightAria : appCopy.switchToDarkAria}>{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}{theme === 'dark' ? appCopy.switchToLight : appCopy.switchToDark}</button></header>
      <div className="mobile-history" aria-label={appCopy.recentProjects}><button className="mobile-project" type="button" onClick={newProject}>＋ {appCopy.newProject}</button>{projects.map((project) => <button key={project.id} className={`mobile-project ${current?.id === project.id ? 'active' : ''}`} type="button" onClick={() => openProject(project)}>{project.name}</button>)}</div>

      <AnimatePresence mode="wait">
        {stage === 'idea' && <motion.div key="idea" className="content-wrap" {...animationProps}>
          <div className="screen-heading"><span className="eyebrow">{appCopy.heroEyebrow}</span><h1>{appCopy.heroTitleStart}<br />{appCopy.heroTitleEnd} <em>{appCopy.heroTitleAccent}</em></h1><p>{appCopy.heroDescription}</p></div>
          <div className="workbench-grid">
            <form className="card idea-card" onSubmit={analyzeIdea}>
              <div className="card-topline"><h2 className="card-title">{appCopy.ideaCardTitle}</h2><span className="step-note">{appCopy.discoveryStep}</span></div>
              <div className="field"><label htmlFor="project-name">{appCopy.projectName} <span>{appCopy.optional}</span></label><input id="project-name" maxLength={100} placeholder={appCopy.projectNamePlaceholder} value={input.projectName ?? ''} onChange={(event) => setInput({ ...input, projectName: event.target.value })} /></div>
              <div className="field"><label htmlFor="idea">{appCopy.ideaLabel} <span>{appCopy.required}</span></label><textarea id="idea" className="idea-input" minLength={8} maxLength={8_000} required placeholder={appCopy.ideaPlaceholder} value={input.idea ?? ''} onChange={(event) => setInput({ ...input, idea: event.target.value })} /></div>
              <div className="field-row">
                <div className="field"><label htmlFor="platform">{appCopy.platform}</label><div className="select-wrap"><select id="platform" value={input.platform ?? "I don't know yet"} onChange={(event) => setInput({ ...input, platform: event.target.value as IdeaInput['platform'] })}><option value="Web">{appCopy.platformOptions.Web}</option><option value="Mobile">{appCopy.platformOptions.Mobile}</option><option value="Desktop">{appCopy.platformOptions.Desktop}</option><option value="API / Backend">{appCopy.platformOptions['API / Backend']}</option><option value="Other">{appCopy.platformOptions.Other}</option><option value="I don't know yet">{appCopy.platformOptions.unknown}</option></select><ChevronDown size={14} /></div></div>
              </div>
              <div className="field"><label htmlFor="target-user">{appCopy.targetUser} <span>{appCopy.optional}</span></label><input id="target-user" maxLength={500} placeholder={appCopy.targetUserPlaceholder} value={input.targetUser ?? ''} onChange={(event) => setInput({ ...input, targetUser: event.target.value })} /></div>
              <div className="field"><label htmlFor="preferences">{appCopy.preferences} <span>{appCopy.optional}</span></label><textarea id="preferences" maxLength={1_500} placeholder={appCopy.preferencesPlaceholder} value={input.preferences ?? ''} onChange={(event) => setInput({ ...input, preferences: event.target.value })} /></div>
              {error && <div className="error-box" role="alert"><AlertCircle size={16} />{error}</div>}
              <div className="submit-row"><span className="helper-note"><ShieldCheck size={13} /> {appCopy.providerPrivacy}</span><button className="primary-button" type="submit" disabled={busy !== null}>{busy === 'analyze' ? <><LoaderCircle size={15} className="spinner" /> {appCopy.analyzingIdea}</> : <>{appCopy.analyzeIdea} <ArrowRight size={15} /></>}</button></div>
            </form>

            <section className="card visual-card" aria-label={appCopy.visualAria}>
              <div className="visual-heading"><div><span className="eyebrow">{appCopy.visualEyebrow}</span><p>{appCopy.visualDescription}</p></div><span className="live-dot" title={appCopy.ready} /></div>
              <IdeaMap idea={input.idea} active={Boolean(input.idea.trim())} analyzing={busy === 'analyze'} analysisStep={analysisStep} copy={appCopy} language={appLanguage} />
              <div className="map-status"><span className="status-label" aria-live="polite"><span className="live-dot" /> {busy === 'analyze' ? appCopy.analysisStages[analysisStep] : appCopy.knownContext}</span><span className="status-line" /><span className="status-label"><CircleHelp size={13} /> {appCopy.openQuestions}</span></div>
              <div className="mapping-note"><strong>{appCopy.mappingTitle}</strong> {appCopy.mappingDescription}</div>
            </section>
          </div>
        </motion.div>}

        {stage === 'discovery' && current?.discovery && <motion.div key="discovery" className="content-wrap" {...animationProps}>
          <div className="screen-heading"><span className="eyebrow">{discoveryCopy.eyebrow} · {pageTitle}</span><h1>{discoveryCopy.title}<br /><em>{discoveryCopy.titleAccent}</em></h1><p>{discoveryCopy.description}</p></div>
          <div className="discovery-wrap">
            <section className="card intro-card"><span className="eyebrow">{discoveryCopy.projectUnderstanding}</span><h2>{pageTitle || discoveryCopy.yourIdea}</h2><p>{current.discovery.projectUnderstanding}</p></section>
            <div className="columns">
              <section className="card info-card"><h2 className="section-title"><CheckCheck size={16} /> {discoveryCopy.knownSoFar}</h2><ul className="item-list">{current.discovery.knownInformation.length ? current.discovery.knownInformation.map((item, index) => <li key={`${item}-${index}`}>{formatDiscoveryFact(item, discoveryLanguage)}</li>) : <li>{discoveryCopy.noKnownInformation}</li>}</ul></section>
              <section className="card info-card"><h2 className="section-title"><CircleHelp size={16} /> {discoveryCopy.stillOpen}</h2><ul className="item-list missing">{current.discovery.missingInformation.length ? current.discovery.missingInformation.map((item, index) => <li key={`${item}-${index}`}>{formatDiscoveryFact(item, discoveryLanguage)}</li>) : <li>{discoveryCopy.noMissingInformation}</li>}</ul></section>
            </div>

            {current.discovery.challenges.length > 0 && <section className="challenge-list" aria-label={discoveryCopy.productEngineerNotes}><div className="card-topline"><h2 className="section-title"><Sparkles size={16} /> {discoveryCopy.productEngineerNotes}</h2><span className="step-note">{discoveryCopy.yourCall}</span></div>{current.discovery.challenges.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} decision={decisions[challenge.id] || 'keep'} onDecision={(choice) => chooseChallenge(challenge.id, choice)} copy={discoveryCopy} />)}</section>}

            {current.discovery.questions.length > 0 && <section className="question-list" aria-label={discoveryCopy.decisionsToMake}><div className="card-topline"><h2 className="section-title"><CircleHelp size={16} /> {discoveryCopy.decisionsToMake}</h2><span className="step-note">{current.discovery.questions.length} {discoveryCopy.questions}</span></div>{current.discovery.questions.map((question, index) => <motion.article key={question.id} className="card question-card" layout initial={fade.initial} animate={fade.animate} transition={{ ...fade.transition, delay: reduced ? 0 : Math.min(index * .04, .2) }}>
              <span className="question-index">{discoveryCopy.question} {String(index + 1).padStart(2, '0')}</span><h3>{question.question}</h3><p className="question-reason">{question.reason}</p><ChoiceButtons question={question} answer={answers[question.id] || ''} onChange={(value) => answerQuestion(question.id, value)} copy={discoveryCopy} />
            </motion.article>)}</section>}

            {error && <div className="error-box" role="alert"><AlertCircle size={16} />{error}</div>}
            <div className="discovery-actions"><button className="quiet-button" type="button" onClick={() => { setSpec(null); if (current) updateProject({ ...current, stage: 'idea', updatedAt: new Date().toISOString() }); }}><ArrowLeft size={14} /> {discoveryCopy.editIdea}</button><span className="decision-note">{discoveryCopy.openQuestionsNote}</span><button className="primary-button" type="button" onClick={generateSpec} disabled={busy !== null}>{busy === 'spec' ? <><LoaderCircle size={15} className="spinner" /> {discoveryCopy.buildingSpec}</> : <>{discoveryCopy.generateSpec} <ArrowRight size={15} /></>}</button></div>
          </div>
        </motion.div>}

        {stage === 'spec' && spec && <motion.div key="spec" className="content-wrap" {...animationProps}>
          <div className="screen-heading spec-page-heading"><h1>{specCopy.title}</h1><p>{specCopy.description}</p></div>
          <div className="spec-wrap">
            <section className="spec-toolbar" aria-label={specCopy.specActions}>
              <div className="spec-toolbar-copy" aria-live="polite"><span className="ready-badge"><Check size={13} aria-hidden="true" /> {specCopy.ready}</span><span className="helper-note">{specCopy.saved}</span></div>
              <div className="toolbar-actions"><button type="button" className="secondary-button" onClick={exportSpec}><FileDown size={14} aria-hidden="true" /> {specCopy.exportSpec}</button><button type="button" className="secondary-button" onClick={copySpec}><Clipboard size={14} aria-hidden="true" /> {specCopy.copySpec}</button></div>
            </section>
            {error && <div className="error-box" role="alert"><AlertCircle size={16} />{error}</div>}
            {sectionFields.filter((section) => section.key === 'overview').map((section) => <motion.section key={section.key} className="card spec-overview" aria-labelledby="spec-overview-title" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .2 }}>
              <header><h2 id="spec-overview-title">{specCopy.sections.overview}</h2></header>
              <div className="spec-fields spec-overview-fields">{section.fields.map((field) => <SpecField key={field.key} section={section.key} field={{ ...field, label: specCopy.fields[field.key] }} spec={spec} onChange={editField} oneItemPerLine={specCopy.oneItemPerLine} />)}</div>
            </motion.section>)}
            <section className="spec-groups" aria-label={specCopy.moreDetails}>
              {sectionFields.filter((section) => section.key !== 'overview').map((section) => <details key={section.key} className="spec-group">
                <summary><span>{specCopy.sections[section.key]}</span><ChevronDown className="spec-group-chevron" size={17} aria-hidden="true" /></summary>
                <div className="spec-fields">{section.fields.map((field) => <SpecField key={field.key} section={section.key} field={{ ...field, label: specCopy.fields[field.key] }} spec={spec} onChange={editField} oneItemPerLine={specCopy.oneItemPerLine} />)}</div>
              </details>)}
            </section>
            <section className="card prompt-card"><div className="card-topline"><div><span className="eyebrow">{specCopy.handoff}</span><h2 className="card-title">{specCopy.promptTitle}</h2></div><WandSparkles size={20} color="var(--accent)" aria-hidden="true" /></div><p className="helper-note prompt-description">{specCopy.promptDescription}</p>
              {!prompt ? <button className="primary-button" type="button" onClick={generatePrompt}><WandSparkles size={15} aria-hidden="true" /> {specCopy.generatePrompt} <ArrowRight size={14} aria-hidden="true" /></button> : <><pre className="prompt-preview">{prompt}</pre><div className="prompt-handoff">
                <div className="toolbar-actions prompt-primary-actions"><button className="primary-button" type="button" onClick={() => copyText(prompt, specCopy.promptCopied)}><Clipboard size={14} aria-hidden="true" /> {specCopy.copyPrompt}</button><button className="secondary-button" type="button" onClick={() => downloadMarkdown(prompt, appCopy.promptFileSuffix, specCopy.promptExported)}><FileDown size={14} aria-hidden="true" /> {specCopy.exportPrompt}</button></div>
                <div className="prompt-provider-block"><span className="prompt-provider-label">{specCopy.openWithAssistant}</span><div className="prompt-provider-actions">
                  <a className="secondary-button provider-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" onClick={copyPromptForHandoff}>{specCopy.openInChatGPT}<ExternalLink size={13} aria-hidden="true" /></a>
                  <a className="secondary-button provider-link" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" onClick={copyPromptForHandoff}>{specCopy.openInClaude}<ExternalLink size={13} aria-hidden="true" /></a>
                  <a className="secondary-button provider-link" href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer" onClick={copyPromptForHandoff}>{specCopy.openInGemini}<ExternalLink size={13} aria-hidden="true" /></a>
                </div><p className="prompt-provider-hint">{specCopy.pastePromptHint}</p></div>
              </div></>}
            </section>
            <div className="discovery-actions spec-navigation"><button className="quiet-button" type="button" onClick={() => { setSpec(null); if (current) updateProject({ ...current, stage: 'discovery', spec: undefined, codingPrompt: undefined }); }}><ArrowLeft size={14} aria-hidden="true" /> {specCopy.backToDiscovery}</button><span className="decision-note">{specCopy.openQuestionsCount(spec.execution.openQuestions.length)}</span><button className="quiet-button" type="button" onClick={newProject}>{specCopy.startAnother} <Plus size={14} aria-hidden="true" /></button></div>
          </div>
        </motion.div>}
      </AnimatePresence>
    </main>
    <AnimatePresence>{toast && <motion.div key={toast.id} className="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: reduced ? 0 : .18 }}><Check size={15} />{toast.message}</motion.div>}</AnimatePresence>
  </div>;
}

function SpecField({ section, field, spec, onChange, oneItemPerLine }: { section: keyof ProjectSpec; field: { key: string; label: string; wide?: boolean }; spec: ProjectSpec; onChange: (section: keyof ProjectSpec, field: string, value: string) => void; oneItemPerLine: string }) {
  const value: unknown = spec[section][field.key as never];
  const text = Array.isArray(value) ? value.join('\n') : String(value ?? '');
  const id = `spec-${section}-${field.key}`;
  const label = <label htmlFor={id}>{field.label}{Array.isArray(value) && <span className="spec-field-hint"> · {oneItemPerLine}</span>}</label>;
  if (section === 'overview' && field.key === 'projectName') return <div className={`spec-field ${field.wide ? 'wide' : ''} spec-project-name`}>{label}<input id={id} name={`spec.${section}.${field.key}`} type="text" autoComplete="off" value={text} maxLength={100} onChange={(event) => onChange(section, field.key, event.target.value)} /></div>;
  return <div className={`spec-field ${field.wide ? 'wide' : ''}`}>{label}<textarea id={id} name={`spec.${section}.${field.key}`} value={text} maxLength={Array.isArray(value) ? 16_000 : 800} onChange={(event) => onChange(section, field.key, event.target.value)} rows={Array.isArray(value) ? Math.min(Math.max(text.split('\n').length, 3), 8) : section === 'overview' && field.key === 'summary' ? 2 : 3} /></div>;
}
