'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Option = { option: string; answer: string; score: number };
type Question = {
  qid: string;
  area: string;
  stage: string;
  question: string;
  weightage: number;
  scoreType: string;
  link: string;
  options: Option[];
};

function SurveyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const client = searchParams.get('client') || '';
  const month = searchParams.get('month') || '';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [surveyId, setSurveyId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conductedBy, setConductedBy] = useState('');
  const [areaIndex, setAreaIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    async function init() {
      const qData = await fetch('/api/survey-data').then((r) => r.json());
      setQuestions(qData);

      const surveyRes = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, client, status: 'Started' }),
      }).then((r) => r.json());
      setSurveyId(surveyRes.surveyId);

      const existing = await fetch('/api/responses?surveyId=' + surveyRes.surveyId).then((r) => r.json());
      const prefill: Record<string, string> = {};
      existing.forEach((r: any) => {
        const q = qData.find((qq: Question) => qq.qid === r.qid);
        if (q) {
          const optIndex = q.options.findIndex((o: Option) => o.answer === r.selected_answer);
          if (optIndex !== -1) prefill[r.qid] = String(optIndex);
        }
      });
      setAnswers(prefill);
      setLoading(false);
    }
    if (client && month) init();
  }, [client, month]);

  const areas = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.area)));
  }, [questions]);

  const currentArea = areas[areaIndex] || '';
  const areaQuestions = useMemo(
    () => questions.filter((q) => q.area === currentArea),
    [questions, currentArea]
  );

  const handleSelect = (qid: string, optionIndex: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: optionIndex }));
  };

  const goToQuestion = (qid: string) => {
    const q = questions.find((qq) => qq.qid === qid);
    if (!q) return;
    const idx = areas.indexOf(q.area);
    setAreaIndex(idx === -1 ? 0 : idx);
    setReviewing(false);
  };

  const unansweredQuestions = questions.filter((q) => answers[q.qid] === undefined);

  const handleSubmit = async () => {
    setSaving(true);

    const responses = questions
      .filter((q) => answers[q.qid] !== undefined)
      .map((q) => {
        const opt = q.options[Number(answers[q.qid])];
        const score = opt.score;
        const weightedContribution = (score / 5) * q.weightage;
        return {
          qid: q.qid,
          area: q.area,
          stage: q.stage,
          question: q.question,
          weightage: q.weightage,
          selectedAnswer: opt.answer,
          score,
          weightedContribution,
          scoreType: q.scoreType,
          surveyMonth: month,
        };
      });

    await fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surveyId, client, responses }),
    });

    await fetch('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, client, conductedBy, status: 'Completed' }),
    });

    router.push('/summary?client=' + encodeURIComponent(client) + '&month=' + encodeURIComponent(month));
  };

  if (!client || !month) {
    return <p className="p-8">Missing client or month.</p>;
  }
  if (loading) {
    return <p className="p-8">Loading survey...</p>;
  }

  const answeredCount = Object.keys(answers).length;
  const pct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isLastArea = areaIndex === areas.length - 1;

  // ---------- REVIEW SCREEN ----------
  if (reviewing) {
    return (
      <main className="p-6 sm:p-10">
        <h1 className="mb-1">Start Assessment</h1>
        <div className="h-px mb-6" style={{ background: 'var(--color-line)' }} />

        <div className="card p-6 sm:p-8">
          <h2 className="mb-4">Review Your Responses</h2>

          {unansweredQuestions.length > 0 && (
            <div
              className="rounded-lg p-4 mb-6 text-sm font-semibold"
              style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
            >
              {unansweredQuestions.length} question{unansweredQuestions.length === 1 ? '' : 's'} still need an answer.
              Every question must be answered before you can submit this assessment.
            </div>
          )}

          <div className="space-y-3">
            {questions.map((q) => {
              const answered = answers[q.qid] !== undefined;
              const answerText = answered ? q.options[Number(answers[q.qid])].answer : '';
              return (
                <div
                  key={q.qid}
                  className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  style={{
                    border: '1px solid ' + (answered ? 'var(--color-line)' : 'var(--color-danger)'),
                    background: answered ? 'white' : 'var(--color-danger-bg)',
                  }}
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-primary)' }}>
                      {q.area}
                    </p>
                    <p className="font-medium text-sm mb-1">{q.question}</p>
                    {answered ? (
                      <p className="text-sm" style={{ color: 'var(--color-slate)' }}>{answerText}</p>
                    ) : (
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
                        Not answered — required before submission
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => goToQuestion(q.qid)}
                    className="btn-outline px-4 py-2 text-sm shrink-0"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
            <button
              onClick={() => setReviewing(false)}
              className="btn-outline px-6 py-3"
            >
              ← Back to Questions
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || unansweredQuestions.length > 0}
              className="btn-primary px-8 py-3"
            >
              {saving ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- QUESTION SCREEN ----------
  return (
    <main className="p-6 sm:p-10">
      <h1 className="mb-1">Start Assessment</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-slate)' }}>
        {client} — {month}
      </p>

      <label className="block text-sm font-bold mb-2 tracking-wide" style={{ color: 'var(--color-primary)' }}>
        SELECT AREA
      </label>
      <select
        className="border rounded-lg px-4 py-3 w-full mb-6 text-base font-medium"
        style={{ borderColor: 'var(--color-line)', background: '#eaf2fb', color: 'var(--color-primary-dark)' }}
        value={currentArea}
        onChange={(e) => setAreaIndex(areas.indexOf(e.target.value))}
      >
        {areas.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="pill pill-neutral" style={{ background: '#eaf2fb', color: 'var(--color-primary-dark)' }}>
          Client: {client}
        </span>
        <input
          type="text"
          placeholder="Your name (conducted by)"
          value={conductedBy}
          onChange={(e) => setConductedBy(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-line)' }}
        />
      </div>

      <div className="flex justify-between items-center mb-2 text-sm font-semibold">
        <span style={{ color: 'var(--color-primary)' }}>{answeredCount} of {questions.length} Answered</span>
        <span style={{ color: 'var(--color-primary)' }}>{pct}% Completed</span>
      </div>
      <div className="h-2 rounded-full mb-8" style={{ background: 'var(--color-line)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: pct + '%', background: 'var(--color-primary)' }}
        />
      </div>

      <h2 className="mb-4" style={{ color: 'var(--color-primary)' }}>{currentArea}</h2>

      <div className="space-y-5 mb-6">
        {areaQuestions.map((q) => {
          const globalIndex = questions.findIndex((qq) => qq.qid === q.qid) + 1;
          const isAnswered = answers[q.qid] !== undefined;
          return (
            <div key={q.qid} className="card p-5 sm:p-6 w-full">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="flex items-center justify-center rounded-full text-white text-sm font-bold w-9 h-9 shrink-0"
                  style={{ background: isAnswered ? 'var(--color-success)' : 'var(--color-primary)' }}
                >
                  Q{globalIndex}
                </span>
                <span className="text-sm italic" style={{ color: 'var(--color-slate)' }}>
                  {q.area} — {q.stage}
                </span>
              </div>

              <p className="font-semibold text-lg mb-3">{q.question}</p>

              <span className="pill mb-4 inline-block" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                {q.stage}
              </span>

              <div className="space-y-2">
                {q.options.map((opt, idx) => {
                  const selected = answers[q.qid] === String(idx);
                  const bg = selected ? '#eaf2fb' : 'white';
                  const border = selected ? 'var(--color-primary)' : 'var(--color-line)';
                  return (
                    <label
                      key={idx}
                      className="flex items-start gap-3 text-base cursor-pointer p-3 rounded-lg border transition-colors"
                      style={{ borderColor: border, background: bg }}
                    >
                      <input
                        type="radio"
                        name={q.qid}
                        checked={selected}
                        onChange={() => handleSelect(q.qid, String(idx))}
                        className="mt-1"
                      />
                      <span>{opt.answer}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between gap-3">
        <button
          onClick={() => setAreaIndex((i) => Math.max(0, i - 1))}
          disabled={areaIndex === 0}
          className="btn-outline px-6 py-3"
        >
          ← Previous Area
        </button>
        {isLastArea ? (
          <button
            onClick={() => setReviewing(true)}
            className="btn-primary px-6 py-3"
          >
            Review Answers →
          </button>
        ) : (
          <button
            onClick={() => setAreaIndex((i) => Math.min(areas.length - 1, i + 1))}
            className="btn-primary px-6 py-3"
          >
            Next Area →
          </button>
        )}
      </div>
    </main>
  );
}

export default function SurveyPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <SurveyForm />
    </Suspense>
  );
}