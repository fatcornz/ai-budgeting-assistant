import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { ClipboardCheck, FileSpreadsheet, Library, Plus, Trash2, Upload } from 'lucide-react';
import { categorizeStatement, evaluateChatbot, fetchLessons } from '../lib/api';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  type BudgetCategory,
  type BudgetInput,
  type CategoryName,
  type ChatEvaluationResponse,
  type CsvCategorizeResponse,
  type LessonSnippet
} from '../types/budget';

interface PlanningToolsProps {
  budget: BudgetInput;
  onApplyCategories: (categories: BudgetInput['categories']) => void;
}

const STATEMENT_ACCEPT_TYPES = [
  '.csv',
  '.tsv',
  '.txt',
  '.pdf',
  '.xlsx',
  '.ofx',
  '.qfx',
  '.qbo',
  '.html',
  '.htm',
  'text/csv',
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
].join(',');

export function PlanningTools({ budget, onApplyCategories }: PlanningToolsProps) {
  const statementInputRef = useRef<HTMLInputElement>(null);
  const [csvResult, setCsvResult] = useState<CsvCategorizeResponse | null>(null);
  const [editableCategories, setEditableCategories] = useState<BudgetCategory[]>([]);
  const [lessons, setLessons] = useState<LessonSnippet[]>([]);
  const [evaluation, setEvaluation] = useState<ChatEvaluationResponse | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchLessons('savings debt spending history')
      .then((result) => setLessons(result.snippets))
      .catch(() => setLessons([]));
  }, []);

  const importStatement = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await categorizeStatement(file);
      setCsvResult(result);
      setEditableCategories(result.categories);
      setStatus(
        result.imported_rows > 0
          ? `Categorized ${result.imported_rows} rows from ${file.name}.`
          : `No transaction rows were found in ${file.name}.`
      );
    } catch (error) {
      setCsvResult(null);
      setEditableCategories([]);
      setStatus(error instanceof Error ? error.message : 'Bank statement import failed.');
    } finally {
      event.target.value = '';
    }
  };

  const runEvaluation = async () => {
    const result = await evaluateChatbot(budget);
    setEvaluation(result);
  };

  const updateImportedCategory = (index: number, updates: Partial<BudgetCategory>) => {
    setEditableCategories((categories) =>
      categories.map((category, currentIndex) => (currentIndex === index ? { ...category, ...updates } : category))
    );
  };

  const addImportedCategory = () => {
    const usedCategories = new Set(editableCategories.map((category) => category.name));
    const nextCategory = CATEGORY_OPTIONS.find((category) => !usedCategories.has(category)) ?? 'other';
    setEditableCategories((categories) => [...categories, { name: nextCategory, amount: 0 }]);
  };

  const removeImportedCategory = (index: number) => {
    setEditableCategories((categories) => categories.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <section className="panel tools-panel section-anchor" id="bank-import">
      <div className="section-header compact">
        <div>
          <span className="eyebrow">Tools</span>
          <h2>Imports, lessons, and checks</h2>
        </div>
      </div>

      <div className="tool-grid">
        <article className="mini-card">
          <div className="section-title-row">
            <FileSpreadsheet size={18} />
            <h3>Bank statement import</h3>
          </div>
          <button className="icon-label-button" type="button" onClick={() => statementInputRef.current?.click()}>
            <Upload size={15} /> Upload statement
          </button>
          <input
            ref={statementInputRef}
            className="sr-only"
            type="file"
            accept={STATEMENT_ACCEPT_TYPES}
            onChange={importStatement}
          />
          {csvResult && (
            <>
              <button className="small-button" type="button" onClick={() => onApplyCategories(editableCategories)}>
                Apply categories
              </button>
              <div className="import-editor">
                {editableCategories.map((category, index) => (
                  <div className="import-row" key={`${category.name}-${index}`}>
                    <select
                      value={category.name}
                      onChange={(event) =>
                        updateImportedCategory(index, { name: event.target.value as CategoryName })
                      }
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option value={option} key={option}>
                          {CATEGORY_LABELS[option]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={category.amount}
                      onChange={(event) => updateImportedCategory(index, { amount: Number(event.target.value) })}
                      aria-label={`${CATEGORY_LABELS[category.name]} amount`}
                    />
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="Remove imported category"
                      onClick={() => removeImportedCategory(index)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="text-button import-add" type="button" onClick={addImportedCategory}>
                <Plus size={14} /> Add missing category
              </button>
              <p className="muted">{csvResult.imported_rows} rows imported, {csvResult.skipped_rows} skipped.</p>
            </>
          )}
        </article>

        <article className="mini-card">
          <div className="section-title-row">
            <Library size={18} />
            <h3>Financial literacy</h3>
          </div>
          <ul className="compact-list">
            {lessons.map((lesson) => (
              <li key={lesson.title}>
                <strong>{lesson.title}</strong>
                <span>{lesson.content}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="mini-card">
          <div className="section-title-row">
            <ClipboardCheck size={18} />
            <h3>Chatbot evaluation</h3>
          </div>
          <button className="icon-label-button" type="button" onClick={runEvaluation}>
            Run checks
          </button>
          {evaluation && <p className="muted">{evaluation.passed} passed, {evaluation.failed} failed.</p>}
        </article>
      </div>
      {status && <p className="muted">{status}</p>}
    </section>
  );
}
